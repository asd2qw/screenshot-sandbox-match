<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Backend is Lovable Cloud only (DB, auth, storage); no other database or auth services — single coherent stack.
- Every business table carries `company_id` and RLS scoped via `current_company_id()` / `is_company_owner()` — keeps tenants isolated for future multi-company use.
- Roles live in `user_roles` (owner/worker), never on profiles — prevents privilege escalation.
- Worker accounts are created only via server functions in `src/lib/workers.functions.ts` with `app_metadata.company_id`; public signup only works for the very first owner (DB trigger) — workers cannot self-register.
- Business limits live in pure modules (`src/lib/*-rules.ts`) with tests in `src/test/` and are also enforced in the DB.
- UI copy is Spanish; dates via `src/lib/format.ts` (DD/MM/YYYY, Europe/Madrid, EUR).
- Unfinished modules render `ComingSoon`; never fake functionality.
- Keep PROJECT_STATUS.md, DATABASE.md, CHANGELOG.md updated at the end of each phase.
- Phase 2 review SQL lives outside active migrations in `docs/phase2/`; apply only through the managed migration tool after separate SQL approval, so draft review never changes the hosted schema.
- Phase 2 uses tenant-scoped assignment tables for multiple workers; cascade assignment rows on profile deletion and retain plain creator UUIDs, so deleting accounts cannot invoke protected parent-row updates or erase business history.
- Invoice numbering, immutability and fiscal snapshots are enforced by DB triggers on `invoices`; the UI only creates drafts and changes status, so concurrent or direct writes cannot break legal invoice sequences.
- Worker access changes use `worker-access.ts` with fail-closed ordering and checked writes; no success is returned after partial failure.
