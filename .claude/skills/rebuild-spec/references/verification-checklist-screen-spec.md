# Verification Checklist: ScreenSpec (SS.2)
See verification-checklist-universal.md for Universal rules and Pending Marker Rule.

### ScreenSpec

**Applies when:** `--screen-specs` standalone pass. ScreenSpec files at `docs/screens/SCR###_Name/spec.md`.

**Required sections:** `# {SCR###_Name} — Screen Spec` header → `## Purpose` → `## Screen Layout` (with `### Layout Regions` sub-table) → `## Child Routes` (H6 shell only) → `## User Flow` → `## Data Inventory` → `## UI States` → `## Validation & Error Feedback` → `## Interaction Patterns` → `## Accessibility` → `## Conditional Rendering` → `## Component Variants` (optional; when omitted, `## Security Surface` follows directly after `## Conditional Rendering`) → `## Security Surface` → `## Source References`

**Scope boundary (enforced):** ScreenSpec = UI-layer only. No FR/BR/SM/ALG/INT/SC codes. No business logic. No server-side validation rules. Reviewer flags any business logic content as critical.

**Severity policy (rows 1–7: `warning` during initial release, promotes to `critical` at stable; rows 8–14: gap-fix rules Round 1 — CRITICAL immediately; rows 15–18: `warning` during initial release; rows 19–24: gap-fix rules Round 2 — `warning` immediately, promotes to `critical` at stable; rows 25–33: gap-fix rules Round 3 (audience expansion: Designer/PM + FE dev + QA) — rows 25 and 32 (`## User Flow` absent, `## Data Inventory` absent) are `critical` immediately; rows 26–31, 33 are `warning` immediately, promotes to `critical` at stable):**

