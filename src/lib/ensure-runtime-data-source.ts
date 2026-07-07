import { connection } from "next/server";
import { isDbSource } from "@/lib/data-source";

/** Opt out of static generation when the live database is the data source. */
export async function ensureRuntimeDataSource(): Promise<void> {
  if (isDbSource()) {
    await connection();
  }
}
