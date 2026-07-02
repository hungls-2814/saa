#!/usr/bin/env node
/**
 * Contract test — safety-guard.cjs must emit modern Claude block shape
 * on self-protect paths: hookSpecificOutput.permissionDecision === "deny",
 * with permissionDecisionReason populated and free of emoji prefix.
 * Sensitive-file (.env / credentials / keys) blocking has been consolidated
 * into privacy-block.cjs — see privacy-block-output-shape.test.cjs.
 * Passthrough paths emit empty `{}`. Exit code 0 in all cases (decision
 * is encoded in JSON, not exit code).
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const HOOK_PATH = path.join(__dirname, '..', 'safety-guard.cjs');

function runHook(payload) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [HOOK_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));

    proc.stdin.write(JSON.stringify(payload));
    proc.stdin.end();

    const t = setTimeout(() => {
      if (!settled) {
        settled = true;
        proc.kill('SIGTERM');
        reject(new Error('Hook timed out'));
      }
    }, 1000);

    proc.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(t);
      let parsed = null;
      try { parsed = stdout.trim() ? JSON.parse(stdout.trim()) : null; } catch (_) {}
      resolve({ stdout, stderr, exitCode: code, parsed });
    });
  });
}

describe('safety-guard.cjs — modern Claude block shape', () => {
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'safety-guard-shape-'));
  });

  after(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  });

  it('block: Edit on .claude/settings.json → modern deny shape, exit 0, no emoji in reason', async () => {
    const payload = {
      hook_event_name: 'PreToolUse',
      tool_name: 'Edit',
      tool_input: { file_path: '.claude/settings.json' },
    };
    const { parsed, exitCode } = await runHook(payload);
    assert.strictEqual(exitCode, 0, 'must exit 0 (decision in JSON)');
    assert.ok(parsed && parsed.hookSpecificOutput, 'must emit hookSpecificOutput');
    assert.strictEqual(parsed.hookSpecificOutput.hookEventName, 'PreToolUse');
    assert.strictEqual(parsed.hookSpecificOutput.permissionDecision, 'deny');
    assert.ok(
      parsed.hookSpecificOutput.permissionDecisionReason,
      'must have permissionDecisionReason'
    );
    const reason = parsed.hookSpecificOutput.permissionDecisionReason;
    assert.ok(
      !/[⚠️]/.test(reason.slice(0, 4)),
      `reason must not start with warning emoji: ${JSON.stringify(reason.slice(0, 10))}`
    );
    assert.strictEqual(
      parsed.hookSpecificOutput.decision,
      undefined,
      'must NOT use nested decision field (legacy shape)'
    );
  });

  it('passthrough: Edit on regular file → empty object', async () => {
    const payload = {
      hook_event_name: 'PreToolUse',
      tool_name: 'Edit',
      tool_input: { file_path: path.join(tmpDir, 'main.ts') },
    };
    const { stdout, exitCode } = await runHook(payload);
    assert.strictEqual(exitCode, 0);
    assert.strictEqual(stdout.trim(), '{}', 'passthrough must be empty object');
  });

  it('block: Bash self-protect → modern deny shape', async () => {
    const payload = {
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'cat .claude/settings.json' },
    };
    const { parsed, exitCode } = await runHook(payload);
    assert.strictEqual(exitCode, 0);
    assert.strictEqual(parsed.hookSpecificOutput.permissionDecision, 'deny');
    assert.ok(parsed.hookSpecificOutput.permissionDecisionReason);
  });
});
