import { NextResponse } from "next/server";
import { getPlayerRepository } from "@/features/scouting/repository";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureRuntimeDataSource();
    const { id } = await params;
    const season = new URL(request.url).searchParams.get("season") ?? undefined;
    const player = await getPlayerRepository().findById(id, season ? { season } : undefined);

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    return NextResponse.json(player);
  } catch (error) {
    console.error("[api/players/[id]]", error);
    return NextResponse.json({ error: "Failed to load player" }, { status: 500 });
  }
}
