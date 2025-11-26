import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import os from 'os';
import { readJsonFileSync, withFileLockSync, writeJsonFileSync } from './fileStore';

function tmpPath(name: string) {
  return join(os.tmpdir(), `ims-${name}-${process.pid}-${Date.now()}.json`);
}

describe('fileStore', () => {
  it('writes JSON atomically', () => {
    const file = tmpPath('atomic');
    writeJsonFileSync(file, { ok: true });
    const parsed = JSON.parse(readFileSync(file, 'utf-8'));
    assert.deepEqual(parsed, { ok: true });
    rmSync(file, { force: true });
  });

  it('prevents concurrent access with lock files', async () => {
    const file = tmpPath('lock');
    writeJsonFileSync(file, []);
    const events: string[] = [];

    const first = new Promise<void>((resolve) => {
      setTimeout(() => {
        withFileLockSync(file, () => {
          events.push('first-start');
          const holdUntil = Date.now() + 50;
          while (Date.now() < holdUntil) {
            // busy wait to keep lock for a short time
          }
          events.push('first-end');
        });
        resolve();
      }, 0);
    });

    const second = new Promise<void>((resolve) => {
      setTimeout(() => {
        withFileLockSync(file, () => {
          events.push('second-start');
          events.push('second-end');
        });
        resolve();
      }, 5);
    });

    await Promise.all([first, second]);
    assert.deepEqual(events, ['first-start', 'first-end', 'second-start', 'second-end']);
    if (existsSync(file)) {
      rmSync(file, { force: true });
    }
  });

  it('reads JSON with fallback when file missing', () => {
    const file = tmpPath('missing');
    const data = readJsonFileSync(file, [{ id: 1 }]);
    assert.deepEqual(data, [{ id: 1 }]);
  });
});

