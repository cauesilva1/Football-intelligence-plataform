import Link from "next/link";
import { Eye } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { GlossaryTooltip, METRIC_GLOSSARY, POSITION_GLOSSARY } from "@/components/common/glossary-tooltip";
import { getPositionGlossaryDescription } from "@/lib/positions";
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

function basketballPoints(player: Player): number {
  return player.currentSeasonStats.points ?? player.currentSeasonStats.perGame?.points ?? 0;
}

function basketballRebounds(player: Player): number {
  return player.currentSeasonStats.rebounds ?? player.currentSeasonStats.perGame?.rebounds ?? 0;
}

function basketballAssists(player: Player): number {
  return player.currentSeasonStats.perGame?.assists ?? player.currentSeasonStats.assists ?? 0;
}

function BasketballRosterTable({
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
            <SortableTableHead label="Player" sortKey="name" filters={filters} basePath={basePath} route={route} />
          </TableHead>
          <TableHead sticky>
            <SortableTableHead label="Age" sortKey="age" filters={filters} basePath={basePath} route={route} />
          </TableHead>
          <TableHead sticky>
            <SortableTableHead label="Franchise" sortKey="club" filters={filters} basePath={basePath} route={route} />
          </TableHead>
          <TableHead sticky>
            <SortableTableHead label="Pos." sortKey="position" filters={filters} basePath={basePath} route={route} />
          </TableHead>
          <TableHead sticky className="text-right">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {players.map((player) => (
          <TableRow key={player.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <PlayerAvatar
                  name={player.knownAs}
                  fullName={player.fullName}
                  position={player.position}
                  competitionName={player.competitionName}
                  teamName={player.teamName}
                  photoUrl={player.photoUrl}
                  apiSportsPlayerId={player.apiSportsId}
                  size="sm"
                />
                <div className="min-w-0">
                  <Link href={`/players/${player.id}`} className="truncate font-medium text-foreground hover:text-primary">
                    {player.knownAs}
                  </Link>
                  <p className="truncate text-2xs text-muted-foreground">{player.nationality}</p>
                </div>
              </div>
            </TableCell>
            <TableCell className="tabular-nums">{player.age}</TableCell>
            <TableCell className="text-muted-foreground">{player.teamName ?? player.teamShortName ?? "—"}</TableCell>
            <TableCell>
              <GlossaryTooltip
                label={<Badge variant="neutral">{player.position}</Badge>}
                description={getPositionGlossaryDescription(player.position, "BASKETBALL")}
              />
            </TableCell>
            <TableCell className="text-right">
              <Link href={`/players/${player.id}`} className={buttonVariants({ variant: "ghost", size: "xs" })}>
                <Eye className="h-3.5 w-3.5" /> Profile
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function BasketballScoutingTable({
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
            <SortableTableHead label="Player" sortKey="name" filters={filters} basePath={basePath} route={route} />
          </TableHead>
          <TableHead sticky>
            <SortableTableHead label="Age" sortKey="age" filters={filters} basePath={basePath} route={route} />
          </TableHead>
          <TableHead sticky>
            <SortableTableHead label="Team" sortKey="club" filters={filters} basePath={basePath} route={route} />
          </TableHead>
          <TableHead sticky>
            <SortableTableHead label="Pos." sortKey="position" filters={filters} basePath={basePath} route={route} />
          </TableHead>
          <TableHead sticky className="overflow-visible">
            <GlossaryTooltip
              label={
                <SortableTableHead label="Rating" sortKey="rating" filters={filters} basePath={basePath} route={route} />
              }
              description={METRIC_GLOSSARY.rating}
              placement="bottom"
            />
          </TableHead>
          <TableHead sticky>
            <SortableTableHead label="PTS" sortKey="points" filters={filters} basePath={basePath} route={route} />
          </TableHead>
          <TableHead sticky>
            <SortableTableHead label="REB" sortKey="rebounds" filters={filters} basePath={basePath} route={route} />
          </TableHead>
          <TableHead sticky>
            <SortableTableHead label="AST" sortKey="assists" filters={filters} basePath={basePath} route={route} />
          </TableHead>
          <TableHead sticky className="text-right">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {players.map((player) => {
          const stats = player.currentSeasonStats;
          return (
            <TableRow key={player.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <PlayerAvatar
                    name={player.knownAs}
                    fullName={player.fullName}
                    position={player.position}
                    competitionName={player.competitionName}
                    teamName={player.teamName}
                    photoUrl={player.photoUrl}
                    apiSportsPlayerId={player.apiSportsId}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <Link href={`/players/${player.id}`} className="truncate font-medium text-foreground hover:text-primary">
                      {player.knownAs}
                    </Link>
                    <p className="truncate text-2xs text-muted-foreground">{player.nationality}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="tabular-nums">{player.age}</TableCell>
              <TableCell className="text-muted-foreground">{player.teamShortName ?? "—"}</TableCell>
              <TableCell>
                <GlossaryTooltip
                  label={<Badge variant="neutral">{player.position}</Badge>}
                  description={getPositionGlossaryDescription(player.position, "BASKETBALL")}
                />
              </TableCell>
              <TableCell className={`font-mono font-semibold tabular-nums ${ratingColor(stats.rating)}`}>
                {stats.rating.toFixed(1)}
              </TableCell>
              <TableCell className="font-mono tabular-nums">{basketballPoints(player).toFixed(1)}</TableCell>
              <TableCell className="font-mono tabular-nums">{basketballRebounds(player).toFixed(1)}</TableCell>
              <TableCell className="font-mono tabular-nums">{basketballAssists(player).toFixed(1)}</TableCell>
              <TableCell className="text-right">
                <Link href={`/players/${player.id}`} className={buttonVariants({ variant: "ghost", size: "xs" })}>
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

function SoccerScoutingTable({
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
            <SortableTableHead label="Player" sortKey="name" filters={filters} basePath={basePath} route={route} />
          </TableHead>
          <TableHead sticky>
            <SortableTableHead label="Age" sortKey="age" filters={filters} basePath={basePath} route={route} />
          </TableHead>
          <TableHead sticky>
            <SortableTableHead label="Club" sortKey="club" filters={filters} basePath={basePath} route={route} />
          </TableHead>
          <TableHead sticky>
            <SortableTableHead label="Pos." sortKey="position" filters={filters} basePath={basePath} route={route} />
          </TableHead>
          <TableHead sticky className="overflow-visible">
            <GlossaryTooltip
              label={
                <SortableTableHead label="Rating" sortKey="rating" filters={filters} basePath={basePath} route={route} />
              }
              description={METRIC_GLOSSARY.rating}
              placement="bottom"
            />
          </TableHead>
          <TableHead sticky>
            <SortableTableHead label="Goals/90" sortKey="goalsPer90" filters={filters} basePath={basePath} route={route} />
          </TableHead>
          <TableHead sticky className="overflow-visible">
            <GlossaryTooltip
              label={
                <SortableTableHead label="xG/90" sortKey="xGPer90" filters={filters} basePath={basePath} route={route} />
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
        {players.map((player) => {
          const stats = player.currentSeasonStats;
          const xg90 = computeXGPer90(stats.minutesPlayed, stats.xG);

          return (
            <TableRow key={player.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <PlayerAvatar
                    name={player.knownAs}
                    fullName={player.fullName}
                    position={player.position}
                    competitionName={player.competitionName}
                    teamName={player.teamName}
                    photoUrl={player.photoUrl}
                    apiSportsPlayerId={player.apiSportsId}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <Link href={`/players/${player.id}`} className="truncate font-medium text-foreground hover:text-primary">
                      {player.knownAs}
                    </Link>
                    <p className="truncate text-2xs text-muted-foreground">{player.nationality}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="tabular-nums">{player.age}</TableCell>
              <TableCell className="text-muted-foreground">{player.teamShortName ?? "—"}</TableCell>
              <TableCell>
                <GlossaryTooltip
                  label={<Badge variant="neutral">{player.position}</Badge>}
                  description={POSITION_GLOSSARY[player.position] ?? POSITION_GLOSSARY.MF}
                />
              </TableCell>
              <TableCell className={`font-mono font-semibold tabular-nums ${ratingColor(stats.rating)}`}>
                {stats.rating.toFixed(1)}
              </TableCell>
              <TableCell className="font-mono tabular-nums">{stats.per90.goals.toFixed(2)}</TableCell>
              <TableCell className="font-mono tabular-nums">{xg90.toFixed(2)}</TableCell>
              <TableCell className="text-right">
                <Link href={`/players/${player.id}`} className={buttonVariants({ variant: "ghost", size: "xs" })}>
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
  const isBasketball = filters.sport === "BASKETBALL";

  if (isBasketball) {
    if (route === "players") {
      return <BasketballRosterTable players={players} filters={filters} basePath={basePath} route={route} />;
    }
    return <BasketballScoutingTable players={players} filters={filters} basePath={basePath} route={route} />;
  }

  return <SoccerScoutingTable players={players} filters={filters} basePath={basePath} route={route} />;
}
