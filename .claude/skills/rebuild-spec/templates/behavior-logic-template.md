# Behavior Logic

**Project**: {PROJECT_NAME}
**Generated**: {DATE}
**Analysis Scope**: {SCOPE}

**Code Format**: All codes MUST follow `BL###_NameSlug` format (e.g., BL001_ScheduledReport, BL002_EventListener)

**Behavior Logic Types** (canonical 10 — language-neutral):
- `scheduled-job` — Cron-like scheduled tasks
- `queue-worker` — Background job workers (async queue consumers)
- `event-listener` — Event-driven handlers
- `observer` — Model lifecycle hooks (created/updated/deleted)
- `mail` — Email sending logic
- `notification` — In-app / push notification logic
- `middleware` — Request/response processing chain (non-auth)
- `custom-command` — CLI commands
- `integration` — Third-party integrations (external API clients)
- `webhook` — Incoming/outgoing webhook handlers

**Note**: Auth/permission middleware is NOT included — see Permissions.md

**Note**: Feature and UserStory mapping is managed in FeatureList.md and UserStories.md. This document contains behavior logic items without direct feature/story references.

**Note**: Notification/event/webhook entries SHOULD include `**Payload**` (the async data shape) — this is where async contracts live, since api-contracts.md covers synchronous surfaces only.

---

## Cardinality Contract

Rules enforced by Wave 2b researcher and Wave 7a reviewer. Violations are critical.

- **Rule C1 — 1 BL per inventory entry**: Mode A stacks (folder convention): 1 file = 1 BL. Mode B stacks (annotation/decorator): 1 decorator hit = 1 BL (multiple hits in same file → multiple BL items). Aggregation is a critical violation.
- **Rule C2 — Source fields mandatory, single-valued**: Every BL item MUST include `**Source File**` (one relative path) and `**Source Symbol**` (one symbol — class name for Mode A; `ClassName::method` or `module::function` for Mode B). Multi-symbol forms forbidden in either field — split on `,`, `;`, or whitespace-bounded conjunction (` and `, ` & `, ` + `) and produce separate BL items. `/` is NOT a delimiter here (collides with composite-ref `SCR###/REG###` and path-shaped symbols); `+`/`&` require surrounding whitespace so language tokens like Swift `MyClass+Extension` and reference operators inside symbol names are not aggregated. Both fields must match the scout inventory entry 1-to-1.
- **Rule C3 — Unmatched BL warning**: A BL item whose Source File does not appear in the scout `## Background Logic Source Inventory` → warning; researcher must provide justification in Description (may be a legitimate `[SIGNAL_INFERRED]` case). Unmatched BL with no justification → critical.

---

## Inclusion/Exclusion Matrix (scout-side filter)

> **Precedence:** Applies at Wave 0 scout inventory only. Once an entry reaches `## Background Logic Source Inventory`, **Rule C1 dominates unconditionally** — researcher emits one BL per inventory entry. Scout MUST drop excluded files (e.g., abstract bases in `app/Mail/`) upfront; researcher does not filter post-inventory.

| Include | Exclude |
|---------|---------|
| All files/symbols in scout `## Background Logic Source Inventory` | Abstract base classes, traits, interfaces |
| `[SIGNAL_INFERRED]`-tagged inventory entries (with justification) | Vendor overrides and third-party library subclasses |
| | `*Test.php`, `*Spec.rb`, `test_*.py`, `*.test.ts` and all test files |
| | Files < 10 LOC (scaffolding/stubs) |
| | Auth/ACL/OAuth/JWT middleware (→ Permissions.md) |

**Scout responsibility:** Wave 0 must apply these filters before emitting `## Background Logic Source Inventory`. See `references/pipeline-w0-w5.md` Wave 0 step (5).

---

## Anti-Patterns: Aggregation Forbidden

Aggregating multiple source files into a single BL item violates Rule C1 and will be flagged critical by the reviewer.

- ❌ `BL050_EmailNotifications` — Description: "Covers all 25 Mail classes (WelcomeMail, InvoiceMail, ...)"
- ✅ `BL050_SendWelcomeMail` (Source File: `app/Mail/WelcomeMail.php`) + `BL051_SendInvoiceMail` (Source File: `app/Mail/InvoiceMail.php`) + ...

- ❌ `BL080_AuditLogWorkers` — Description: "Umbrella for 12 audit log job variants"
- ✅ One BL per Job class with individual Source File + Source Symbol fields

- ❌ `BL090_AuditEvents` — Source Symbol: `AuditService::onCreated, AuditService::onUpdated, AuditService::onDeleted` (comma-list forbidden)
- ✅ One BL per symbol: `BL090_AuditOnCreated` / `BL091_AuditOnUpdated` / `BL092_AuditOnDeleted`

---

## Behavior Logic Index

| Code | Name | Type | Trigger |
|------|------|------|---------|
| {BL001_CODE} | {BL001_NAME} | {TYPE} | {TRIGGER} |
| {BL002_CODE} | {BL002_NAME} | {TYPE} | {TRIGGER} |
| {BL003_CODE} | {BL003_NAME} | {TYPE} | {TRIGGER} |

---

{POPULATED_BY_FRAGMENTS}

## {BL001_CODE}: {BL001_NAME}

