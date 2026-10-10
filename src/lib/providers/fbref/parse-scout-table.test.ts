import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseFbrefScoutPage, parseStatNumber } from "@/lib/providers/fbref/parse-scout-table";

const PAGE = `
<!--
<table id="stats_passing">
<tbody>
<tr class="thead"><th data-stat="player">Player</th></tr>
<tr>
  <td data-stat="player"><a>Lionel Messi</a></td>
  <td data-stat="team"><a>Inter Miami</a></td>
  <td data-stat="minutes_90s">23.2</td>
  <td data-stat="passes_into_final_third">80</td>
  <td data-stat="passes_into_penalty_area">22</td>
  <td data-stat="progressive_passes">90</td>
  <td data-stat="xg_assist">7.4</td>
  <td class="iz" data-stat="pressures"></td>
</tr>
<tr class="partial_table">
  <td data-stat="player"><a>Lionel Messi</a></td>
  <td data-stat="minutes_90s">2.0</td>
  <td data-stat="progressive_passes">1</td>
</tr>
</tbody>
</table>
<table id="stats_possession">
<tr>
  <td data-stat="player">Lionel Messi</td>
  <td data-stat="minutes_90s">23.2</td>
  <td data-stat="progressive_carries">70</td>
</tr>
</table>
<table id="stats_gca">
<tr>
  <td data-stat="player">Lionel Messi</td>
  <td data-stat="minutes_90s">23.2</td>
  <td data-stat="sca">61</td>
  <td data-stat="gca">12</td>
</tr>
</table>
<table id="stats_defense">
<tr>
  <td data-stat="player">Other Player</td>
  <td data-stat="team">Nashville</td>
  <td data-stat="minutes_90s">10</td>
  <td data-stat="pressures">0</td>
</tr>
</table>
-->
`;

describe("FBref scout table parse", () => {
  it("reads a blank cell as missing and keeps a real zero", () => {
    assert.equal(parseStatNumber(""), null);
    assert.equal(parseStatNumber("0"), 0);
    assert.equal(parseStatNumber("1,024"), 1024);
  });

  it("keeps the season total and skips a partial row", () => {
    const metrics = parseFbrefScoutPage(PAGE, { leagueKey: "usa.1", season: 2026 });
    const messi = metrics.filter((row) => row.playerName === "Lionel Messi");
    const byMetric = Object.fromEntries(messi.map((row) => [row.metric, row.value]));
    assert.equal(byMetric.progressive_passes, 90);
    assert.equal(byMetric.progressive_carries, 70);
    assert.equal(byMetric.sca, 61);
    assert.equal(byMetric.gca, 12);
    assert.equal(byMetric.xa, 7.4);
    assert.equal(byMetric.passes_final_third, 80);
    assert.equal(byMetric.passes_penalty_area, 22);
    assert.equal(byMetric.pressures, undefined);
    const other = metrics.find((row) => row.playerName === "Other Player");
    assert.equal(other?.metric, "pressures");
    assert.equal(other?.value, 0);
    assert.equal(other?.season, 2026);
    assert.equal(other?.leagueKey, "usa.1");
  });
});
