#!/usr/bin/env python3
"""Read-only SEO health check for the public Zap Game sitemap."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path
from time import sleep
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urljoin, urlsplit
from urllib.request import Request, urlopen
import os
import re
import socket
import sys
import xml.etree.ElementTree as ET

SITE_ORIGIN = os.environ.get("SITE_ORIGIN", "https://www.zapgame.com.br").rstrip("/")
SITEMAP_URL = os.environ.get("SITEMAP_URL", f"{SITE_ORIGIN}/sitemap.xml")
EXPECTED_HOST = urlsplit(SITE_ORIGIN).netloc.lower()
USER_AGENT = "ZapGameSitemapMonitor/1.0 (+https://www.zapgame.com.br)"
TIMEOUT_SECONDS = 20
MAX_ATTEMPTS = 3
MAX_WORKERS = 6


class MonitorError(Exception):
    pass


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def normalize_url(url: str) -> str:
    parts = urlsplit(url)
    path = parts.path or "/"
    if path != "/":
        path = path.rstrip("/")
    return f"{parts.scheme.lower()}://{parts.netloc.lower()}{path}"


def is_allowed_site_url(url: str) -> bool:
    parts = urlsplit(url)
    return parts.scheme.lower() == "https" and parts.netloc.lower() == EXPECTED_HOST


def fetch(url: str) -> tuple[int, str, str, bytes, str | None]:
    """Fetch one public URL, retrying transient network and server errors."""
    for attempt in range(1, MAX_ATTEMPTS + 1):
        request = Request(
            url,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "text/html,application/xml,application/xhtml+xml,*/*;q=0.5",
            },
        )
        try:
            with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
                status = response.status
                final_url = response.geturl()
                content_type = response.headers.get("Content-Type", "")
                body = response.read()
            if (status == 429 or status >= 500) and attempt < MAX_ATTEMPTS:
                sleep(attempt)
                continue
            return status, final_url, content_type, body, None
        except HTTPError as error:
            body = error.read()
            if (error.code == 429 or error.code >= 500) and attempt < MAX_ATTEMPTS:
                sleep(attempt)
                continue
            content_type = error.headers.get("Content-Type", "") if error.headers else ""
            return error.code, error.geturl(), content_type, body, None
        except (URLError, TimeoutError, socket.timeout, OSError) as error:
            if attempt < MAX_ATTEMPTS:
                sleep(attempt)
                continue
            return 0, url, "", b"", str(error)
    return 0, url, "", b"", "Retry limit reached"


def sitemap_locations(sitemap_url: str, visited: set[str] | None = None, depth: int = 0) -> list[str]:
    if depth > 4:
        raise MonitorError("A árvore de sitemaps excedeu o limite de profundidade.")
    if not is_allowed_site_url(sitemap_url):
        raise MonitorError(f"Sitemap fora do domínio permitido: {sitemap_url}")

    seen_sitemaps = visited if visited is not None else set()
    normalized_sitemap = normalize_url(sitemap_url)
    if normalized_sitemap in seen_sitemaps:
        return []
    seen_sitemaps.add(normalized_sitemap)

    status, final_url, content_type, body, error = fetch(sitemap_url)
    if error:
        raise MonitorError(f"Falha ao buscar sitemap {sitemap_url}: {error}")
    if status != 200:
        raise MonitorError(f"Sitemap respondeu HTTP {status}: {sitemap_url}")
    if not is_allowed_site_url(final_url):
        raise MonitorError(f"Sitemap redirecionou para outro domínio: {final_url}")

    try:
        root = ET.fromstring(body)
    except ET.ParseError as error:
        raise MonitorError(f"XML inválido em {sitemap_url}: {error}") from error

    root_type = local_name(root.tag)
    item_type = "sitemap" if root_type == "sitemapindex" else "url" if root_type == "urlset" else None
    if item_type is None:
        raise MonitorError(f"Tipo XML inesperado em {sitemap_url}: {root_type}")

    locations: list[str] = []
    for item in root:
        if local_name(item.tag) != item_type:
            continue
        location = next((child.text.strip() for child in item if local_name(child.tag) == "loc" and child.text), None)
        if not location:
            continue
        if item_type == "url":
            locations.append(location)
        else:
            locations.extend(sitemap_locations(location, seen_sitemaps, depth + 1))
    return locations


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title_parts: list[str] = []
        self.h1_parts: list[str] = []
        self.main_parts: list[str] = []
        self.category_count_parts: list[str] = []
        self.robots: list[str] = []
        self.canonical: str | None = None
        self._title_depth = 0
        self._h1_depth = 0
        self._main_depth = 0
        self._category_count_tag: str | None = None
        self._category_count_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key.lower(): value or "" for key, value in attrs}
        if tag == "title":
            self._title_depth += 1
        elif tag == "h1":
            self._h1_depth += 1
        elif tag == "main":
            self._main_depth += 1

        if tag in {"div", "span", "p"} and "zg-category-count" in values.get("class", "").split():
            self._category_count_tag = tag
            self._category_count_depth = 1

        if tag == "meta" and values.get("name", "").lower() in {"robots", "googlebot"}:
            self.robots.append(values.get("content", ""))
        if tag == "link" and "canonical" in values.get("rel", "").lower().split():
            self.canonical = values.get("href") or None

    def handle_endtag(self, tag: str) -> None:
        if tag == "title" and self._title_depth:
            self._title_depth -= 1
        elif tag == "h1" and self._h1_depth:
            self._h1_depth -= 1
        elif tag == "main" and self._main_depth:
            self._main_depth -= 1
        if self._category_count_tag == tag and self._category_count_depth:
            self._category_count_depth = 0
            self._category_count_tag = None

    def handle_data(self, data: str) -> None:
        if self._title_depth:
            self.title_parts.append(data)
        if self._h1_depth:
            self.h1_parts.append(data)
        if self._main_depth:
            self.main_parts.append(data)
        if self._category_count_depth:
            self.category_count_parts.append(data)

    @staticmethod
    def text(parts: list[str]) -> str:
        return re.sub(r"\s+", " ", " ".join(parts)).strip()

    @property
    def title(self) -> str:
        return self.text(self.title_parts)

    @property
    def h1(self) -> str:
        return self.text(self.h1_parts)

    @property
    def main_text(self) -> str:
        return self.text(self.main_parts)

    @property
    def category_count_text(self) -> str:
        return self.text(self.category_count_parts)

    @property
    def noindex(self) -> bool:
        return any(re.search(r"\bnoindex\b", value, re.IGNORECASE) for value in self.robots)


def category_slugs() -> list[str]:
    source_path = Path(__file__).resolve().parents[1] / "lib" / "game-catalog.ts"
    source = source_path.read_text(encoding="utf-8")
    match = re.search(
        r"export const categoryLabels:\s*Record<string,\s*string>\s*=\s*\{(.*?)\n\}",
        source,
        re.DOTALL,
    )
    if not match:
        raise MonitorError(f"Não foi possível ler categoryLabels em {source_path}")
    slugs = re.findall(r"^\s*([A-Za-z0-9_-]+)\s*:", match.group(1), re.MULTILINE)
    if not slugs:
        raise MonitorError("categoryLabels não contém slugs de categoria.")
    return slugs


def category_slug_from_url(url: str) -> str | None:
    match = re.fullmatch(r"/jogos/categoria/([^/]+)/?", urlsplit(url).path)
    return unquote(match.group(1)) if match else None


def audit_page(url: str) -> dict[str, object]:
    status, final_url, content_type, body, error = fetch(url)
    result: dict[str, object] = {
        "url": url,
        "status": status,
        "final_url": final_url,
        "content_type": content_type,
        "title": "",
        "h1": "",
        "main_length": 0,
        "canonical": None,
        "noindex": False,
        "category_count_text": "",
        "category_count": None,
        "errors": [],
    }
    errors: list[str] = result["errors"]  # type: ignore[assignment]

    if error:
        errors.append(f"Falha de rede: {error}")
        return result
    if status != 200:
        errors.append(f"HTTP {status}")
        return result
    if not is_allowed_site_url(final_url):
        errors.append(f"Redirecionou para outro domínio: {final_url}")
    if "html" not in content_type.lower():
        errors.append(f"Content-Type inesperado: {content_type or 'ausente'}")

    parser = PageParser()
    try:
        parser.feed(body.decode("utf-8", errors="replace"))
    except Exception as parse_error:  # defensive against malformed HTML parser input
        errors.append(f"Falha ao analisar HTML: {parse_error}")
        return result

    result.update(
        {
            "title": parser.title,
            "h1": parser.h1,
            "main_length": len(parser.main_text),
            "canonical": urljoin(final_url, parser.canonical) if parser.canonical else None,
            "noindex": parser.noindex,
            "category_count_text": parser.category_count_text,
        }
    )

    if not parser.title:
        errors.append("<title> ausente ou vazio")
    if not parser.h1:
        errors.append("H1 ausente ou vazio")
    if len(parser.main_text) < 60:
        errors.append(f"Conteúdo inicial do <main> muito curto ({len(parser.main_text)} caracteres)")
    if re.search(r"\b(?:404|not found|página não encontrada|jogo não encontrado)\b", parser.h1, re.IGNORECASE):
        errors.append(f"Possível soft-404 pelo H1: {parser.h1}")
    if parser.noindex:
        errors.append("URL não indexável está listada no sitemap")

    canonical = urljoin(final_url, parser.canonical) if parser.canonical else None
    if not canonical:
        errors.append("Canonical ausente")
    elif normalize_url(canonical) != normalize_url(url):
        errors.append(f"Canonical não corresponde à URL: {canonical}")

    category_slug = category_slug_from_url(url)
    if category_slug:
        count_match = re.search(r"(\d+)\s+jogo(?:s)?\b", parser.category_count_text, re.IGNORECASE)
        if count_match:
            result["category_count"] = int(count_match.group(1))
    return result


def add_issue(issues: list[str], url: str, message: str) -> None:
    issues.append(f"{url}: {message}")


def write_github_summary(lines: list[str]) -> None:
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as summary:
            summary.write("\n".join(lines) + "\n")


def main() -> int:
    issues: list[str] = []
    try:
        urls = sitemap_locations(SITEMAP_URL)
        categories = category_slugs()
    except (MonitorError, OSError) as error:
        print(f"::error::{error}")
        write_github_summary(["## SEO sitemap monitor", f"**Falha de configuração ou sitemap:** {error}"])
        return 1

    if not urls:
        issues.append(f"{SITEMAP_URL}: sitemap sem URLs")

    normalized_urls = [normalize_url(url) for url in urls]
    duplicate_urls = sorted({url for url in normalized_urls if normalized_urls.count(url) > 1})
    for url in duplicate_urls:
        add_issue(issues, url, "URL duplicada no sitemap")

    for url in urls:
        if not is_allowed_site_url(url):
            add_issue(issues, url, "URL fora do domínio canônico; não será consultada")

    sitemap_set = {normalize_url(url) for url in urls if is_allowed_site_url(url)}
    category_urls = [f"{SITE_ORIGIN}/jogos/categoria/{slug}" for slug in categories]
    targets = list(dict.fromkeys([url for url in urls if is_allowed_site_url(url)] + category_urls))

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        page_results = list(pool.map(audit_page, targets))
    results = {normalize_url(str(result["url"])): result for result in page_results}

    for url in urls:
        if not is_allowed_site_url(url):
            continue
        result = results.get(normalize_url(url))
        if not result:
            add_issue(issues, url, "Não foi possível obter resultado de auditoria")
            continue
        for message in result["errors"]:  # type: ignore[union-attr]
            add_issue(issues, url, str(message))

    category_status_lines: list[str] = []
    for url in category_urls:
        result = results.get(normalize_url(url))
        if not result:
            add_issue(issues, url, "Não foi possível auditar a categoria")
            continue
        count = result.get("category_count")
        in_sitemap = normalize_url(url) in sitemap_set
        if int(result["status"]) != 200:
            add_issue(issues, url, f"Categoria respondeu HTTP {result['status']}")
            continue
        if count is None:
            add_issue(issues, url, "Não foi possível ler o contador de jogos da categoria")
            continue

        noindex = bool(result["noindex"])
        if int(count) == 0:
            if not noindex:
                add_issue(issues, url, "Categoria sem jogos deveria ter noindex")
            if in_sitemap:
                add_issue(issues, url, "Categoria sem jogos não deveria estar no sitemap")
            category_status_lines.append(f"- `{url}`: vazia, noindex e fora do sitemap")
        else:
            if noindex:
                add_issue(issues, url, f"Categoria tem {count} jogos, mas está noindex")
            if not in_sitemap:
                add_issue(issues, url, f"Categoria tem {count} jogos, mas falta no sitemap")
            category_status_lines.append(f"- `{url}`: {count} jogos, indexável e no sitemap")

    print(f"Sitemap: {len(urls)} URLs; páginas verificadas: {len(page_results)}; categorias: {len(categories)}")
    for line in category_status_lines:
        print(line)

    summary = [
        "## SEO sitemap monitor",
        f"- URLs no sitemap: **{len(urls)}**",
        f"- Páginas verificadas: **{len(page_results)}**",
        f"- Categorias verificadas: **{len(categories)}**",
        *category_status_lines,
    ]
    if issues:
        print(f"\n{len(issues)} problema(s) encontrado(s):")
        for issue in issues:
            print(f"::error::{issue}")
            print(f"- **Problema:** {issue}")
        summary.extend(["", f"### Problemas ({len(issues)})", *[f"- {issue}" for issue in issues]])
        write_github_summary(summary)
        return 1

    print("Nenhum erro de sitemap, status, conteúdo vazio, canonical ou robots encontrado.")
    summary.extend(["", "**Resultado:** nenhum erro encontrado."])
    write_github_summary(summary)
    return 0


if __name__ == "__main__":
    sys.exit(main())
