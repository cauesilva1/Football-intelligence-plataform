import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatMarketValue, ratingColor } from "@/lib/utils";
import type { Player } from "@/types";

export function PlayersTable({ players }: { players: Player[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Player</TableHead>
          <TableHead>Pos.</TableHead>
          <TableHead>Club</TableHead>
          <TableHead>Age</TableHead>
          <TableHead>Gols/90</TableHead>
          <TableHead>Assist./90</TableHead>
          <TableHead>Rating</TableHead>
          <TableHead>Valor</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {players.map((p) => (
          <TableRow key={p.id}>
            <TableCell>
              <Link href={`/players/${p.id}`} className="font-medium text-foreground hover:text-primary">
                {p.knownAs}
              </Link>
              <p className="text-[11px] text-muted-foreground">{p.nationality}</p>
            </TableCell>
            <TableCell><Badge variant="secondary">{p.position}</Badge></TableCell>
            <TableCell className="text-muted-foreground">{p.teamShortName ?? "-"}</TableCell>
            <TableCell>{p.age}</TableCell>
            <TableCell className="font-mono">{p.currentSeasonStats.per90.goals.toFixed(2)}</TableCell>
            <TableCell className="font-mono">{p.currentSeasonStats.per90.assists.toFixed(2)}</TableCell>
            <TableCell className={`font-mono font-semibold ${ratingColor(p.currentSeasonStats.rating)}`}>
              {p.currentSeasonStats.rating.toFixed(1)}
            </TableCell>
            <TableCell className="font-mono">{formatMarketValue(p.marketValue)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
