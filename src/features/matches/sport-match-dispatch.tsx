import { notFound } from "next/navigation";
import { MatchDetailView } from "@/features/matches/match-detail-view";
import { BasketballMatchDetailView } from "@/features/matches/basketball-match-detail-view";
import { FootballMatchDetailView } from "@/features/matches/football-match-detail-view";
import { resolveMatchDetail, resolveMatchTitle } from "@/features/matches/match-queries";
import {
  resolveBasketballMatchDetail,
  resolveBasketballMatchTitle,
} from "@/features/matches/basketball-match-queries";
import {
  resolveFootballMatchDetail,
  resolveFootballMatchTitle,
} from "@/features/matches/football-match-queries";
import { getSportConfig } from "@/lib/sport-registry";
import type { Sport } from "@/lib/sport";
import type { ReactNode } from "react";

export async function resolveSportMatchTitle(
  sport: Sport,
  id: string
): Promise<string | null> {
  const { matchKind } = getSportConfig(sport);
  if (matchKind === "basketball") return resolveBasketballMatchTitle(id);
  if (matchKind === "american-football") return resolveFootballMatchTitle(id);
  return resolveMatchTitle(id);
}

export async function renderSportMatchDetail(
  sport: Sport,
  id: string
): Promise<ReactNode> {
  const { matchKind } = getSportConfig(sport);

  if (matchKind === "basketball") {
    const data = await resolveBasketballMatchDetail(id);
    if (!data) notFound();
    return <BasketballMatchDetailView data={data} />;
  }

  if (matchKind === "american-football") {
    const data = await resolveFootballMatchDetail(id);
    if (!data) notFound();
    return <FootballMatchDetailView data={data} />;
  }

  const data = await resolveMatchDetail(id);
  if (!data) notFound();
  return <MatchDetailView data={data} />;
}
