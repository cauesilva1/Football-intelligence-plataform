import { mockPlayerRepository } from "./player.repository.mock";
import { mockTeamRepository } from "./team.repository.mock";
import type { DashboardRepository, PlayerRepository, TeamRepository } from "./types";
import { mockDashboardRepository } from "@/features/analytics/repository/dashboard.repository.mock";

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

export function isDbSource(): boolean {
  return process.env.DATA_SOURCE === "db";
}

export function getPlayerRepository(): PlayerRepository {
  return isDbSource() ? loadPrismaPlayerRepository() : mockPlayerRepository;
}

export function getTeamRepository(): TeamRepository {
  return isDbSource() ? loadPrismaTeamRepository() : mockTeamRepository;
}

export function getDashboardRepository(): DashboardRepository {
  return isDbSource() ? loadPrismaDashboardRepository() : mockDashboardRepository;
}

export type { PlayerRepository, TeamRepository, DashboardRepository } from "./types";
