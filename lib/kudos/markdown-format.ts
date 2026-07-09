/**
 * Pure text transforms for the compose editor toolbar (F006). Given the current
 * textarea value + selection and a format action, returns the new value and the
 * selection to restore. No DOM — unit-testable with zero mocks (NFR1). The
 * editor component owns the textarea ref and applies the result.
 */
/** Markdown actions the compose toolbar can request. Lives in the lib layer so
 * both the pure formatter (here) and the UI toolbar depend on it in the
 * conventional direction (app → lib), not the reverse. */
export type ComposeFormatAction =
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'numbered-list'
  | 'link'
  | 'quote';

export interface FormatResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

/** Wraps the selection with a symmetric marker (bold/italic/strike). */
function wrap(text: string, start: number, end: number, marker: string, placeholder: string): FormatResult {
  const selected = text.slice(start, end) || placeholder;
  const next = text.slice(0, start) + marker + selected + marker + text.slice(end);
  return { value: next, selectionStart: start + marker.length, selectionEnd: start + marker.length + selected.length };
}

/** Prefixes each selected line — `> ` for quotes, `N. ` for an ordered list. */
function prefixLines(
  text: string,
  start: number,
  end: number,
  makePrefix: (index: number) => string,
): FormatResult {
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = text.indexOf('\n', end) === -1 ? text.length : text.indexOf('\n', end);
  const block = text.slice(lineStart, lineEnd);
  const prefixed = block
    .split('\n')
    .map((line, i) => makePrefix(i) + line)
    .join('\n');
  const next = text.slice(0, lineStart) + prefixed + text.slice(lineEnd);
  return { value: next, selectionStart: lineStart, selectionEnd: lineStart + prefixed.length };
}

/**
 * Applies a markdown format action at the given selection. `url` is used only
 * by the `link` action; a blank url falls back to a placeholder so the markdown
 * stays well-formed.
 */
export function applyMarkdownFormat(
  text: string,
  start: number,
  end: number,
  action: ComposeFormatAction,
  url?: string,
): FormatResult {
  switch (action) {
    case 'bold':
      return wrap(text, start, end, '**', 'in đậm');
    case 'italic':
      return wrap(text, start, end, '*', 'in nghiêng');
    case 'strikethrough':
      return wrap(text, start, end, '~~', 'gạch ngang');
    case 'quote':
      return prefixLines(text, start, end, () => '> ');
    case 'numbered-list':
      return prefixLines(text, start, end, (i) => `${i + 1}. `);
    case 'link': {
      const label = text.slice(start, end) || 'liên kết';
      const href = (url ?? '').trim() || 'https://';
      const next = text.slice(0, start) + `[${label}](${href})` + text.slice(end);
      const cursor = start + `[${label}](${href})`.length;
      return { value: next, selectionStart: cursor, selectionEnd: cursor };
    }
    default:
      return { value: text, selectionStart: start, selectionEnd: end };
  }
}
