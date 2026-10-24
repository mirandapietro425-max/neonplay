import { NextResponse } from "next/server";
import { flashArchiveEntries } from "@/lib/flash-archive-games";

export const dynamic = "force-dynamic";

function archiveUrl(id: string) {
  return `https://archive.org/embed/${encodeURIComponent(id)}`;
}

function gamePixUrl(game: Record<string, unknown>) {
  const url = typeof game.url === "string" ? game.url : typeof game.game_url === "string" ? game.game_url : "";
  if (url) return url;
  return "";
}

function gamePixImage(game: Record<string, unknown>, id: string) {
  const image = [game.thumbnailUrl, game.thumbnailUrl100, game.image, game.thumbnail, game.thumb, game.banner, game.image_url]
    .find((value) => typeof value === "string" && value.length > 0);
  if (typeof image === "string") return image;
  return id ? `https://img.gamepix.com/games/${encodeURIComponent(id)}/cover.jpg?w=640` : "";
}

function gamePixLaunchUrl(game: Record<string, unknown>) {
  const url = gamePixUrl(game);
  if (url) return url;
  const id = typeof game.id === "string" ? game.id : typeof game.gid === "string" ? game.gid : "";
  return id ? `https://games.gamepix.com/games/${encodeURIComponent(id)}/index.html` : "";
}

function gamePixCategory(game: Record<string, unknown>) {
  const values = [game.category, game.genre, game.genres, game.categories, game.tags]
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
    .map((value) => value.toLocaleLowerCase("pt-BR"));
  const value = values.join(" ");
  if (/action|acao|shooter|fighting/.test(value)) return "acao";
  if (/adventure|aventura|rpg/.test(value)) return "aventura";
  if (/racing|race|corrida|driving/.test(value)) return "corrida";
  if (/sport|esporte|football|soccer/.test(value)) return "esporte";
  if (/strategy|estrategia|tower defense/.test(value)) return "estrategia";
  if (/puzzle|quebra|match|mahjong|junior/.test(value)) return "puzzle";
  if (/platform|plataforma/.test(value)) return "plataforma";
  if (/arcade|io|clicker/.test(value)) return "arcade";
  if (/casual|hypercasual/.test(value)) return "casual";
  return "gamepix";
}

function gamePixQuality(game: Record<string, unknown>) {
  const score = typeof game.rkScore === "number" ? game.rkScore : typeof game.rks === "number" ? game.rks : 0;
  const featured = game.featured === true ? 1 : 0;
  const hasWideCover = game.orientation === "landscape" ? 1 : 0;
  return featured * 100 + score * 10 + hasWideCover;
}

async function getGamePixGames() {
  const sid = process.env.GAMEPIX_API_KEY;
  if (!sid) return [];

  try {
    const response = await fetch(`https://games.gamepix.com/games?sid=${encodeURIComponent(sid)}&limit=1000&offset=0`, {
      next: { revalidate: 600 },
    });
    if (!response.ok) return [];
    const payload = await response.json() as { data?: Record<string, unknown>[]; games?: Record<string, unknown>[] } | Record<string, unknown>[];
    const records = Array.isArray(payload) ? payload : payload.data ?? payload.games ?? [];
    return records.flatMap((game) => {
      const id = typeof game.id === "string" ? game.id : typeof game.gid === "string" ? game.gid : "";
      const title = (typeof game.title === "string" ? game.title : typeof game.name === "string" ? game.name : "").trim();
      const launchUrl = gamePixLaunchUrl(game);
      const imageUrl = gamePixImage(game, id);
      if (!id || !title || !launchUrl) return [];
      return [{ id: `gamepix-${id}`, title, category: gamePixCategory(game), kind: "game" as const, launchUrl, imageUrl, route: `/play/gamepix-${encodeURIComponent(id)}`, status: "online", source: "gamepix", quality: gamePixQuality(game) }];
    }).sort((a, b) => b.quality - a.quality).slice(0, 120).map(({ quality: _quality, ...game }) => game);
  } catch {
    return [];
  }
}

const browserGames = [
  { id: "snake", title: "Snake", category: "arcade", kind: "game", launchUrl: "https://emjay045.github.io/browser-games/snake/" },
  { id: "pong", title: "Pong", category: "arcade", kind: "game", launchUrl: "https://emjay045.github.io/browser-games/pong/" },
  { id: "2048", title: "2048", category: "puzzle", kind: "game", launchUrl: "https://emjay045.github.io/browser-games/2048/" },
  { id: "tetris", title: "Tetris", category: "puzzle", kind: "game", launchUrl: "https://emjay045.github.io/browser-games/tetris/" },
  { id: "breakout", title: "Breakout", category: "arcade", kind: "game", launchUrl: "https://emjay045.github.io/browser-games/breakout/" },
  { id: "minesweeper", title: "Campo Minado", category: "puzzle", kind: "game", launchUrl: "https://emjay045.github.io/browser-games/minesweeper/" },
  { id: "wordle", title: "Wordle", category: "quiz", kind: "game", launchUrl: "https://emjay045.github.io/browser-games/wordle/" },
  { id: "flappy-bird", title: "Flappy Bird", category: "arcade", kind: "game", launchUrl: "https://emjay045.github.io/browser-games/flappy-bird/" },
  { id: "dino-dash", title: "Dino Dash", category: "arcade", kind: "game", launchUrl: "https://emjay045.github.io/browser-games/dino-dash/" },
] as const;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim().toLocaleLowerCase("pt-BR") ?? "";
  const category = searchParams.get("category") ?? "todos";

  const archiveGames = flashArchiveEntries
    .map((game) => ({
      ...game,
      launchUrl: archiveUrl(game.id),
      route: `/play/${encodeURIComponent(game.id)}`,
      status: "catalogado",
      source: "internet-archive",
    }));
  const gamePixGames = await getGamePixGames();
  const games = [...browserGames.map((game) => ({
    ...game,
    route: `/play/browser-games/${game.id}`,
    status: "online",
    source: "browser-games",
  })), ...archiveGames, ...gamePixGames]
    .filter((game) => category === "todos" || game.category === category)
    .filter((game) => !query || game.title.toLocaleLowerCase("pt-BR").includes(query));

  return NextResponse.json(
    { games, total: games.length, sources: ["NeonPlay", "Internet Archive", "GamePix"] }, 
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } },
  );
}
