#!/usr/bin/env node
// safety-guard.cjs — PreToolUse self-protect guard.
//
// Single job: an agent must not be able to disarm its own guards by editing the
// installed kit's settings, ignore lists, or guard hook code. The patterns match
// the runtime `.claude/` tree only (dot-claude) — editing the kit SOURCE
// `claude/` during kit development is untouched, and a user's own `.tkm.json`
// config stays writable.
//
// Sensitive-file detection (.env, .pem, .key, credentials, secrets.*,
// service-account keys) is NOT handled here — privacy-block.cjs owns all of it,
// with its proper user-approval flow (APPROVED: prefix / @@PRIVACY_PROMPT@@).
// Duplicating any of it here would re-block the approved retry and kill that
// flow, and would have no approval escape hatch of its own.

// Write targets that would let the agent weaken its own guardrails. Matched as
// substrings so they catch both Edit/Write paths and Bash command strings. Each
// carries the runtime `.claude/` prefix, so editing the kit SOURCE tree
// (`claude/…`, no dot) during kit development is never blocked.
const SELF_PROTECT_PATHS = [
  '.claude/settings.json',
  '.claude/settings.local.json',
  '.claude/.ckignore',
  '.claude/.skignore',
  '.claude/hooks/safety-guard.cjs',
  '.claude/hooks/scout-block.cjs',
  '.claude/hooks/privacy-block.cjs',
  '.claude/hooks/iron-laws-guard.cjs',
  '.claude/hooks/guardrail-realtime.cjs',
  '.claude/hooks/lib/privacy-checker.cjs',
  '.claude/hooks/lib/scout-checker.cjs',
];
const hitsSelfProtect = (s) => SELF_PROTECT_PATHS.some(p => s.includes(p));

const SELF_PROTECT_REASON =
  "Safety Guard: that path is a kit guardrail (settings / ignore list / guard hook). " +
  "Editing it would disarm the protections. If the change is genuinely intended, ask the user to make it manually.";

let input = '';
process.stdin.on('data', d => input += d);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const tool = data.tool_name || '';
    const toolInput = data.tool_input || {};

    const block = (reason) => {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: reason
        }
      }));
      process.exit(0);
    };

    // Only inspect tools that can WRITE to a guardrail file
    if (!['Edit', 'Write', 'MultiEdit', 'Bash'].includes(tool)) {
      process.stdout.write('{}');
      return;
    }

    // For Bash, scan the command string for self-protected paths
    if (tool === 'Bash') {
      const cmd = toolInput.command || '';
      if (hitsSelfProtect(cmd)) {
        return block(SELF_PROTECT_REASON);
      }
      process.stdout.write('{}');
      return;
    }

    // Write tools targeting a guardrail file would disarm the kit — block those.
    const filePath = toolInput.file_path || toolInput.path || '';
    if (hitsSelfProtect(filePath)) {
      return block(SELF_PROTECT_REASON);
    }

    process.stdout.write('{}');
  } catch (e) {
    // Fail open on parse errors — better to allow than to stall the agent
    process.stdout.write('{}');
  }
});
