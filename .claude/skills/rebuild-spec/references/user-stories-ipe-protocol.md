# User Stories — Interaction Point Enumeration (IPE) Protocol

Loaded by Wave 4 researcher. Run ALL steps BEFORE writing any US###.

## Step 1 — Enumerate interaction points per screen

For each SCR### in ScreenList, scan the screen's source file. List ALL interactive elements:

| Category | Examples |
|----------|---------|
| CTA buttons | Create, Save, Submit, Export, Import, Download, Upload, Send, Approve, Reject |
| Modal/dialog triggers | any btn that opens a modal, dialog, drawer, or bottom sheet |
| Inline row actions | Edit, Delete, View, Clone, Archive, Toggle, Status-change per row |
| Bulk actions | checkbox + bulk Delete/Export/Assign operations |
| Destructive actions | Delete, Remove, Revoke, Deactivate — **ALWAYS** a separate US |
| Form submissions | distinct submit paths with different endpoints |
| Filter/Search panels | complex filter panels with own state + API call |
| Navigation actions | user-initiated link-outs (not passive routing) |

## Step 2 — Write Interaction Inventory table

Fill the **Interaction Inventory** table in `user-stories-template.md` BEFORE writing any US.
One row per interactive element: `Screen | Element | Type | Action | Endpoint`.

**Interaction types:**
- `primary-action` — main CTA on screen (Create, Save, Submit)
- `secondary-action` — supporting action (Export, Filter, View Detail)
- `destructive-action` — irreversible (Delete, Remove, Revoke, Deactivate)
- `navigation` — user-initiated screen transition (not passive routing)
- `system-action` — triggers background/async work (Import, Sync, Send notification)

## Step 3 — One US per interaction (default rule)

Each distinct interaction → its own US###.

**Merge exception** — combine into one US ONLY when ALL 3 hold:
- (a) same actor/role
- (b) same HTTP endpoint (method + path identical)
- (c) same data flow (no conditional branching between the interactions)

If ANY condition fails → separate US.

## Step 4 — Anti-CRUD naming

US title MUST contain exactly ONE action verb.

| Bad (reject) | Good (accept) |
|-------------|--------------|
| "Manage Users" | "Create User", "Edit User Profile", "Delete User Account" |
| "User CRUD" | one US per verb |
| "Create/Edit User" | split into 2 separate US |
| "User Management" | name the specific action |

Template: `As a {ROLE}, I want to {SINGLE-VERB} {object} so that {benefit}.`

## Step 5 — Minimum threshold check

- Screen with N interactions documented → expect **≥N US** (unless merge exception in Step 3 applies)
- Screen with 0 interactions found → emit `[IPE_ZERO]` in US### Notes, flag for researcher review
- At end of artifact, add **Screen→US Map**: `SCR### → US001, US002, US003`
