import assert from 'node:assert/strict';
import test from 'node:test';
import { esc } from '../lib/esc.js';

test('esc escapes HTML special characters', () => {
  assert.equal(esc('<a & "b">'), '&lt;a &amp; &quot;b&quot;&gt;');
});

test('esc handles null and undefined as empty string', () => {
  assert.equal(esc(null), '');
  assert.equal(esc(undefined), '');
});

test('esc stringifies numbers', () => {
  assert.equal(esc(42), '42');
});
