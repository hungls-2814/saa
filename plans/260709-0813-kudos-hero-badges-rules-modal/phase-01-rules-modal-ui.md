# Phase 01 (Track A) — Thể lệ (Rules) Modal UI

**Status:** ✓ COMPLETE (2026-07-09)

**Goal:** Presentational Rules modal, pixel-perfect from MoMorph, no backend.

**Screen refs**
- Thể lệ UPDATE: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/b1Filzi9i6
- Clarifications: `plans/260709-0813-kudos-hero-badges-rules-modal/clarifications.md`

**Deliverable:** `app/(home)/components/saa-rules-modal.tsx` (+ subcomponents if > 200 lines).
Props: `{ isOpen: boolean; onClose: () => void; onWriteKudos: () => void }`.

**Integration contract**
- Renders null when `!isOpen`; dialog role, Esc + backdrop close → `onClose`.
- Footer "Đóng" → `onClose`; "Viết KUDOS" → `onWriteKudos`.
- Content static from design (3 sections + 4 hero badges + 6 icons). Assets in
  `public/kudos/badges/`. All copy extracted from the design (no invented data).

**Out of scope:** FAB wiring, hero-badge derivation, backend, i18n plumbing (hardcode vi copy
matching design; integration phase moves strings to `Rules` namespace).
