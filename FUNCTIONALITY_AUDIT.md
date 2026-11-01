# PDSW Portal Functionality Audit

Audit baseline: 2026-11-01. Scope: Admin, PDS Officer, Beneficiary. SOC Analyst pages and handlers are intentionally excluded from implementation.

## Existing architecture

- Next.js App Router frontend in `frontend/src/app`; role route guards and shared dashboard shell in `frontend/src/components/shared/AppShell.tsx`.
- Role sidebar definitions in `frontend/src/components/shared/sidebar-navigation.ts`.
- Frontend same-origin API handlers in `frontend/src/app/api/**`; most portal handlers proxy FastAPI.
- FastAPI routers currently registered in `backend/main.py`: `auth`, `audit`, and `requests`.
- SQLAlchemy persistence currently defines `User`, `AuthNonce`, `DocumentAudit`, and `ChangeRequestRecord` in `backend/models.py`; schema bootstrap uses `create_all` plus an additive officer-assignment migration.
- RBAC is enforced by `backend/rbac/dependencies.py`; officer beneficiary and request scopes use the persisted officer assignment.
- Preserve the existing wallet login, user administration, request submission/review/withdrawal, IPFS document audit, and officer assignment workflows.

## Page-by-page baseline

### Admin portal

| Page | Route | Baseline status | Evidence / gap |
|---|---|---|---|
| System Dashboard | `/admin/dashboard` | Partial, live | Calls `/api/admin/stats` for user counts; request, distribution, activity, alert and registration summaries are absent. |
| User Directory | `/admin/users` | Functional core | Real user list/create/status/reset/assignment calls exist; richer officer activity and request-history views are absent. |
| RBAC & Permissions | `/admin/roles` | UI-only/mock | Loads `MOCK_ROLE_PERMISSIONS`; no persistent permission-management API. |
| System Settings | `/admin/settings` | Partial/UI-only | Settings screen has no persisted settings service/API. |
| AI Risk Intelligence | `/admin/ai-intelligence` | Mock/UI-only | Uses `MOCK_AI_RISK_ASSESSMENTS`; displayed action controls are not backed by a risk case workflow. |
| Integrity Verification | `/admin/integrity` | Mock/UI-only | Uses mock verification/version data; no admin integrity report endpoint. |
| IPFS Provenance Ledger | `/admin/ipfs` | Partially functional, live | Calls `/api/admin/ipfs` for persisted document audits; dependent on audited upload events and does not represent all application activity. |
| System Analytics | `/admin/reports` | UI-only | Report cards and exports are not backed by filtered database queries. |

### PDS Officer portal

| Page | Route | Baseline status | Evidence / gap |
|---|---|---|---|
| Officer Dashboard | `/officer/dashboard` | Partial, live | Derives assigned beneficiary/request counts from live lists; distribution/activity/alerts not available. |
| Beneficiary Management | `/officer/beneficiaries` | Functional core | Uses persistent CRUD/status/reset routes with backend assignment isolation; duplicate email account cannot be re-created and requires finding/reassigning the existing account. |
| Verification Queue | `/officer/verification` | Partial/UI-only | Reads beneficiaries, not a persisted verification queue; approve/reject controls are unimplemented. |
| Modification Requests | `/officer/requests` | Functional core | Persisted request list/detail/review and assignment checks exist. |
| Commodity Release | `/officer/distribution` | Unsafe/incomplete | UI calls a proxy, but no SQLAlchemy inventory/distribution models or FastAPI distribution route are registered; service fabricates receipt IDs/CIDs and falls back to mock distributions on errors. |
| Migration & Transfers | `/officer/migration` | UI-only | Static sample transfer flow; no persisted migration records or processing actions. |
| Field Risk Alerts | `/officer/alerts` | Not implemented | Explicitly displays that no officer alert feed is connected. |

### Beneficiary portal

