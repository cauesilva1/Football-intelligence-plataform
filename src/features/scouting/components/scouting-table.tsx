import Link from "next/link";
import { Eye } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { GlossaryTooltip, METRIC_GLOSSARY, POSITION_GLOSSARY } from "@/components/common/glossary-tooltip";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { SortableTableHead } from "@/features/scouting/components/sortable-table-head";
import { computeXGPer90 } from "@/features/scouting/lib/filter-players";
import { type ScoutingRoute } from "@/features/scouting/lib/filter-defaults";
import { ratingColor } from "@/lib/utils";
import type { Player, PlayerFilters } from "@/types";

export function ScoutingTable({
  players,
  filters,
  basePath,
  route,
}: {
  players: Player[];
  filters: PlayerFilters;
  basePath: string;
  route: ScoutingRoute;
}) {
  return (
    <Table density="dense" stickyHeader>
      <TableHeader>
        <TableRow>
          <TableHead sticky>
            <SortableTableHead
              label="Player"
              sortKey="name"
              filters={filters}
              basePath={basePath}
              route={route}
            />
          </TableHead>
          <TableHead sticky>
            <SortableTableHead
              label="Age"
              sortKey="age"
              filters={filters}
              basePath={basePath}
              route={route}
            />
          </TableHead>
          <TableHead sticky>
            <SortableTableHead
              label="Club"
              sortKey="club"
              filters={filters}
              basePath={basePath}
              route={route}
            />
          </TableHead>
          <TableHead sticky>
            <SortableTableHead
              label="Pos."
              sortKey="position"
              filters={filters}
              basePath={basePath}
              route={route}
            />
          </TableHead>
          <TableHead sticky className="overflow-visible">
            <GlossaryTooltip
              label={
                <SortableTableHead
                  label="Rating"
                  sortKey="rating"
                  filters={filters}
                  basePath={basePath}
                  route={route}
                />
              }
              description={METRIC_GLOSSARY.rating}
              placement="bottom"
            />
          </TableHead>
          <TableHead sticky>
            <SortableTableHead
              label="Goals/90"
              sortKey="goalsPer90"
              filters={filters}
              basePath={basePath}
              route={route}
            />
          </TableHead>
          <TableHead sticky className="overflow-visible">
            <GlossaryTooltip
              label={
                <SortableTableHead
                  label="xG/90"
                  sortKey="xGPer90"
                  filters={filters}
                  basePath={basePath}
                  route={route}
                />
              }
              description={METRIC_GLOSSARY.xG}
              placement="bottom"
            />
          </TableHead>
          <TableHead sticky className="text-right">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {players.map((p) => {
          const s = p.currentSeasonStats;
          const xg90 = computeXGPer90(s.minutesPlayed, s.xG);

          return (
            <TableRow key={p.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <PlayerAvatar
                    name={p.knownAs}
                    position={p.position}
                    competitionName={p.competitionName}
                    teamName={p.teamName}
                    photoUrl={p.photoUrl}
                    apiSportsPlayerId={p.apiSportsId}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <Link
                      href={`/players/${p.id}`}
                      className="truncate font-medium text-foreground hover:text-primary"
                    >
                      {p.knownAs}
                    </Link>
                    <p className="truncate text-2xs text-muted-foreground">{p.nationality}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="tabular-nums">{p.age}</TableCell>
              <TableCell className="text-muted-foreground">{p.teamShortName ?? "—"}</TableCell>
              <TableCell>
                <GlossaryTooltip
                  label={<Badge variant="neutral">{p.position}</Badge>}
                  description={POSITION_GLOSSARY[p.position] ?? POSITION_GLOSSARY.MF}
                />
              </TableCell>
              <TableCell className={`font-mono font-semibold tabular-nums ${ratingColor(s.rating)}`}>
                {s.rating.toFixed(1)}
              </TableCell>
              <TableCell className="font-mono tabular-nums">{s.per90.goals.toFixed(2)}</TableCell>
              <TableCell className="font-mono tabular-nums">{xg90.toFixed(2)}</TableCell>
              <TableCell className="text-right">
                <Link href={`/players/${p.id}`} className={buttonVariants({ variant: "ghost", size: "xs" })}>
                  <Eye className="h-3.5 w-3.5" /> Profile
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
