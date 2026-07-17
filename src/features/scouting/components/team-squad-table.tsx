"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GlossaryTooltip } from "@/components/common/glossary-tooltip";
import { getPositionGlossaryDescription } from "@/lib/positions";
import { formatCapHit, ratingColor } from "@/lib/utils";
import type { Player } from "@/types";
import type { Sport } from "@/lib/sport";

const PAGE_SIZE = 12;

export function TeamSquadTable({
  squad,
  competitionName,
  teamName,
  sport = "SOCCER",
}: {
  squad: Player[];
  competitionName?: string;
  teamName: string;
  sport?: Sport;
}) {
  const [page, setPage] = useState(1);
  const isBasketball = sport === "BASKETBALL";
  const isAmericanFootball = sport === "AMERICAN_FOOTBALL";
  const isNba = competitionName === "NBA";

  const totalPages = Math.max(1, Math.ceil(squad.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return squad.slice(start, start + PAGE_SIZE);
  }, [squad, currentPage]);

  return (
    <div className="space-y-4">
      <Table density="dense">
        <TableHeader>
          <TableRow>
                <TableHead>Player</TableHead>
            <TableHead>Pos.</TableHead>
            {isBasketball ? (
              <>
                <TableHead className="text-right">Age</TableHead>
                {isNba ? (
                  <TableHead className="text-right">Cap Hit</TableHead>
                ) : null}
                <TableHead className="text-right">PTS</TableHead>
                <TableHead className="text-right">REB</TableHead>
                <TableHead className="text-right">AST</TableHead>
              </>
            ) : isAmericanFootball ? (
              <>
                <TableHead className="text-right">Rating</TableHead>
                <TableHead className="text-right">YDS</TableHead>
                <TableHead className="text-right">TD</TableHead>
                <TableHead className="text-right">TKL</TableHead>
              </>
            ) : (
              <>
                <TableHead>Rating</TableHead>
                <TableHead className="text-right">Gols</TableHead>
                <TableHead className="text-right">Minutos</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.map((player) => {
            const stats = player.currentSeasonStats;
            const perGame = stats.perGame;
            const yards =
              stats.totalYards ??
              (stats.passingYards ?? 0) + (stats.rushingYards ?? 0) + (stats.receivingYards ?? 0);
            const touchdowns = stats.touchdowns ?? stats.goals ?? 0;

            return (
              <TableRow key={player.id}>
                <TableCell>
                  <Link href={`/players/${player.id}`} className="flex items-center gap-3 hover:text-primary">
                    <PlayerAvatar
                      name={player.knownAs}
                      fullName={player.fullName}
                      position={player.position}
                      competitionName={competitionName}
                      teamName={teamName}
                      photoUrl={player.photoUrl}
                      apiSportsPlayerId={player.apiSportsId}
                      size="sm"
                    />
                    <span className="font-medium text-foreground">{player.knownAs}</span>
                  </Link>
                </TableCell>
                <TableCell>
                  <GlossaryTooltip
                    label={<Badge variant="neutral">{player.position}</Badge>}
                    description={getPositionGlossaryDescription(player.position, sport)}
                  />
                </TableCell>
                {isBasketball ? (
                  <>
                    <TableCell className="text-right font-mono tabular-nums">{player.age}</TableCell>
                    {isNba ? (
                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                        {formatCapHit(player.capHit ?? 0)}
                      </TableCell>
                    ) : null}
                    <TableCell className="text-right font-mono tabular-nums">
                      {perGame?.points?.toFixed(1) ?? stats.points?.toFixed(1) ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {perGame?.rebounds?.toFixed(1) ?? stats.rebounds?.toFixed(1) ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {perGame?.assists?.toFixed(1) ?? stats.assists?.toFixed(1) ?? "—"}
                    </TableCell>
                  </>
                ) : isAmericanFootball ? (
                  <>
                    <TableCell className={`text-right font-mono font-semibold tabular-nums ${ratingColor(stats.rating)}`}>
                      {stats.rating.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {yards.toLocaleString("en-US")}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{touchdowns}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{stats.tacklesWon}</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className={`font-mono font-semibold tabular-nums ${ratingColor(stats.rating)}`}>
                      {stats.rating.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{stats.goals}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {stats.minutesPlayed.toLocaleString("pt-BR")}
                    </TableCell>
                  </>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {squad.length > PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            {squad.length} players · page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
