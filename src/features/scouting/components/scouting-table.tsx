import Link from "next/link";
import { Eye } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { GlossaryTooltip } from "@/components/common/glossary-tooltip";
import { METRIC_GLOSSARY, POSITION_GLOSSARY } from "@/components/common/glossary-copy";
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
import { ShortlistButton } from "@/features/shortlist/components/shortlist-button";
import { computeXGPer90 } from "@/features/scouting/lib/filter-players";
import { type ScoutingRoute } from "@/features/scouting/lib/filter-defaults";
import { ratingColor, formatMarketValue, formatCapHit, playerDisplayName } from "@/lib/utils";
import { soccerValueScore } from "@/lib/scoring/soccer-rankings";
import { capValueScore } from "@/lib/scoring";
import { hasReliableSoccerSample } from "@/lib/metrics/per90";
import { hasReliableBasketballSample } from "@/lib/scoring/basketball-rating";
import { hasReliableFootballSample } from "@/lib/scoring/football-rating";
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

function totalYardsOf(player: Player): number {
  const s = player.currentSeasonStats;
  return (
    s.totalYards ??
    (s.passingYards ?? 0) + (s.rushingYards ?? 0) + (s.receivingYards ?? 0)
  );
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
                  name={playerDisplayName(player)}
                  fullName={player.fullName}
                  position={player.position}
                  competitionName={player.competitionName}
                  teamName={player.teamName}
                  photoPolicy="initials"
                  size="sm"
                />
                <div className="min-w-0">
                  <Link href={`/players/${player.id}`} className="truncate font-medium text-foreground hover:text-primary">
                    {playerDisplayName(player)}
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
  const showValue =
    filters.sortBy === "valueScore" || typeof filters.maxCapHit === "number";

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
              description={METRIC_GLOSSARY.ratingBasketball}
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
          {showValue ? (
            <>
              <TableHead sticky className="overflow-visible">
                <GlossaryTooltip
                  label={<span className="text-xs font-medium">Cap Hit</span>}
                  description={METRIC_GLOSSARY.capHit}
                  placement="bottom"
                />
              </TableHead>
              <TableHead sticky className="overflow-visible">
                <GlossaryTooltip
                  label={
                    <SortableTableHead
                      label="Value Score"
                      sortKey="valueScore"
                      filters={filters}
                      basePath={basePath}
                      route={route}
                    />
                  }
                  description={METRIC_GLOSSARY.capValueScore}
                  placement="bottom"
                />
              </TableHead>
            </>
          ) : null}
          <TableHead sticky className="text-right">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {players.map((player) => {
          const stats = player.currentSeasonStats;
          const reliable = hasReliableBasketballSample({
            matchesPlayed: stats.appearances,
            minutesPlayed: stats.minutesPlayed,
          });
          const valueScore = capValueScore(stats.rating, player.capHit ?? 0);

          return (
            <TableRow key={player.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <PlayerAvatar
                    name={playerDisplayName(player)}
                    fullName={player.fullName}
                    position={player.position}
                    competitionName={player.competitionName}
                    teamName={player.teamName}
                    photoPolicy="initials"
                    size="sm"
                  />
                  <div className="min-w-0">
                    <Link href={`/players/${player.id}`} className="truncate font-medium text-foreground hover:text-primary">
                      {playerDisplayName(player)}
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
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span className={`font-mono font-semibold tabular-nums ${ratingColor(stats.rating)}`}>
                    {stats.rating.toFixed(1)}
                  </span>
                  {!reliable && stats.appearances > 0 ? (
                    <Badge variant="amber" className="w-fit text-2xs">
                      Small sample
                    </Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="font-mono tabular-nums">{basketballPoints(player).toFixed(1)}</TableCell>
              <TableCell className="font-mono tabular-nums">{basketballRebounds(player).toFixed(1)}</TableCell>
              <TableCell className="font-mono tabular-nums">{basketballAssists(player).toFixed(1)}</TableCell>
              {showValue ? (
                <>
                  <TableCell className="font-mono tabular-nums">{formatCapHit(player.capHit ?? 0)}</TableCell>
                  <TableCell className="font-mono tabular-nums text-primary">
                    {(player.capHit ?? 0) > 0 ? valueScore.toFixed(2) : "—"}
                  </TableCell>
                </>
              ) : null}
              <TableCell className="text-right">
                <div className="inline-flex items-center justify-end gap-0.5">
                  <ShortlistButton playerId={player.id} compact />
                  <Link href={`/players/${player.id}`} className={buttonVariants({ variant: "ghost", size: "xs" })}>
                    <Eye className="h-3.5 w-3.5" /> Profile
                  </Link>
                </div>
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
  const browseMode = route === "players";
  const showValue =
    !browseMode &&
    (filters.sortBy === "valueScore" || typeof filters.maxMarketValue === "number");
  const showRateColumns = !browseMode;
  const showDefensiveRates = showRateColumns && filters.sortBy === "defensiveActionsPer90";
  const showAttackRates = showRateColumns && !showDefensiveRates;

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
          <TableHead sticky className="tabular-nums">Min</TableHead>
          {showValue ? (
            <>
              <TableHead sticky>
                <SortableTableHead
                  label="Value"
                  sortKey="marketValue"
                  filters={filters}
                  basePath={basePath}
                  route={route}
                />
              </TableHead>
              <TableHead sticky className="overflow-visible">
                <GlossaryTooltip
                  label={
                    <SortableTableHead
                      label="Value Score"
                      sortKey="valueScore"
                      filters={filters}
                      basePath={basePath}
                      route={route}
                    />
                  }
                  description={METRIC_GLOSSARY.valueScore}
                  placement="bottom"
                />
              </TableHead>
            </>
          ) : null}
          {showAttackRates ? (
            <>
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
            </>
          ) : null}
          {showDefensiveRates ? (
            <TableHead sticky>
              <SortableTableHead
                label="Def/90"
                sortKey="defensiveActionsPer90"
                filters={filters}
                basePath={basePath}
                route={route}
              />
            </TableHead>
          ) : null}
          <TableHead sticky className="text-right">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {players.map((player) => {
          const stats = player.currentSeasonStats;
          const reliable = hasReliableSoccerSample(stats.minutesPlayed);
          const xg90 = reliable ? computeXGPer90(stats.minutesPlayed, stats.xG) : null;
          const valueScore = soccerValueScore(stats.rating, player.marketValue);

          return (
            <TableRow key={player.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <PlayerAvatar
                    name={playerDisplayName(player)}
                    fullName={player.fullName}
                    position={player.position}
                    competitionName={player.competitionName}
                    teamName={player.teamName}
                    photoPolicy="initials"
                    size="sm"
                  />
                  <div className="min-w-0">
                    <Link href={`/players/${player.id}`} className="truncate font-medium text-foreground hover:text-primary">
                      {playerDisplayName(player)}
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
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span className={`font-mono font-semibold tabular-nums ${ratingColor(stats.rating)}`}>
                    {stats.rating.toFixed(1)}
                  </span>
                  {!reliable && stats.minutesPlayed > 0 ? (
                    <Badge variant="amber" className="w-fit text-2xs">
                      Small sample
                    </Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="font-mono tabular-nums text-muted-foreground">
                {stats.minutesPlayed > 0 ? stats.minutesPlayed.toLocaleString("en-US") : "—"}
              </TableCell>
              {showValue ? (
                <>
                  <TableCell className="font-mono tabular-nums">
                    {formatMarketValue(player.marketValue)}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums text-primary">
                    {valueScore.toFixed(2)}
                  </TableCell>
                </>
              ) : null}
              {showAttackRates ? (
                <>
                  <TableCell className="font-mono tabular-nums">
                    {reliable ? stats.per90.goals.toFixed(2) : "—"}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {xg90 != null ? xg90.toFixed(2) : "—"}
                  </TableCell>
                </>
              ) : null}
              {showDefensiveRates ? (
                <TableCell className="font-mono tabular-nums">
                  {reliable
                    ? (stats.per90.tackles + stats.per90.interceptions).toFixed(2)
                    : "—"}
                </TableCell>
              ) : null}
              <TableCell className="text-right">
                <div className="inline-flex items-center justify-end gap-0.5">
                  <ShortlistButton playerId={player.id} compact />
                  <Link href={`/players/${player.id}`} className={buttonVariants({ variant: "ghost", size: "xs" })}>
                    <Eye className="h-3.5 w-3.5" /> Profile
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function AmericanFootballScoutingTable({
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
  const showValue =
    filters.sortBy === "valueScore" || typeof filters.maxCapHit === "number";

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
          <TableHead sticky className="overflow-visible">
            <GlossaryTooltip
              label={
                <SortableTableHead label="Rating" sortKey="rating" filters={filters} basePath={basePath} route={route} />
              }
              description={METRIC_GLOSSARY.ratingFootball}
              placement="bottom"
            />
          </TableHead>
          <TableHead sticky className="overflow-visible text-right">
            <GlossaryTooltip
              label={
                <SortableTableHead
                  label="Yds/G"
                  sortKey="yardsPerGame"
                  filters={filters}
                  basePath={basePath}
                  route={route}
                />
              }
              description={METRIC_GLOSSARY.yardsPerGame}
              placement="bottom"
            />
          </TableHead>
          <TableHead sticky className="text-right">
            <SortableTableHead label="TD" sortKey="touchdowns" filters={filters} basePath={basePath} route={route} />
          </TableHead>
          <TableHead sticky className="text-right">
            <SortableTableHead label="Sacks" sortKey="sacks" filters={filters} basePath={basePath} route={route} />
          </TableHead>
          {showValue ? (
            <>
              <TableHead sticky className="overflow-visible">
                <GlossaryTooltip
                  label={<span className="text-xs font-medium">Cap Hit</span>}
                  description={METRIC_GLOSSARY.capHit}
                  placement="bottom"
                />
              </TableHead>
              <TableHead sticky className="overflow-visible">
                <GlossaryTooltip
                  label={
                    <SortableTableHead
                      label="Value Score"
                      sortKey="valueScore"
                      filters={filters}
                      basePath={basePath}
                      route={route}
                    />
                  }
                  description={METRIC_GLOSSARY.capValueScore}
                  placement="bottom"
                />
              </TableHead>
            </>
          ) : null}
          <TableHead sticky className="text-right">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {players.map((player) => {
          const stats = player.currentSeasonStats;
          const games = Math.max(stats.appearances, 1);
          const yards = totalYardsOf(player);
          const yardsPerGame = yards / games;
          const touchdowns = stats.touchdowns ?? stats.goals ?? 0;
          const reliable = hasReliableFootballSample({
            matchesPlayed: stats.appearances,
            minutesPlayed: stats.minutesPlayed,
          });
          const valueScore = capValueScore(stats.rating, player.capHit ?? 0);

          return (
            <TableRow key={player.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <PlayerAvatar
                    name={playerDisplayName(player)}
                    fullName={player.fullName}
                    position={player.position}
                    competitionName={player.competitionName}
                    teamName={player.teamName}
                    photoPolicy="initials"
                    size="sm"
                  />
                  <div className="min-w-0">
                    <Link href={`/players/${player.id}`} className="truncate font-medium text-foreground hover:text-primary">
                      {playerDisplayName(player)}
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
                  description={getPositionGlossaryDescription(player.position, "AMERICAN_FOOTBALL")}
                />
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span className={`font-mono font-semibold tabular-nums ${ratingColor(stats.rating)}`}>
                    {stats.rating.toFixed(1)}
                  </span>
                  {!reliable && stats.appearances > 0 ? (
                    <Badge variant="amber" className="w-fit text-2xs">
                      Small sample
                    </Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {reliable ? yardsPerGame.toFixed(1) : "—"}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">{touchdowns}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {(stats.sacks ?? 0).toFixed(1)}
              </TableCell>
              {showValue ? (
                <>
                  <TableCell className="font-mono tabular-nums">{formatCapHit(player.capHit ?? 0)}</TableCell>
                  <TableCell className="font-mono tabular-nums text-primary">
                    {(player.capHit ?? 0) > 0 ? valueScore.toFixed(2) : "—"}
                  </TableCell>
                </>
              ) : null}
              <TableCell className="text-right">
                <div className="inline-flex items-center justify-end gap-0.5">
                  <ShortlistButton playerId={player.id} compact />
                  <Link href={`/players/${player.id}`} className={buttonVariants({ variant: "ghost", size: "xs" })}>
                    <Eye className="h-3.5 w-3.5" /> Profile
                  </Link>
                </div>
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
  if (filters.sport === "BASKETBALL") {
    if (route === "players") {
      return <BasketballRosterTable players={players} filters={filters} basePath={basePath} route={route} />;
    }
    return <BasketballScoutingTable players={players} filters={filters} basePath={basePath} route={route} />;
  }

  if (filters.sport === "AMERICAN_FOOTBALL") {
    return (
      <AmericanFootballScoutingTable
        players={players}
        filters={filters}
        basePath={basePath}
        route={route}
      />
    );
  }

  return <SoccerScoutingTable players={players} filters={filters} basePath={basePath} route={route} />;
}
