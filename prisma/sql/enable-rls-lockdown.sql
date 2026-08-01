-- OmniScout / Football Intelligence Platform
-- Supabase security: enable RLS on all public app tables.
--
-- Context: the app accesses Postgres via Prisma (DATABASE_URL / postgres role),
-- NOT via the anon PostgREST key. Enabling RLS with no policies for
-- anon/authenticated blocks public API read/write/delete while Prisma
-- (table owner / superuser path) continues to work.
--
-- Apply (use DIRECT_URL / session pooler, not transaction pooler):
--   psql "$DIRECT_URL" -f prisma/sql/enable-rls-lockdown.sql
--   OR: npm run db:secure-rls
--
-- After apply, re-check Supabase Dashboard → Database → Linter.

BEGIN;

-- Core domain
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.player_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.player_season_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.player_match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.team_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.scouting_reports ENABLE ROW LEVEL SECURITY;

-- Workspace / demo persistence
ALTER TABLE IF EXISTS public.workspace_shortlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.recruitment_brief_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_cache ENABLE ROW LEVEL SECURITY;

-- Explicit deny policies for API roles (defense in depth; default-deny already
-- applies when RLS is on and no grant policy exists).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users',
    'competitions',
    'teams',
    'players',
    'matches',
    'player_statistics',
    'player_season_stats',
    'player_match_stats',
    'team_statistics',
    'scouting_reports',
    'workspace_shortlist_entries',
    'recruitment_brief_runs',
    'system_cache'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS deny_all_anon ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS deny_all_authenticated ON public.%I', t);

    -- No USING (false) SELECT for anon — omit policies = no access.
    -- Optional named policies document intent in the dashboard:
    EXECUTE format(
      'CREATE POLICY deny_all_anon ON public.%I AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false)',
      t
    );
    EXECUTE format(
      'CREATE POLICY deny_all_authenticated ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false)',
      t
    );
  END LOOP;
END $$;

COMMIT;
