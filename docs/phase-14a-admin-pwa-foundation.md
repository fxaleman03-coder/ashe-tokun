# Phase 14A: Admin PWA Foundation

Date: July 18, 2026
Project: ASHE TOKUN

## Historical Note

This document preserves the status at the time of Phase 14A. Later PWA
icon-cache/versioning work superseded the original unversioned icon references,
but the original foundation findings remain useful launch history.

## Audit Findings

- Existing manifest: None found.
- Existing service worker: None found.
- Existing icon set: `app/favicon.ico` and the official logo at `public/brand/ashe-tokun-logo.png`.
- Existing Apple metadata: None found.
- Existing PWA installability: Not configured before this phase.

## Files Created

- `app/manifest.webmanifest`
- `components/admin/AdminPwaRegistrar.tsx`
- `public/admin-service-worker.js`
- `public/icons/ashe-admin-icon-192.png`
- `public/icons/ashe-admin-icon-256.png`
- `public/icons/ashe-admin-icon-384.png`
- `public/icons/ashe-admin-icon-512.png`
- `public/icons/ashe-admin-maskable-512.png`
- `public/icons/apple-touch-icon.png`

## Files Modified

- `app/layout.tsx`
- `app/admin/layout.tsx`

## PWA Capabilities

- Admin install target starts at `/admin`.
- Manifest name is `ASHE TOKUN Admin`.
- Manifest short name is `ASHE Admin`.
- Display mode is `standalone`.
- Orientation is `portrait`.
- Theme and background colors use ASHE TOKUN dark branding.
- Icon references include 192, 256, 384, 512, maskable, Apple Touch Icon, and favicon compatibility.
- Apple mobile web app metadata is enabled through the Next.js Metadata API.
- A minimal production service worker registers only from the Admin layout.

## Production Safety Assessment

The service worker caches only static same-origin assets:

- Next.js static build assets under `/_next/static/`
- PWA icons under `/icons/`
- Brand assets under `/brand/`
- `/favicon.ico`
- `/manifest.webmanifest`

It does not cache:

- API responses
- Supabase responses
- authenticated pages
- admin HTML
- POST, PATCH, PUT, or DELETE requests
- POS, inventory, order, shipping, return, or payroll data

This preserves current authentication, permissions, Supabase access, and store operations behavior.

## Remaining Work

- Validate install prompts on real iPhone, iPad, Android, Chrome, Edge, and Safari devices.
- Add splash-screen image variants if a later visual polish phase requires them.
- Consider offline shell strategy only after authentication and data rules are explicitly designed for offline use.
- Push notifications, barcode scanning, camera access, QR scanning, offline POS, offline inventory, and offline orders remain out of scope.