| Page | Route | Baseline status | Evidence / gap |
|---|---|---|---|
| My Dashboard | `/beneficiary/dashboard` | Partial/unsafe fallback | Uses profile store; service synthesizes a profile, family, ration entitlements and hashes if the API fails. |
| Ration Eligibility | `/beneficiary/eligibility` | Partial/unsafe fallback | Depends on synthesized profile data; no persisted ration card or entitlement source. |
| Family Management | `/beneficiary/family` | Partial/unsafe fallback | Displays profile-store family data; no persisted family-member model/read API. Requests are available through the change-request workflow. |
| Change Requests | `/beneficiary/requests` | Functional core | Persisted submit/list/withdraw, dynamic request fields, document references and officer review exist. |
| Distribution Receipts | `/beneficiary/transactions` | Partial | Fetches a beneficiary transactions API, but no real distribution records exist; empty/failure behavior is not a complete receipt workflow. |
| Record Integrity | `/beneficiary/integrity` | Mock/fallback | Uses synthesized profile and mock verification results; no beneficiary-scoped integrity verification endpoint. |
| Notifications | `/beneficiary/notifications` | Local/mock only | Backed by a Zustand store seeded from mock notifications; no persistence/read-state API. |
| My Profile | `/beneficiary/profile` | Partial/unsafe fallback | API-backed attempt exists; fallback profile data is synthesized and protected edits do not have a complete request-linked experience. |
| Account Settings | `/beneficiary/settings` | UI-only | Password form has no submit handler/backend change-password endpoint; logout/session controls are incomplete. |

## Backend endpoint coverage at audit time

- FastAPI exposes authentication/user management, wallet nonce/login, admin user counts, officer beneficiary CRUD/reset, request CRUD/review/withdraw, and document audit endpoints.
- Next.js API handlers proxy the above and contain several additional stubs for profile, eligibility, family, transactions, distribution, stats, and telemetry. A Next.js handler existing does not establish database persistence: the backend has no corresponding domain tables for family, inventory/distribution, notifications, settings, migration, or verification.
- Existing backend tables do not include profiles/beneficiary ration entitlement, family members, inventory, stock movements, distributions, notifications, settings, verification cases, migration history, or field-alert state.

## Implementation status

### Admin portal

| Page | Current status | Implemented behaviour / remaining limitation |
|---|---|---|
| System Dashboard | Live, persisted | Reads account, request, distribution, alert, registration, and audit summaries from the backend. |
| User Directory | Live, persisted | Existing account CRUD/status/reset/assignment operations retained. Existing duplicate accounts must be assigned by an admin instead of being re-created. |
| RBAC & Permissions | Live, read-only | Shows the backend canonical role registry and provisioning sources. Permission changes remain code-reviewed and enforced by FastAPI; this page intentionally does not pretend to edit policies dynamically. |
| System Settings | Live, persisted | Manages FPS stock, category entitlements, and non-secret JSON settings. Secrets remain deployment environment configuration. |
| AI Risk Intelligence | Live, event-backed | Displays only persisted alert events; no ML assessment is claimed or fabricated. |
| Integrity Verification | Live, evidence-backed | Displays actual available integrity/document evidence and does not claim verification where no anchor/check exists. |
| IPFS Provenance Ledger | Existing API-backed | Shows actual persisted document audit rows; it remains dependent on real audited uploads. |
| System Analytics | Live summaries / CSV | Exports account, request, distribution, audit, and recent-request data returned by persisted admin stats. Date/category filtering is not yet exposed. |

### PDS Officer portal

| Page | Current status | Implemented behaviour / remaining limitation |
|---|---|---|
| Officer Dashboard | Live, assignment-scoped | Counts assigned beneficiaries, pending verification/modifications, approvals/rejections, open alerts, distributions today, and recent requests/releases. |
| Beneficiary Management | Live, assignment-scoped | Existing registration/edit/status/reset retained; card/address/FPS/category/income data now persists. Existing legacy accounts need admin assignment. |
| Verification Queue | Live, persisted | Assigned pending accounts can be verified/rejected with required comments; decisions and history persist and notify the beneficiary. |
| Modification Requests | Live, persisted | Existing owner isolation retained; reviews apply validated profile/family/location changes and record comments/alerts. |
| Commodity Release | Live, persisted | Validates assignment, account/verification status, shop, category entitlement, monthly cap, stock, and idempotency; deducts stock and creates a database receipt. No biometric device or IPFS pin is claimed. |
| Migration & Transfers | Live, request-backed | Reviews assigned migration requests and preserves prior location in request history; approved location changes clear stale officer/FPS assignment for authorized reassignment. |
| Field Risk Alerts | Live, event-backed | Lists alerts scoped to assigned beneficiaries and persists acknowledgement. |

