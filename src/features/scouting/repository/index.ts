import { mockPlayerRepository } from "./player.repository.mock";
import { prismaPlayerRepository } from "./player.repository.prisma";
import { mockTeamRepository } from "./team.repository.mock";
import { prismaTeamRepository } from "./team.repository.prisma";
import type { DashboardRepository, PlayerRepository, TeamRepository } from "./types";
import { mockDashboardRepository } from "@/features/analytics/repository/dashboard.repository.mock";
import { prismaDashboardRepository } from "@/features/analytics/repository/dashboard.repository.prisma";

export function isDbSource(): boolean {
  return process.env.DATA_SOURCE === "db";
}

export function getPlayerRepository(): PlayerRepository {
  return isDbSource() ? prismaPlayerRepository : mockPlayerRepository;
}

export function getTeamRepository(): TeamRepository {
  return isDbSource() ? prismaTeamRepository : mockTeamRepository;
}

export function getDashboardRepository(): DashboardRepository {
  return isDbSource() ? prismaDashboardRepository : mockDashboardRepository;
}

export type { PlayerRepository, TeamRepository, DashboardRepository } from "./types";
