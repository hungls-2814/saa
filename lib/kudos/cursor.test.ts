import { describe, it, expect } from 'vitest';
import { encodeCursor, decodeCursor } from './cursor';

const VALID = { createdAt: '2026-07-06T10:00:00.000Z', id: '3f9e1a2b-4c5d-4e6f-8a9b-0c1d2e3f4a5b' };

describe('encodeCursor / decodeCursor', () => {
  it('round-trips a valid cursor', () => {
    const encoded = encodeCursor(VALID);
    expect(decodeCursor(encoded)).toEqual(VALID);
  });

  it('returns null for a null/undefined/empty cursor (page 1)', () => {
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor('')).toBeNull();
  });

  it('returns null for non-base64 garbage without throwing', () => {
    expect(() => decodeCursor('not-base64-json!!!')).not.toThrow();
    expect(decodeCursor('not-base64-json!!!')).toBeNull();
  });

  it('returns null when base64 decodes to invalid JSON', () => {
    const garbage = Buffer.from('{not json', 'utf-8').toString('base64');
    expect(decodeCursor(garbage)).toBeNull();
  });

  it('returns null when id is not a valid UUID (tampered)', () => {
    const tampered = Buffer.from(
      JSON.stringify({ createdAt: VALID.createdAt, id: "'; drop table kudos; --" }),
      'utf-8',
    ).toString('base64');
    expect(decodeCursor(tampered)).toBeNull();
  });

  it('returns null when createdAt is not a valid ISO timestamp', () => {
    const tampered = Buffer.from(
      JSON.stringify({ createdAt: 'not-a-date', id: VALID.id }),
      'utf-8',
    ).toString('base64');
    expect(decodeCursor(tampered)).toBeNull();
  });

  it('returns null for an RFC-2822 date string that Date.parse would accept (comma injection)', () => {
    // `Date.parse` accepts "Sat, 03 Feb 2001 04:05:06 GMT"; the literal comma
    // would inject an extra clause into the PostgREST `.or()` predicate. The
    // strict ISO regex must reject it.
    const injected = Buffer.from(
      JSON.stringify({ createdAt: 'Sat, 03 Feb 2001 04:05:06 GMT', id: VALID.id }),
      'utf-8',
    ).toString('base64');
    expect(decodeCursor(injected)).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    const missing = Buffer.from(JSON.stringify({ createdAt: VALID.createdAt }), 'utf-8').toString(
      'base64',
    );
    expect(decodeCursor(missing)).toBeNull();
  });

  it('returns null when the payload is not an object (e.g. an array or primitive)', () => {
    const arr = Buffer.from(JSON.stringify(['a', 'b']), 'utf-8').toString('base64');
    const num = Buffer.from(JSON.stringify(42), 'utf-8').toString('base64');
    expect(decodeCursor(arr)).toBeNull();
    expect(decodeCursor(num)).toBeNull();
  });
});
