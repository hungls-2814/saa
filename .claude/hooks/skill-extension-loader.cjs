#!/usr/bin/env node
/**
 * skill-extension-loader — PreToolUse / Skill hook. Forge stage (skill activation).
 *
 * When a skill fires, loads user-owned extension files from
 * .claude/skills/<dir>/extensions/*.md and injects them before the skill runs.
 * Extensions live outside the kit release manifest, so the installer treats
 * them as user-owned and preserves them across kit updates.
 *
 * Extension frontmatter contract:
 *   extends: tkm:<skill-name>   (must match the activated skill)
 *   type: pre | post | override:<section-heading>
 *
 * Injection order: pre → override → post. Total payload capped at MAX_INJECT_CHARS;
 * oversize extensions degrade to a one-line reference so the agent reads them
 * on demand rather than bloating the context window.
 * Fail-open: any error allows the Skill call through untouched.
 */

// Crash wrapper
try {
  const fs = require('fs');
  const path = require('path');
  const { isHookEnabled } = require('./lib/tkm-config-utils.cjs');
  const { createHookTimer, logHookCrash } = require('./lib/hook-logger.cjs');

  if (!isHookEnabled('skill-extension-loader')) {
    process.exit(0);
  }

  const MAX_INJECT_CHARS = 4096; // beyond this, list files rather than inlining
  const TYPE_ORDER = { pre: 0, override: 1, post: 2 };

  /** Strip namespace prefix: "tkm:review-code" → "review-code" */
  function skillDirCandidate(skillName) {
    const idx = skillName.lastIndexOf(':');
    return idx >= 0 ? skillName.slice(idx + 1) : skillName;
  }

  /** Parse YAML-lite frontmatter. Returns {fields, body} or null if absent. */
  function parseFrontmatter(content) {
    const normalized = content.replace(/\r\n/g, '\n');
    if (!normalized.startsWith('---\n')) return null;
    const end = normalized.indexOf('\n---', 4);
    if (end < 0) return null;
    const fields = {};
    for (const line of normalized.slice(4, end).split('\n')) {
      const m = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
      if (m) fields[m[1].toLowerCase()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
    // Closing --- with no trailing newline must not leak into body
    const nlAfterClose = normalized.indexOf('\n', end + 4);
    const body = nlAfterClose < 0 ? '' : normalized.slice(nlAfterClose + 1).trim();
    return { fields, body };
  }

  /** True when extendsField targets skillName, with or without the tkm: prefix. */
  function extendsMatches(extendsField, skillName) {
    if (!extendsField) return false;
    return (
      extendsField === skillName ||
      skillDirCandidate(extendsField) === skillDirCandidate(skillName)
    );
  }

  /** Normalize type field: pre | post | override:<section>. Returns null if invalid. */
  function parseType(typeField) {
    if (typeField === 'pre' || typeField === 'post') return typeField;
    if (/^override:.+$/.test(typeField || '')) return 'override';
    return null;
  }

  let input = '';
  process.stdin.on('data', (d) => (input += d));
  process.stdin.on('end', () => {
    const timer = createHookTimer('skill-extension-loader', { event: 'PreToolUse', tool: 'Skill' });
    try {
      const data = JSON.parse(input || '{}');
      const skillName = (data.tool_input && data.tool_input.skill) || '';
      if ((data.tool_name && data.tool_name !== 'Skill') || !skillName) {
        timer.end({ status: 'ok', note: 'not a skill call' });
        process.stdout.write('{}');
        return;
      }

      const cwd = data.cwd || process.cwd();
      // Path-traversal guard: a crafted skill name with "../" must not escape .claude/skills/
      const skillsRoot = path.resolve(cwd, '.claude', 'skills');
      const extDir = path.resolve(skillsRoot, skillDirCandidate(skillName), 'extensions');
      if (!extDir.startsWith(skillsRoot + path.sep)) {
        timer.end({ status: 'ok', target: skillName, note: 'traversal rejected' });
        process.stdout.write('{}');
        return;
      }
      if (!fs.existsSync(extDir)) {
        timer.end({ status: 'ok', target: skillName, note: 'no extensions' });
        process.stdout.write('{}');
        return;
      }

      // Top-level *.md only — evals/ subdir holds benchmark data, never inject it
      const entries = fs
        .readdirSync(extDir, { withFileTypes: true })
        .filter((e) => e.isFile() && e.name.endsWith('.md'))
        .map((e) => e.name)
        .sort();

      const loaded = [];
      const skipped = [];
      for (const name of entries) {
        try {
          const parsed = parseFrontmatter(fs.readFileSync(path.join(extDir, name), 'utf-8'));
          const type = parsed && parseType(parsed.fields.type);
          if (!parsed || !type || !extendsMatches(parsed.fields.extends, skillName)) {
            skipped.push(name);
            continue;
          }
          loaded.push({ name, type, rawType: parsed.fields.type, body: parsed.body });
        } catch (_) {
          skipped.push(name);
        }
      }

      if (loaded.length === 0) {
        timer.end({ status: 'ok', target: skillName, note: `0 valid, ${skipped.length} skipped` });
        process.stdout.write('{}');
        return;
      }

      loaded.sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type]);

      const totalChars = loaded.reduce((sum, x) => sum + x.body.length, 0);
      const relDir = path.relative(cwd, extDir);
      let sections;
      if (totalChars > MAX_INJECT_CHARS) {
        // Oversize: reference files only; agent reads on demand to avoid context bloat
        sections = loaded.map((x) => `- [${x.rawType}] ${relDir}/${x.name} (${x.body.length} chars — read this file and apply it)`);
      } else {
        sections = loaded.map((x) => `### [${x.rawType}] ${x.name}\n${x.body}`);
      }

      const lines = [
        `## Active Extensions for ${skillName} (user-owned, from ${relDir}/)`,
        'Apply these on top of the skill instructions. Order: pre → override → post.',
        ...sections,
      ];
      if (skipped.length > 0) {
        lines.push(`(Skipped invalid extension files: ${skipped.join(', ')} — check frontmatter extends/type.)`);
      }

      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            additionalContext: lines.join('\n\n'),
          },
        })
      );
      timer.end({ status: 'ok', target: skillName, note: `${loaded.length} injected, ${skipped.length} skipped` });
    } catch (error) {
      // Fail-open: extension errors must never block skill activation
      logHookCrash('skill-extension-loader', error, { event: 'PreToolUse', tool: 'Skill' });
      process.stdout.write('{}');
    }
  });
} catch (e) {
  try {
    const { logHookCrash } = require('./lib/hook-logger.cjs');
    logHookCrash('skill-extension-loader', e, { event: 'PreToolUse', tool: 'Skill' });
  } catch (_) {}
  process.stdout.write('{}');
  process.exit(0); // fail-open
}
