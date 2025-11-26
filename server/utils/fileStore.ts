import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'fs';
import { dirname } from 'path';

const LOCK_TIMEOUT_MS = 5_000;
const LOCK_SLEEP_MS = 10;

function ensureDir(targetPath: string) {
  if (!existsSync(targetPath)) {
    mkdirSync(targetPath, { recursive: true });
  }
}

function sleepSync(ms: number) {
  const sab = new SharedArrayBuffer(4);
  const arr = new Int32Array(sab);
  Atomics.wait(arr, 0, 0, ms);
}

function acquireLock(lockPath: string, timeoutMs = LOCK_TIMEOUT_MS): number {
  const start = Date.now();
  while (true) {
    try {
      return openSync(lockPath, 'wx');
    } catch (error: any) {
      if (error?.code !== 'EEXIST') {
        throw error;
      }
      if (Date.now() - start >= timeoutMs) {
        throw new Error(`파일 잠금 획득 실패: ${lockPath}`);
      }
      sleepSync(LOCK_SLEEP_MS);
    }
  }
}

export function withFileLockSync<T>(filePath: string, fn: () => T): T {
  const lockPath = `${filePath}.lock`;
  ensureDir(dirname(filePath));
  const fd = acquireLock(lockPath);
  try {
    return fn();
  } finally {
    closeSync(fd);
    if (existsSync(lockPath)) {
      unlinkSync(lockPath);
    }
  }
}

export function readJsonFileSync<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) {
    return fallback;
  }
  return withFileLockSync(filePath, () => {
    const data = readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as T;
  });
}

export function writeJsonFileSync(filePath: string, data: unknown): void {
  withFileLockSync(filePath, () => {
    const dir = dirname(filePath);
    ensureDir(dir);
    const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    renameSync(tempPath, filePath);
  });
}

