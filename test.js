import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

test('server returns JSON response', async (t) => {
  const response = await fetch('http://localhost:3000');
  const data = await response.json();
  
  assert.strictEqual(response.status, 200);
  assert.strictEqual(typeof data.message, 'string');
  assert.strictEqual(typeof data.timestamp, 'string');
  assert.strictEqual(typeof data.node_version, 'string');
});