**Type**: {TYPE}
**Trigger**: {TRIGGER}
**Payload**: {channel/topic + data fields — omit for non-event/non-notification types}
**Source File**: {relative/path/to/SourceFile.ext}
**Source Symbol**: {ClassName | ClassName::methodName | module::function}

### Description

{DESCRIPTION}

### Related Modules

- {MODULE_1}
- {MODULE_2}

### Related Routes

- ({ROUTE_METHOD}) {ROUTE_PATH}

### Related Data Models

- {MODEL_ENTITY}

---

## {BL002_CODE}: {BL002_NAME}

**Type**: {TYPE}
**Trigger**: {TRIGGER}
**Payload**: {channel/topic + data fields — omit for non-event/non-notification types}
**Source File**: {relative/path/to/SourceFile.ext}
**Source Symbol**: {ClassName | ClassName::methodName | module::function}

### Description

{DESCRIPTION}

### Related Modules

- {MODULE_1}

### Related Routes

- ({ROUTE_METHOD}) {ROUTE_PATH}

### Related Data Models

- {MODEL_ENTITY}

---

## {BL003_CODE}: {BL003_NAME}

**Type**: {TYPE}
**Trigger**: {TRIGGER}
**Payload**: {channel/topic + data fields — omit for non-event/non-notification types}
**Source File**: {relative/path/to/SourceFile.ext}
**Source Symbol**: {ClassName | ClassName::methodName | module::function}

### Description

{DESCRIPTION}

### Related Modules

- {MODULE_1}

### Related Routes

- ({ROUTE_METHOD}) {ROUTE_PATH}

---

## Summary

- **Total Behavior Logic Items**: {TOTAL_BEHAVIOR_LOGIC}
- **By Type**: custom-command: {N}, event-listener: {N}, integration: {N}, mail: {N}, middleware: {N}, notification: {N}, observer: {N}, queue-worker: {N}, scheduled-job: {N}, webhook: {N}

---

## Cross-Reference Validation

- [x] All BL### codes are unique
- [x] All BL### codes are referenced in UserStories.md (type=system)
- [x] All BL### codes are referenced in FeatureList.md
- [x] All related route references are valid (ROUTE### in RouteList)
- [x] All related data model references are valid (MODEL### in DataModel)
- [x] No orphaned behavior logic references
- [x] All BL items have Source File + Source Symbol fields (Rule C2)
- [x] All Source File paths match scout Background Logic Source Inventory entries (Rule C2/C3)

---

## Client-Side Logic

Document client-side patterns found in the codebase. For each, record: pattern type, trigger location (file:line), and brief description of what it does.

### Debounce / Throttle

**Extraction signature:** timer wrapper around a handler — `setTimeout`, `clearTimeout`, `debounce(fn, ms)`, `throttle(fn, ms)`, `useDebounce`, `useDebouncedCallback`

**Example:**
```
BL-C01 — SearchInput debounce
pattern: debounce
source: src/components/SearchInput.tsx:34
trigger: user types in search field
delay: 300ms
description: Delays API call until user pauses typing to avoid flooding search endpoint.
```

If no debounce/throttle detected: `N/A — no debounce or throttle patterns detected.`

### Optimistic UI

**Extraction signature:** mutation applied immediately before API response, with rollback on error — `setState` before `await`, undo on catch, `optimisticUpdate`, `useOptimistic`

**Example:**
```
BL-C02 — LikeButton optimistic update
pattern: optimistic-ui
source: src/features/posts/LikeButton.tsx:52
trigger: user clicks Like
optimistic-action: increment like count immediately
rollback: revert count on API error
```

If no optimistic UI detected: `N/A — no optimistic UI patterns detected.`

### Polling

**Extraction signature:** recurring API call — `setInterval`, recursive `setTimeout` calling an API, `usePolling`, `refetchInterval`

**Example:**
```
BL-C03 — OrderStatus polling
pattern: polling
source: src/features/orders/OrderDetail.tsx:88
trigger: order status is "processing"
interval: 5000ms
stops-when: status changes to "completed" or "failed"
```

If no polling detected: `N/A — no polling patterns detected.`

### Upload Progress

**Extraction signature:** file upload with progress tracking — `XHR.upload.onprogress`, `FormData` with `onUploadProgress`, `fetch` streaming, `useUpload`, `onProgress`

**Example:**
```
BL-C04 — FileUpload progress tracking
pattern: upload-progress
source: src/components/FileUpload.tsx:120
trigger: user selects file and submits
progress-field: uploadPercent (0–100)
error-path: shows error toast + resets on network failure
```

If no upload progress detected: `N/A — no upload progress patterns detected.`

### Realtime (WebSocket / SSE / EventSource)

**Extraction signature:** persistent connection to server — `new WebSocket(...)`, `new EventSource(...)`, `useWebSocket`, `subscribe(channel)`, SSE `listen` handler, reconnect logic

**Example:**
```
BL-C05 — ChatRoom WebSocket
pattern: realtime
source: src/features/chat/ChatRoom.tsx:67
trigger: component mounts
channel: /cable/chat-room/{roomId}
reconnect: exponential backoff, max 3 retries
teardown: connection closed on component unmount
```

If no realtime patterns detected: `N/A — no realtime patterns detected.`

<!-- Researcher must also draft docs/system/business-rules.md (plain-language) from this artifact. See templates/business-rules-template.md. -->
