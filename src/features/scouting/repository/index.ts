import { mockDashboardRepository } from "@/features/analytics/repository/dashboard.repository.mock";
import { isDbSource } from "@/lib/data-source";
import { logSupabaseError } from "@/lib/db-errors";
import { mockPlayerRepository } from "./player.repository.mock";
import { mockTeamRepository } from "./team.repository.mock";
import type { DashboardRepository, PlayerRepository, TeamRepository } from "./types";

let prismaPlayerRepository: PlayerRepository | undefined;
let prismaTeamRepository: TeamRepository | undefined;
let prismaDashboardRepository: DashboardRepository | undefined;

function loadPrismaPlayerRepository(): PlayerRepository {
  if (!prismaPlayerRepository) {
    // Loaded only when DATA_SOURCE=db — avoids Prisma init during mock builds.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    prismaPlayerRepository = require("./player.repository.prisma").prismaPlayerRepository;
  }
  return prismaPlayerRepository!;
}

function loadPrismaTeamRepository(): TeamRepository {
  if (!prismaTeamRepository) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    prismaTeamRepository = require("./team.repository.prisma").prismaTeamRepository;
  }
  return prismaTeamRepository!;
}

function loadPrismaDashboardRepository(): DashboardRepository {
  if (!prismaDashboardRepository) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    prismaDashboardRepository =
      require("@/features/analytics/repository/dashboard.repository.prisma").prismaDashboardRepository;
  }
  return prismaDashboardRepository!;
}

function assertDbConfigured(): void {
  if (isDbSource() && !process.env.DATABASE_URL?.trim()) {
    const error = new Error("DATABASE_URL ausente com DATA_SOURCE=db");
    logSupabaseError("repository:config", error);
    throw error;
  }
}

export function getPlayerRepository(): PlayerRepository {
  if (isDbSource()) {
    assertDbConfigured();
    return loadPrismaPlayerRepository();
  }
  return mockPlayerRepository;
}

export function getTeamRepository(): TeamRepository {
  if (isDbSource()) {
    assertDbConfigured();
    return loadPrismaTeamRepository();
  }
  return mockTeamRepository;
}

export function getDashboardRepository(): DashboardRepository {
  if (isDbSource()) {
    assertDbConfigured();
    return loadPrismaDashboardRepository();
  }
  return mockDashboardRepository;
}

export type { PlayerRepository, TeamRepository, DashboardRepository } from "./types";
export { isDbSource } from "@/lib/data-source";
