import { NextResponse } from "next/server";

const baseUrl = "https://cdn.jsdelivr.net/gh/GoatTech-42/NEBULACDN@main/games/";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const safeId = decodeURIComponent(id).replace(/[^a-zA-Z0-9._-]/g, "");
  if (!safeId) return new NextResponse("Jogo inválido", { status: 400 });

  const response = await fetch(`${baseUrl}${safeId}.html`, { next: { revalidate: 3600 } });
  if (!response.ok) return new NextResponse("Jogo não encontrado", { status: 404 });

  let html = await response.text();
  const movie = html.match(/(?:value|src)=(["'])(https?:\/\/[^"']+\.swf[^"']*)\1/i)?.[2];
  if (movie) html = html.replace(/player\.load\("\$1"\)/g, `player.load(${JSON.stringify(movie)})`);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
