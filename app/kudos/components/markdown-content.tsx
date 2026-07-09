import { Fragment, type ReactNode } from "react";

/**
 * Minimal, dependency-free markdown renderer for Kudos content (F006). Kudos
 * bodies are authored with the compose toolbar (bold/italic/strike/link/quote/
 * numbered-list) + `@mention`, stored as markdown, and rendered here inside the
 * board card's line-clamp. Deliberately INLINE-only (no block elements) so the
 * existing `line-clamp-3/5` truncation keeps working — list/quote markers are
 * rendered as styled inline prefixes rather than real <ul>/<blockquote> blocks.
 *
 * Non-nested by design (KISS): one delimiter level per span. That covers real
 * kudos content without a full markdown engine.
 */

type Segment =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "strike"; value: string }
  | { type: "mention"; value: string }
  | { type: "link"; value: string; href: string };

// Ordered by precedence; the earliest match in the string wins each pass.
const INLINE_RULES: { type: Segment["type"]; re: RegExp }[] = [
  { type: "link", re: /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/ },
  { type: "bold", re: /\*\*([^*]+)\*\*/ },
  { type: "strike", re: /~~([^~]+)~~/ },
  { type: "italic", re: /(?:\*([^*]+)\*|_([^_]+)_)/ },
  { type: "mention", re: /@([\p{L}][\p{L}\p{M}.]*(?:\s[\p{L}][\p{L}\p{M}.]*){0,3})/u },
];

/** Tokenizes one line of inline markdown into styled segments (pure, testable). */
export function parseInline(line: string): Segment[] {
  const segments: Segment[] = [];
  let rest = line;

  while (rest.length > 0) {
    let best: { index: number; length: number; seg: Segment } | null = null;
    for (const rule of INLINE_RULES) {
      const m = rule.re.exec(rest);
      if (!m) continue;
      if (best && m.index >= best.index) continue;
      const value = m[1] ?? m[2] ?? "";
      const seg: Segment =
        rule.type === "link"
          ? { type: "link", value: m[1], href: m[2] }
          : { type: rule.type, value } as Segment;
      best = { index: m.index, length: m[0].length, seg };
    }

    if (!best) {
      segments.push({ type: "text", value: rest });
      break;
    }
    if (best.index > 0) segments.push({ type: "text", value: rest.slice(0, best.index) });
    segments.push(best.seg);
    rest = rest.slice(best.index + best.length);
  }

  return segments;
}

function renderSegment(seg: Segment, key: number): ReactNode {
  switch (seg.type) {
    case "bold":
      return <strong key={key} className="font-extrabold">{seg.value}</strong>;
    case "italic":
      return <em key={key}>{seg.value}</em>;
    case "strike":
      return <del key={key}>{seg.value}</del>;
    case "mention":
      return <span key={key} className="font-bold text-[#D4271D]">@{seg.value}</span>;
    case "link":
      return (
        <a key={key} href={seg.href} target="_blank" rel="noreferrer noopener" className="text-[#D4271D] underline">
          {seg.value}
        </a>
      );
    default:
      return <Fragment key={key}>{seg.value}</Fragment>;
  }
}

/** Strips a leading block marker (quote `> `, bullet `- `, ordered `N. `) and flags its kind. */
function lineKind(line: string): { kind: "quote" | "ordered" | "bullet" | "plain"; body: string; marker?: string } {
  if (/^>\s?/.test(line)) return { kind: "quote", body: line.replace(/^>\s?/, "") };
  const ordered = /^(\d+)\.\s+/.exec(line);
  if (ordered) return { kind: "ordered", body: line.slice(ordered[0].length), marker: `${ordered[1]}. ` };
  if (/^[-*]\s+/.test(line)) return { kind: "bullet", body: line.replace(/^[-*]\s+/, ""), marker: "• " };
  return { kind: "plain", body: line };
}

export interface MarkdownContentProps {
  content: string;
  className?: string;
}

/** Renders markdown kudos content as inline-formatted lines within a clamped block. */
export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const lines = content.split(/\r?\n/);
  return (
    <p className={className}>
      {lines.map((line, i) => {
        const { kind, body, marker } = lineKind(line);
        const inline = parseInline(body).map(renderSegment);
        return (
          <Fragment key={i}>
            {i > 0 && <br />}
            {kind === "quote" ? (
              <em className="text-[#00101A]/80">“{inline}”</em>
            ) : (
              <>
                {marker && <span className="font-bold">{marker}</span>}
                {inline}
              </>
            )}
          </Fragment>
        );
      })}
    </p>
  );
}
