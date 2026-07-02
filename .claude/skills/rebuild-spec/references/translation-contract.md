# Translation Contract — Prose-Only Translation with Skeleton Preservation

Subagent contract for translating a primary-language artifact into a secondary language.
The skeleton (English structural elements) MUST remain byte-identical; only prose is translated.

## Input

- ONE primary-language artifact (e.g. `docs/<primary>/features/<slug>/business-context.md`)
- Target language code (e.g. `jp`, `vi`, `zh`)
- The artifact carries prose in `primary_lang` + an English skeleton

## Output

- Same file under `docs/<target_lang>/...` with prose translated, skeleton copied verbatim

## Hard Rules (skeleton = NEVER translate)

These elements MUST be copied byte-identical from the primary. Any alteration is a CRITICAL violation caught by `validate_translation_skeleton.py`:

1. **Markdown headings** — `#`, `##`, `###`, etc. lines (full line verbatim)
2. **Code tokens** — `F###`, `US###`, `SCR###`, `BL###`, `PERM###`, `DEC-###`, `DISC-###`, `MODEL###`, `FLOW###`, `REG###`, `INT-###`, `BR-###`, `SM-###`, `ALG-###` (keep inline in translated prose)
3. **Field labels** — `**Linked FR:**`, `**subtype:**`, `**Triggers in:**`, `**Source:**`, etc.
4. **Table-column header rows** — the first row of any markdown table (pipe-delimited)
5. **Table separator rows** — `|---|---|---|` lines
6. **Fenced code blocks** — everything between ``` markers (opener, body, closer)
7. **Frontmatter** — YAML between `---` fences (keys AND values)
8. **File paths** — any backtick-wrapped path (e.g. `src/controllers/UserController.php`)
9. **Status enums** — `PASS`, `FAIL`, `WARN`, `CRITICAL`, `pending`, `completed`, etc.
10. **Inline code** — any backtick-wrapped text

## Prose = TRANSLATE

Everything else is prose and should be translated to the target language:

- Paragraph text / narrative
- Table body cells that are descriptions (NOT header cells, NOT code tokens within cells)
- List-item narrative text
- "Why It Matters" / business-context bodies
- Edge-case scenario descriptions and user-facing message text

## Table Cell Rule

Table header rows (first row) stay English verbatim. Body cells:
- If a cell contains only a code token (e.g. `F001`) → keep verbatim
- If a cell contains narrative text → translate the text, keep any embedded code tokens verbatim
- If a cell contains a file path or enum → keep verbatim

## Ordering

Line/section ordering MUST be identical between primary and mirror. Do NOT reorder, merge, or split sections.

## Quality Gate

After translation, `validate_translation_skeleton.py --primary <src> --mirror <dst>` MUST return exit 0 (PASS). Any skeleton drift → re-translate that file (max 3 retries before escalation).
