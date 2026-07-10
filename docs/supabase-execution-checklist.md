# ASHE TOKUN Supabase Execution Checklist

This checklist is for the first future manual execution of `supabase/schema.sql` in Supabase. It does not connect the app to Supabase, replace local data, or enable live writes.

## 1. Pre-Execution Checklist

- Confirm the Supabase project exists.
- Confirm `.env.local` exists locally.
- Confirm `NEXT_PUBLIC_SUPABASE_URL` is present in `.env.local`.
- Confirm `NEXT_PUBLIC_SUPABASE_ANON_KEY` is present in `.env.local`.
- Confirm the local app still works with `USE_SUPABASE = false`.
- Confirm `npm run lint` passes.
- Confirm `npm run build` passes.
- Confirm latest code is committed and pushed.
- Confirm `supabase/schema.sql` has been reviewed.

## 2. Execution Steps

1. Open the Supabase SQL Editor.
2. Copy the full contents of `supabase/schema.sql`.
3. Run the SQL once.
4. Save the Supabase SQL Editor output.
5. Do not run the SQL repeatedly without reviewing the previous output and current database state.

## 3. Post-Execution Verification

- Confirm tables exist.
- Confirm seed data exists:
  - AJAKO ORIGINALS
  - ODIBERE CREATIONS
  - Inventory locations
  - Florida Sales Tax Placeholder
  - Admin staff placeholder
- Confirm indexes exist.
- Confirm triggers exist.
- Confirm RLS is not enabled yet.
- Confirm no app behavior changed.

## 4. Rollback Notes

- This execution is for development only.
- If needed, drop tables in reverse dependency order.
- Never drop production data without a verified backup.
- Take a Supabase backup before any future production migration.

## 5. Next Phases After Execution

- Phase 5.1: Read brands from Supabase.
- Phase 5.2: Read catalog taxonomies.
- Phase 5.3: Read products.
- Phase 5.4: Save Product Studio to Supabase.
- Phase 5.5: POS order writes.
- Phase 5.6: Inventory transaction writes.
- Phase 5.7: Supabase Storage for media.
