# Electron Purchase API

## Goal
Add 4 public/user-facing API endpoints for the Electron app's in-app purchase UI.
These are separate from the admin dashboard APIs and use JWT Bearer auth.

## Tasks

- [x] **lib/electron-jwt.ts** — HMAC-SHA256 JWT helper (sign/verify/extract) → No external deps, uses Node.js `crypto`
- [x] **POST /api/auth/token** — Login endpoint for Electron, returns JWT → Verify: curl returns `{ token, userId, email }`
- [x] **GET /api/plans** — Public plan listing → Verify: curl returns plans array, no auth needed
- [x] **POST /api/orders** — Create PENDING transaction + return bank info → Verify: creates Transaction in DB with status PENDING
- [x] **GET /api/orders/[id]/status** — Poll for order completion + license key → Verify: returns licenseKey when COMPLETED
- [x] **GET /api/me/license** — Current user's license status → Verify: returns hasLicense + license details
- [x] **docs/electron-purchase-client.ts** — Full client library + flow example for Electron devs
- [x] **.env** / **.env.example** — Added `ELECTRON_JWT_SECRET`, `BANK_NAME`, `BANK_ACCOUNT_NUMBER`, `BANK_ACCOUNT_NAME`

## Done When

- [ ] Set `ELECTRON_JWT_SECRET` in `.env` to a real random value (`openssl rand -base64 32`)
- [ ] Set `BANK_ACCOUNT_NUMBER` and `BANK_ACCOUNT_NAME` in `.env`
- [ ] All 5 new routes respond correctly (test with curl or Electron app)
- [ ] Admin can still confirm orders via existing `PATCH /api/admin/transactions/[id]` → no schema changes needed

## Notes

- **Q1 (JWT):** JWT Bearer và NextAuth session hoàn toàn tách biệt. NextAuth dùng cookie cho dashboard, JWT Bearer dùng header `Authorization` cho Electron. Không ảnh hưởng nhau.
- **Auth flow:** `POST /api/auth/token` → store token in `electron-store` → attach `Authorization: Bearer <token>` vào mọi request.
- **No schema changes:** Sử dụng `Transaction` model hiện có, không cần migration.
- **Todo nếu cần:** Implement rate limiting trên `/api/auth/token` để tránh brute-force.