### Beneficiary portal

| Page | Current status | Implemented behaviour / remaining limitation |
|---|---|---|
| My Dashboard | Live, own-account scoped | Uses persisted profile, eligibility, family count, requests, receipts, and unread notifications; no invented quota/profile values. |
| Ration Eligibility | Live, own-account scoped | Reads recorded account category and admin-configured entitlement rules; empty/unconfigured states are explicit. |
| Family Management | Live, own-account scoped | Reads persisted family records; enrolment/removal remains approval-based through change requests. |
| Change Requests | Live, persisted | Existing dynamic validation, upload references, request history and withdrawal retained; review updates notifications and beneficiary records. |
| Distribution Receipts | Live, persisted | Lists completed distribution rows and supports viewing/printing the database receipt and SHA-256 digest. IPFS is reported only when present. |
| Record Integrity | Evidence-backed | Shows actual document audit evidence and marks records unverified where an integrity anchor/check is unavailable. |
| Notifications | Live, persisted | Loads the beneficiary inbox and persists read/read-all state. |
| My Profile | Live, own-account scoped | Reads the authenticated user's stored profile and directs protected changes through requests. |
| Account Settings | Live, authenticated | Validates current/new password and persists password changes. Session logout remains the existing stateless JWT/client logout flow. |

### Shared and database implementation

- Added SQLAlchemy records for family members, entitlement rules, FPS stock, distributions, notifications, settings, risk alerts, verification history, and grievances. Schema bootstrap creates these tables and applies additive columns to existing user tables without dropping existing records.
- Added role-protected FastAPI portal routes and same-origin Next.js proxy routes. Officer operations use persisted officer assignments; beneficiaries are restricted to their own resources.
- Replaced the global beneficiary search mock with the administrator directory or authenticated officer's assigned list. Other roles cannot enumerate beneficiaries through this search.
- Removed the unused in-memory/synthetic beneficiary service; its grievance API now writes records and notifications to the application database.
- SOC Analyst pages, services, and routes were not changed by this implementation.

### Verification run

- Frontend `npx tsc --noEmit`: passed after the final implementation changes.
- Frontend Jest: 2 suites / 13 tests passed after the final implementation changes.
- Backend `compileall` and importing both portal/request routers: passed.
- Full backend pytest did not complete in this environment; the process stalled during the suite's autouse database fixture and had to be stopped, so no backend test pass is claimed.
- Production Next build did not complete: filesystem `EPERM` prevented creation of nested directories under both the default `.next` output and a separate `.next-codex-verify` output. This is an environment/build-output limitation; no TypeScript error was reported. The Next config now permits selecting a separate output directory through `PDSW_NEXT_DIST_DIR` for environments where the default path is locked.

## Initial implementation plan (completed where the status above reports it)

1. Preserve working authentication, assignment isolation, request review, IPFS audit, and UI design.
2. Replace fabricated/local fallback data with explicit API-backed empty/error states.
3. Add persistent domain models and role-scoped endpoints for missing workflows, then connect pages.
4. Add tests for success, validation, authorization/isolation, duplicate submissions, persistence, and empty records where the existing test setup permits.
5. Run frontend typecheck/build and backend compile/tests; report environment-blocked checks explicitly.

## Known baseline limitations

- No end-to-end real-world commodity distribution or inventory persistence exists at baseline.
- Most new portal domain workflows require a data model and API implementation, not just page changes.
- Existing local backup files in the repository root are user data and must remain untouched and unstaged.
