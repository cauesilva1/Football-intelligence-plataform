"use server";

import { getDashboardRepository, getTeamRepository } from "@/features/scouting/repository";

async function simulateLatency(ms = 300) {
  if (process.env.DATA_SOURCE !== "db") {
    await new Promise((r) => setTimeout(r, ms));
  }
}

export async function getTeams() {
  await simulateLatency();
  return getTeamRepository().findAll();
}

export async function getTeam(id: string) {
  await simulateLatency(250);
  const team = await getTeamRepository().findById(id);
  if (!team) throw new Error(`TEAM_NOT_FOUND:${id}`);
  return team;
}

export async function getDashboardOverview() {
  await simulateLatency(400);
  return getDashboardRepository().getOverview();
}