| Rule | Severity |
|------|----------|
| SCR### code in header does not exist in ScreenList | warning |
| All sections are N/A (no content populated at all) | warning (flag for re-examination) |
| Business logic or FR/BR/SM/ALG/INT/SC codes present | warning (scope violation — promoted to critical after stable release) |
| `## Source References` missing or empty | warning |
| Required section absent | warning |
| N/A written without source file scan evidence | warning |
| Validation rules documented that are server-side only (no client-side enforcement found in code) | warning |
| `## Screen Layout` section absent | critical |
| `## Screen Layout` is bare N/A (layout always documentable) | critical |
| `## UI States` lacks ≥1 error row when screen has async calls | critical |
| `## UI States` lacks ≥1 empty row when screen renders data lists/blocks | critical |
| Legacy section name `## Form Validation Rules` present | critical |
| `## Validation & Error Feedback` missing Section B per-action block(s) when screen has submit-style actions | critical |
| `## Interaction Patterns` entry uses implementation-first format | critical |
| `## Accessibility` uses bare `N/A` instead of 4-row audit table | warning |
| `## Component Variants` appears for screen with no shared polymorphic components | warning |
| `## Component Variants` restates DEC/DISC business rules instead of cross-referencing | warning |
| `[UNVERIFIED]` marker used without best-effort description | warning |
| `## Purpose` section absent | warning |
| `## Purpose` content is technical (references component names, store names, or code internals) | warning |
| Conditional Rendering `auth`-type row has no Notes entry stating consequence of bypass | warning |
| Conditional Rendering row with hardcoded numeric/string literal lacks `[NEEDS_DOMAIN_CONFIRMATION]` in Notes | warning |
| `## Security Surface` absent when Conditional Rendering has ≥1 `auth`-type row OR router config guard confirmed for this screen's route | warning |
| `(not read — referenced by import)` entry in Source References with no corresponding Unresolved Question | warning |
| `## User Flow` section absent | critical |
| `## User Flow` Happy Path has 0 numbered steps AND Branches table absent/empty (no content at all) | warning |
| `## User Flow` documents cross-screen navigation (router.push to other SCR###) instead of within-screen interactions | warning |
| `## User Flow` written as Mermaid diagram instead of numbered prose + Branches table | warning |
| `### Layout Sketch` ASCII box diagram absent under `## Screen Layout` | warning |
| `### Layout Regions` sub-table absent under `## Screen Layout` | warning |
| `### Layout Regions` has fewer than 2 rows | warning |
| `## Data Inventory` section absent | critical |
| `## Data Inventory` row missing Cross-ref column entry when field name matches an entity attribute in data-model.md (copy-instead-of-reference smell) | warning |

**Rows 34–36 (H6 Shell rules — `warning` immediately):**

| Rule | Severity |
|------|----------|
| `## Child Routes` section absent on H6 shell screen (screen tagged `[H6]` in screen-list.md or outlet pattern detected) | warning |
| `## Child Routes` table has 0 data rows on H6 shell screen | warning |
| `## UI States` on H6 shell screen documents child-screen states (forms, data tables, or API calls belonging to child SCR) instead of shell-level only | warning |

**Cross-refs:**
- `## Child Routes` SCR### codes must exist in ScreenList index; URL patterns must match route config
- SCR### in header MUST exist in ScreenList main index
- Source citations MUST reference real files (reviewer spot-checks 1–2 per spec)
- DataModel `## Discriminator Fields` for Component Variants cross-refs; FeatureSpec § Polymorphic Behavior when present.
- `## Security Surface` guard types cross-reference Conditional Rendering `auth`-type rows — must be consistent.
- `## Purpose` must not contradict screen's SCR### entry in ScreenList (same user persona / goal).
- `## Data Inventory` Cross-ref entries pointing to MODEL### must exist in data-model.md; bare entity attribute name without MODEL### prefix is acceptable only when entity is not yet documented (reviewer notes [validator-absent] in report)
- `## User Flow` terminal step cross-ref to screen-flow.md is **advisory only** (`[WARN_ADVISORY]`): if screen-flow.md is already in context, spot-check alignment; do NOT load screen-flow.md solely for this check
- `### Layout Regions` Key Components column entries must appear in Source References file list OR be CSS class names / template partials documented elsewhere
- `[UNVERIFIED]` in User Flow Branches / Data Inventory Format / Layout Regions Responsive Behavior columns is acceptable when accompanied by best-effort description ("[UNVERIFIED] currency format — needs runtime confirmation"); bare `[UNVERIFIED]` → warning

**N/A handling for new sections (rows 25–33):**

| Section | Valid N/A string | Reviewer action when N/A used |
|---------|------------------|-------------------------------|
| User Flow | `N/A — single-action screen, no branches` | Verify screen has exactly 1 CTA and no `currentStep`/conditional render in Source References files. If multiple CTAs or branches found → flag warning. |
| Layout Sketch | None — always required | Always flag if absent. Even a single-box sketch is acceptable for trivial screens. |
| Layout Regions | None — always required | Always flag if absent. |
| Data Inventory | `N/A — screen displays no dynamic data (static marketing/error page)` | Verify Source References files contain zero bindings/interpolations. If bindings found → flag warning. |

Lazy N/A (writing N/A without scanning source) → warning, regardless of section.

#### W7c — SM `kind` field present and valid
**Check:** Every SM-### block has `**kind:**` as the first metadata line.
**Pass:** `kind` value is `entity` or `ui` for all SM blocks.
**Fail evidence:** SM-### block missing `**kind:**` line, OR `kind` value is anything other than `entity`/`ui`.
**N/A:** Feature has no state machines (SM section is empty or absent).

#### W7d — behavior-logic.md Client-Side Logic section populated
**Check:** `behavior-logic.md` contains a `## Client-Side Logic` section.
**Pass:** At least one subsection has content (not all N/A) — OR — all subsections are N/A with confirmation note that codebase has no client-side code.
**Fail evidence:** `## Client-Side Logic` section absent; OR subsection shows N/A but code evidence of the pattern exists (reviewer must cite file:line).
**N/A:** Feature is backend/server-only with no client-side code (reviewer must state this explicitly).

#### W7e — permissions.md captures client-side gates
**Check:** `permissions.md` includes entries for any feature-flag / experiment / env-gate / locale-gate found in code for this feature.
**Pass:** All gates found in code appear in permissions.md — OR — `N/A — no {type} gates detected.` with confirmation.
**Fail evidence:** Gate function call found in code (cite file:line) but not listed in permissions.md.
**N/A:** Reviewer confirms no gate patterns present in feature's code surface.

#### W7f — screen-flow.md has Guard Logic / Deep-Link / Unsaved-Changes sections
**Check:** `screen-flow.md` contains the 3 new sections.
**Pass:** Each section either has entries OR an explicit N/A statement confirmed by code review.
**Fail evidence:** Section absent entirely; OR N/A written without reviewer confirming code absence (lazy N/A).
**N/A:** Not applicable for this feature (e.g., feature has no screens).

#### W7g — Client behavior anchor present in every feature-spec
**Check:** `## Cross-Cutting Logic` in `spec.md` contains the `**Client behavior:**` anchor block.
**Pass:** Anchor block present with all 3 relative links.
**Fail evidence:** Anchor absent, or only 1–2 of the 3 links present.
**N/A:** Never — this anchor is mandatory regardless of N/A content in the linked files.

#### W7h — DEC-### Coverage (Semantic)

**Applies to:** each feature spec (run after `validate_feature_spec.py` passes structural check).

**Pass criteria:**
- `## Cross-Cutting Logic > ### Decision Logic` section present (structural — pre-checked by validator)
- For each DEC-###:
  - `subtype:` declaration matches outcome (e.g. `flow` subtype requires navigation/step in `user_visible_outcome`)
  - `user_visible_outcome` is genuine business outcome (not "spinner shows" / "loading toggle" / dispatch wrapper)
  - Pseudocode matches Source at cited lines (reviewer cross-checks by reading source)
  - No anti-example patterns captured (loading toggle, generic dispatch, debounce/throttle, i18n routing, cache mechanic)
- For N/A: validator already confirmed no JSX-ternary hits in involved files; reviewer scans for non-JSX branches if applicable

**Fail evidence:**
- subtype `flow` declared but pseudocode contains no navigation → mismatch
- `user_visible_outcome` is "spinner appears" → plumbing leakage, fail
- Pseudocode references variables not in cited Source range → hallucination
- Anti-example pattern detected (e.g. `if isLoading → show <Spinner/>`) → fail

**Subtype routing for evidence-check:**
- `render` → reviewer reads component render tree at Source
- `interaction` → reviewer reads event handler body at Source
- `flow` → reviewer reads navigation/step-advance code at Source (can be saga, controller, route, anywhere — Source location agnostic)

**Fail evidence:**
- DEC pseudocode with single predicate (no AND/OR/multi-condition) and subtype `render` → warning: "consider expressing as DISC or Business Rule"

**Cross-link:** When validator catches single-field condition in a DEC, reviewer suggests moving to DISC. See W7a (DISC boolean — data-model.md).


## Composite Detection Rules

Rules fire unconditionally on every pipeline invocation. No opt-in flag.

- [ ] **H4 short-circuit respected (tabs only):** mutually-exclusive tab content (per-stack tab signals in `composite-screen-detection.md § H4`) → SCR variants (SCR###a/b), not REG. Hard rule; overrides all other heuristics for tab-style screens. Reviewer selects signals from the row matching the task's `Detected stack:` value.
- [ ] **H5 wizard/stepper classification:** screens with wizard/stepper signals (per-stack signals in `composite-screen-detection.md § H5`) MUST cite classification evidence in spec. Case A (SCR variants) requires explicit citation of distinct validation rules AND distinct API endpoints AND distinct user action per step. Case A without cited evidence → warning (researcher should re-evaluate as Case B). 2-step wizards defaulting to Case A → critical (must be Case B). ≥3-step wizards default to Case B (composite SCR + step REGs).
- [ ] **H3 region count excludes H4/H5 signals:** tab signals (H4) and wizard/stepper signals (H5) — per per-stack tables in `composite-screen-detection.md § H4` and `§ H5` — MUST NOT count toward H3 (any stack).
- [ ] **H2 module count uses per-stack include/exclude tables:** only domain/feature module imports count toward H2; UI-library and framework-primitive imports are excluded. Reviewer applies the include/exclude row matching the task's `Detected stack:` value — see per-stack tables in `composite-screen-detection.md § H2`.
- [ ] **2-of-3 signal gate applied:** composites cite which 2 signals passed (H1∧H2, H1∧H3, or H2∧H3). Screens not meeting gate → emit bare SCR###.
- [ ] **Raw-div fallback noted when H3=0:** if H3 yields 0, gate uses H1+H2 only. If both H1 and H2 also fail → emit atomic + warning. Known Detection Limitation documented in spec output.
- [ ] **FeatureList composite-ref tokenizer (C3):** FeatureList Related Screens tokenizer splits on `,` then on `/`. Left token = SCR### (must exist in ScreenList main index). Right token (if present) = REG### (must exist in that screen's Regions subsection). Both tokens validated independently. Missing REG### under valid SCR### → critical.
- [ ] **Malformed composite ref (M3):** malformed composite refs (`SCR001REG001` missing `/`, `SCR001/` missing REG, `SCR/REG001` missing digits, `SCR001/REG` missing digits) → critical. Regex: `^SCR\d{3}_\w+(/REG\d{3}_\w+)?$` must match.
- [ ] **W1 no-REG rule (M5):** W1 artifacts (SystemOverview, RouteList, DataModel) MUST NOT contain REG### codes. REG### first appears in W2 ScreenList. Orphan REG### in W1 artifact → critical.
- [ ] **Partial-screen ownership (CE3):** each SCR### must have ≥1 F### owning the screen shell (bare SCR### ref in FeatureList Related Screens); each REG### must have ≥1 F### owning it (SCR###/REG### ref). An F### with only SCR###/REG### refs does NOT own the parent SCR.
- [ ] **SIGNAL_INFERRED cap and justification:** `[SIGNAL_INFERRED]` tag in ScreenList Notes signals researcher used `composite-screen-detection.md § Signal Inference Fallback`. Tag MUST cite an H-rule in H2–H6 (H1 has no signal table — inference invalid for H1). Each occurrence MUST carry a 3-part justification (Intent matched / No-row reason / Observed pattern). Missing any part → critical. Count `[SIGNAL_INFERRED]` occurrences across the entire ScreenList document; threshold = `max(5, ceil(0.10 × SCR_count))` — exceeding triggers warning (over-reliance on inference; per-stack tables likely outdated or stack uncovered).


## Failure Trap Assertions

- **Trap 1 (proliferation):** every REG has ≥1 independence signal, drawn from: distinct API endpoint (read or write), independent loading state, independent scroll container, independent auth / permission gate, distinct business workflow, distinct mutation surface / API cluster (distinct write endpoints or POST/PUT/DELETE namespace — even if the initial GET payload is shared), distinct validation / action path. Missing signal → critical. Visual separation alone is NOT sufficient.
- **Trap 2 (tab/stepper misclassification):** mutually-exclusive tab content declared as REG (not SCR variants) → critical. Wizard/stepper content: Case A emitted without cited distinct-validation + distinct-endpoint evidence → warning (prompt researcher to re-evaluate as Case B). 2-step wizard emitted as Case A → critical.
- **Trap 3 (shared data):** collapse two REG candidates into one Feature ONLY when they share ALL of: read surface (same GET endpoint/store) AND write surface (same mutations) AND business workflow. Shared initial payload alone does NOT disqualify a split — if regions diverge on write endpoints, validation rules, action paths, or business workflow, they remain separate. Researcher self-check advisory (NOT reviewer-enforceable critical — reviewer cannot inspect codebase at review time).
- **Trap 4 (LOC-based over-split):** LOC is NOT a composite signal. H3 uses named wrapper components only. Advisory note: flag any ScreenList entry where the researcher's justification cites line count rather than named wrappers or import count.
- **Trap 5 (spec orphan):** every REG### in ScreenList must have an owner annotation (can be `TBD`) → critical if owner annotation missing entirely.
- **Trap 6 (inferred-signal abuse):** `[SIGNAL_INFERRED]` tag without all 3 justification parts (Intent matched, No-row reason, Observed pattern) → critical. Tag citing H1 (which has no signal table) → critical; H2–H6 only. Tag used to bypass a per-stack row that DOES match the screen's stack/library naming → critical (researcher must use explicit row first). Tag count exceeding `max(5, ceil(0.10 × SCR_count))` across the entire ScreenList document → warning (suggests per-stack tables need updating or stack/library not covered).
