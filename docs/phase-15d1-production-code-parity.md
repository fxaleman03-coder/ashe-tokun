# Phase 15D.1: Production Code Parity Verification

Date: July 18, 2026
Project: ASHE TOKUN

## Historical Note

This document preserves the Phase 15D.1 parity checkpoint. Its statement that
Complete Sale containment remained enabled was accurate at that time and was
later superseded by live POS activation.

## Executive Summary

Production code parity is verified for the POS RPC wiring.

The validated Phase 15B POS commit was created, pushed to `main`, and deployed by Vercel to production. Vercel build logs confirm production cloned `github.com/fxaleman03-coder/ashe-tokun` on branch `main` at commit `742d2f9`.

Complete Sale containment remains enabled.

## Local Commit

Validated commit:

- `742d2f91aa41edc2de594a47dd710e7198f03e80`

Commit message:

- `Wire POS sale completion to transactional RPC`

Committed files:

- `lib/data/posMutations.ts`
- `docs/phase-15b-pos-rpc-activation.md`

Relevant source verification from the commit:

- `completePosSale()` calls `complete_pos_sale_transaction(...)`.
- `createPosSaleRequestKey()` generates `pos-sale-${randomUUID()}` idempotency keys.
- Old sequential helper names are absent:
  - `insertOrderWithRetry`
  - `insertReceiptWithRetry`
- Direct sequential production writes are absent from `completePosSale()`:
  - `orders`
  - `order_items`
  - `payments`
  - `receipts`
  - `inventory_transactions`

## Local Workspace Status

The local workspace is not clean after the parity commit.

Remaining uncommitted files are not required for POS RPC parity:

- `app/admin/layout.tsx`
- `components/admin/AdminPwaRegistrar.tsx`
- `docs/phase-14a-admin-pwa-foundation.md`
- `docs/phase-15a-pos-production-readiness.md`
- `docs/phase-15c-controlled-pos-validation.md`
- `docs/phase-15d-final-production-verification.md`
- `docs/phase-15d1-production-code-parity.md`

## Remote Branch

Remote production branch:

- `origin/main`

Remote SHA after push:

- `742d2f91aa41edc2de594a47dd710e7198f03e80`

Verification command:

```sh
git ls-remote origin refs/heads/main
```

## Vercel Production Deployment

Production deployment:

- Deployment ID: `dpl_9bSigWdxDMpiByaXsterE9ZiRGid`
- Deployment URL: `https://ashe-tokun-pte02mpb0-fxaleman03-coders-projects.vercel.app`
- Production aliases:
  - `https://ashetokun.com`
  - `https://ashe-tokun.vercel.app`
  - `https://ashe-tokun-fxaleman03-coders-projects.vercel.app`
  - `https://ashe-tokun-git-main-fxaleman03-coders-projects.vercel.app`
- Status: Ready
- Target: Production

Vercel build log source:

```text
Cloning github.com/fxaleman03-coder/ashe-tokun (Branch: main, Commit: 742d2f9)
```

Vercel production deployment SHA:

- `742d2f9`

Full commit match:

- The Vercel logs expose the short SHA. It matches the pushed commit prefix for `742d2f91aa41edc2de594a47dd710e7198f03e80`.

## Parity Result

Comparison:

| Source | SHA |
| --- | --- |
| Local validated commit | `742d2f91aa41edc2de594a47dd710e7198f03e80` |
| Remote production branch | `742d2f91aa41edc2de594a47dd710e7198f03e80` |
| Vercel production deployment | `742d2f9` |

Result:

- PASS

## Deployed POS Behavior

Verified in deployed commit tree:

- `completePosSale()` invokes `complete_pos_sale_transaction(...)`.
- A server-generated idempotency key is sent to the RPC.
- The unsafe sequential multi-write production fallback is absent.
- RPC errors return safe user-facing messages.
- Revalidation only runs after a verified Supabase RPC result.
- `launchContainment.posSaleCompletion` remains `true`.

## Deployment Performed

Deployment performed:

- YES

Mechanism:

- Created scoped local commit `742d2f9`.
- Pushed `main` to GitHub.
- Vercel production deployment was created automatically from the pushed `main` commit.

No POS containment was removed.
No Supabase migrations were applied.
No live UI sale was executed.

## Validation

Commands:

- `npm run lint`
- `npm run build`

Results:

- `npm run lint`: PASS
- `npm run build`: PASS

## Recommendation

Production code parity is verified.

ASHE TOKUN is GO for Phase 15D Live Activation, limited to removing only the POS Complete Sale containment and then performing the first UI-driven live sale.
