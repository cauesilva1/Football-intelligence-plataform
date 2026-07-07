type SearchParams = Record<string, string | string[] | undefined>;

function param(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parseCompareParams(searchParams: SearchParams) {
  return {
    playerA: param(searchParams.playerA) ?? param(searchParams.a) ?? "",
    playerB: param(searchParams.playerB) ?? param(searchParams.b) ?? "",
  };
}

export function compareToSearchParams(playerA: string, playerB: string): URLSearchParams {
  const params = new URLSearchParams();
  if (playerA) params.set("playerA", playerA);
  if (playerB) params.set("playerB", playerB);
  return params;
}
