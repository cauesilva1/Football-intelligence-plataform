/** Structured Supabase/Prisma failure logging for production diagnostics. */
export function logSupabaseError(context: string, error: unknown): void {
  console.error("Erro crítico de conexão com o Supabase:", { context, error });
}
