import { NextResponse } from "next/server";
import { flashArchiveEntries, verifiedFlashArchiveIds } from "@/lib/flash-archive-games";

export const dynamic = "force-static";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const game = flashArchiveEntries.find(
    (entry) => entry.id === decodeURIComponent(id) && verifiedFlashArchiveIds.has(entry.id),
  );

  if (!game) {
    return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    ...game,
    launchUrl: `https://archive.org/embed/${encodeURIComponent(game.id)}`,
    route: `/play/${encodeURIComponent(game.id)}`,
    status: "catalogado",
  });
}
