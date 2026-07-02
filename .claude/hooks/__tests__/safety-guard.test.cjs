'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('node:child_process');
const path = require('node:path');

const HOOK = path.join(__dirname, '..', 'safety-guard.cjs');

/** Run the guard with a tool payload; return true when it blocks. */
function blocks(payload) {
  const out = execSync(`node "${HOOK}"`, { input: JSON.stringify(payload), encoding: 'utf8' }) || '{}';
  const parsed = JSON.parse(out);
  return parsed.hookSpecificOutput && parsed.hookSpecificOutput.permissionDecision === 'deny';
}

const editFile = (file_path) => ({ tool_name: 'Edit', tool_input: { file_path } });
const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } });

test('does not block any sensitive file — all delegated to privacy-block', () => {
  assert.ok(!blocks(editFile('.env')));
  assert.ok(!blocks(editFile('.env.local')));
  assert.ok(!blocks(editFile('config/credentials.json')));
  assert.ok(!blocks(editFile('deploy/server.pem')));
  assert.ok(!blocks(editFile('deploy/server.key')));
  assert.ok(!blocks(editFile('config/secrets.yaml')));
  assert.ok(!blocks(editFile('config/secrets.json')));
  assert.ok(!blocks(editFile('config/secrets.toml')));
  assert.ok(!blocks(editFile('gcp/service-account.json')));
  assert.ok(!blocks(editFile('gcp/service_account_key.json')));
});

test('does not hard-block bash access to secrets (privacy-block owns the approval flow)', () => {
  assert.ok(!blocks(bash('cat .env')));
  assert.ok(!blocks(bash('cat APPROVED:.env')));
  assert.ok(!blocks(bash('cat config/secrets.json')));
  assert.ok(!blocks(bash('cat gcp/service-account.json')));
});

test('self-protects the runtime guard tree', () => {
  assert.ok(blocks(editFile('/proj/.claude/settings.json')), 'settings.json');
  assert.ok(blocks(editFile('.claude/.ckignore')), '.ckignore');
  assert.ok(blocks({ tool_name: 'Write', tool_input: { file_path: '.claude/hooks/safety-guard.cjs' } }), 'guard hook');
  assert.ok(blocks({ tool_name: 'MultiEdit', tool_input: { file_path: '.claude/hooks/lib/privacy-checker.cjs' } }), 'checker lib');
});

test('self-protects against Bash tampering', () => {
  assert.ok(blocks(bash('echo {} > .claude/settings.json')));
  assert.ok(blocks(bash('rm .claude/hooks/privacy-block.cjs')));
  assert.ok(blocks(bash('sed -i s/x/y/ .claude/.ckignore')));
});

test('does NOT block editing the kit SOURCE tree (no dot-claude)', () => {
  assert.ok(!blocks(editFile('claude/hooks/safety-guard.cjs')));
  assert.ok(!blocks(editFile('takumi-kit/claude/settings.json')));
});

test('does NOT block a user editing their own .tkm.json config', () => {
  assert.ok(!blocks(editFile('.claude/.tkm.json')));
});

test('allows ordinary source edits and reads', () => {
  assert.ok(!blocks(editFile('src/app.ts')));
  assert.ok(!blocks({ tool_name: 'Read', tool_input: { file_path: '.claude/settings.json' } }));
  assert.ok(!blocks(bash('npm test')));
});

test('fail-open on malformed input', () => {
  const out = execSync(`node "${HOOK}"`, { input: 'not json', encoding: 'utf8' }) || '{}';
  assert.doesNotThrow(() => JSON.parse(out));
  assert.ok(!JSON.parse(out).hookSpecificOutput, 'malformed input must not block');
});
