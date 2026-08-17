# Security acceptance (QA-SEC-001)

**Project:** Maruti Galaxy  
**Standard:** `docs/Maruti_Galaxy_Security_Requirements.md` §70  
**Verified:** 2026-08-17 by CI (`npm run ci`)  
**Production HTTPS host redirect:** Phase 15 OPS-006 (not claimed here)

This is the Phase 12 security acceptance checklist with code/CI evidence. Business UAT sign-off remains QA-005.

| §70 criterion | Evidence | Result |
|---|---|---|
| Supabase Auth handles authentication | `loginAction` uses `signInWithPassword`; no local password table | Pass |
| No password hashes in the application schema | `users` has no password columns; Auth stores secrets | Pass (Phase 2/3) |
| Protected operations authenticate and authorize server-side | `requireActiveAdmin` in services/actions; `src/proxy.ts` | Pass |
| RLS enabled and deliberately configured | `migration_01.sql` default deny; authenticated active admin | Pass (Phase 2) |
| Service-role credentials never reach the client | `server-only` admin client; secret-scan + bundle-scan | Pass |
| Secrets are not committed to source control | `.gitignore` `.env*`; CI tracked-file check | Pass |
| Mutations validate input server-side | `parseOrThrow` + Zod on actions | Pass |
| SQL injection is prevented | Query builder + `escapeIlike`; UUID reject `' OR 1=1` | Pass |
| XSS protections remain intact | React defaults; no `dangerouslySetInnerHTML` | Pass |
| Object-level authorization prevents IDOR/BOLA | UUID lookups; lot/invoice numbers are not authz tokens | Pass |
| Main Job Than cannot be over-allocated | `create_sub_job` remaining Than RPC | Pass (Phase 8) |
| Sub Job Than cannot be over-allocated | employee work RPCs | Pass (Phase 8) |
| Invoice allocations cannot exceed remaining | `allocate_entry_to_invoices` | Pass (Phase 10) |
| Only Income entries can settle invoices | RPC income-only guard | Pass (Phase 10) |
| Financial deletion cannot break accounting integrity | R-22; allocated rows cannot delete | Pass (Phase 10) |
| Historical commission/earning remain stable | Work snapshots; master edits do not rewrite | Pass (Phase 7/8) |
| Business identifiers unique at the database | unique lot; unique invoice number | Pass (Phase 2) |
| Critical operations are transaction-safe | job+invoice RPC; allocation RPC | Pass |
| Production errors do not expose internal details | `mapToActionError` sanitizer | Pass (Phase 4) |
| Sensitive data is not publicly exposed | Authz + RLS; export `no-store` | Pass |
| Security headers and HTTPS are configured for production | CSP enforce + HSTS + XCTO + RP + PP on production builds; Secure cookies when `NODE_ENV=production`. Host HTTPS redirect is OPS-006. | Pass (app); host pending Phase 15 |
| Security testing is completed before release | SEC-007/008 unit suites; RLS SQL; secret/bundle scans; `npm audit` | Pass for Phase 12 automated tests. Full E2E is QA-001. |
