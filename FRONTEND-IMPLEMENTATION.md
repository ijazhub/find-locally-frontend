# FindLocally frontend and API alignment

## Contract and configuration

The supplied OpenAPI document is checked in as `api.yaml`, unchanged. It retains its supplied Niva metadata; visible frontend branding is FindLocally. Legacy token/city storage keys, project/package names and Docker identifiers remain compatible.

Production uses `src/environments/environment.ts` with `/api/v1`; nginx's upstream configuration determines the deployed backend host. Local development replaces that file with `environment.development.ts`, which calls `http://localhost:8080/api/v1` directly. `npm start` explicitly selects development configuration; no Angular proxy is used. The local backend must allow CORS from `http://localhost:4200`. Business date/time display uses **Asia/Kolkata**, explicitly confirmed by the product owner. API instants are UTC. Money is integer paise; the existing money pipe now respects the response currency.

## Live routes and integrations

| Route | Behavior |
| --- | --- |
| `/login` | Customer/business registration with immutable account type; backend-driven landing after login |
| `/` and `/providers` | Customer discovery; business accounts are sent to their own landing |
| `/providers/:id/profile` | Authenticated business profile with exactly Bio / My Work and Services tabs; owner preview, customer chat/booking, media filters |
| `/providers/:id` | Redirect to the canonical two-tab profile |
| `/book/:providerId` | Active service selection, business-local day/slot display, fulfilment/address, proposed price separate from indicative price, notes/review and idempotent booking request |
| `/bookings` | Customer list with proposed/agreed prices distinguished and links to quotation details |
| `/bookings/:id` | Booking details, current quotation/history, explicit versioned quotation response, permitted cancellation and linked chat |
| `/business/onboarding` | Business-only onboarding; DRAFT/NOT_STARTED/REJECTED editing, SUBMITTED review state, VERIFIED redirect to dashboard |
| `/business/dashboard` | Verified-business dashboard, quotation queue, completed booking values per currency, schedule with pending holds distinguished, existing services and availability editors |
| `/business/profile` | Live profile editor, avatar/cover uploads, photo/video/reel attachment, caption and publication controls, media editing/deletion, processing status and upload progress |
| `/business/bookings/:id` | Provider review, proposal acceptance, quotation issue/revision, decline/completion and linked conversation |
| `/messages/:id` | Existing backend conversation identity, linked booking context, unread indicators and REST polling that pauses when hidden and resumes on visibility/network recovery |
| `/forbidden`, `/session-error` | Wrong-account access and recoverable session-restoration failure |

Account type comes only from `UserProfile.accountType`; deprecated roles and business-profile existence are not used to infer it. Business dashboard routes require VERIFIED onboarding. Guards improve navigation; backend authorization remains authoritative. Useful compatible return URLs are preserved at login. Transient session-restoration failures preserve stored tokens and offer retry; expired sessions continue through the existing refresh/login path.

The `ApiService` boundary now types booking creation, quotation responses, profile/media operations, conversations, availability and dashboard values. Errors use RFC 7807 detail and field messages. Request and quotation retries reuse an idempotency key for the same payload; edited payloads get new keys. Action buttons are disabled while pending. HTTP 409 on negotiation reloads authoritative booking details and preserves useful input.

Only media with both READY processing and PUBLISHED publication state is included in public playback. Uploads go through `/media/uploads`; no browser-to-S3 protocol was invented. Successful upload IDs survive an attach failure so the attach can be retried. Media processing is refreshed while the editor is visible; failures offer the supported delete/re-upload path rather than an invented retry endpoint. Provider profile editing only submits fields supported by BusinessProfileUpdate; owner name/category/city are not silently patched through unsupported fields.

## Remaining contract decisions and limits

- **`allowedActions` values remain unspecified.** The schema uses unconstrained strings and contains no examples. The frontend conservatively recognizes exact OpenAPI operation IDs: `acceptBooking`, `declineBooking`, `completeBooking`, `cancelBooking`, `issueQuotation`, `respondToQuotation`. These are the operation mappings the client supports, not a claim that the backend currently returns them. Unrecognized strings never enable an action, and the detail screen explains that case. Confirm a real response or add an enum before treating negotiation as end-to-end verified.
- QuotationInput supports **price only**. The live UI does not send mock quotation notes or a chosen expiry; the backend sets expiry. QuotationResponse sends quotationId, version, decision and optional reason. The server decides the resulting rejection status.
- No pre-booking slot-reservation API is specified. Live booking uses server availability and handles creation conflicts; it does not fabricate a five-minute server hold. Hold expiry/deadlines are displayed from returned Booking fields.
- The backend spec has no per-business timezone field. The confirmed platform timezone is centralized in environment configuration. Add a business timezone field before supporting businesses in other timezones.
- Media caption/transcript tracks and server-side processing retry are absent from the spec. Playback uses native accessible controls and caption text; timed captions cannot be wired from the current schema.
- Live server responses, backend authorization and actual storage processing have not been exercised against a running backend in this task. HTTP contract tests use Angular's testing backend. Interactive visual/mobile screenshot QA was unavailable in the installed browser tooling.
- Existing list screens still use their original fixed first page; profile/media libraries support additional pages. Full booking/conversation list pagination remains follow-up work.

## Isolated review fixtures

`/preview` remains a clearly marked synthetic screen review area. Separate customer/provider sample accounts, all seven booking statuses and negotiation scenarios are implemented in `PreviewStore` and never enter `ApiService`. Refresh resets fixture state. The preview's local upload simulation, editable quote expiry/notes and five-minute selection hold are design examples, not live API capabilities.

Run `npm.cmd start` in PowerShell (or `npm start` in other shells). Use live login for integrated screens and `/preview` for backend-independent review. No deployment has been performed.

## Verification

Final local verification: production build passed; all **50 Jasmine tests** passed in ChromeHeadless. `git diff --check` passed. The saved `api.yaml` SHA-256 matches the supplied attachment exactly. Production warnings remain for the approximately 554 kB initial bundle and 5.8 kB preview component CSS.

Angular development build and headless Chrome regression tests cover account-type routing, verified onboarding, forbidden access, transient restoration errors, quotation payloads/version acceptance, 409 refresh, retry key reuse, no actions inferred from status, media attach payloads and Kolkata date boundaries, alongside existing authentication/password recovery tests and isolated preview flow tests. Production build warnings for initial bundle size and preview CSS remain below error budgets. See the final implementation report for the latest test count/build result.
