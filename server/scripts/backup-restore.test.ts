import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import os from 'os';
import { createHash } from 'crypto';
import { performBackup, restoreFromCsv } from './backup-utils';
import { writeJsonFileSync, readJsonFileSync } from '../utils/fileStore';
import type { Visitor, AuditTrail } from '../routes/visitors';

function auditHash(seed: Omit<AuditTrail, 'hash'>): string {
  return createHash('sha256').update(JSON.stringify(seed)).digest('hex');
}

describe('backup & restore flow', () => {
  it('creates CSV snapshots and restores them back', () => {
    const tmpRoot = mkdtempSync(join(os.tmpdir(), 'ims-backup-'));
    const dataDir = join(tmpRoot, 'data');
    const backupDir = join(tmpRoot, 'backups');

    const sampleVisitors: Visitor[] = [
      {
        id: 'visitor_1',
        name: '홍길동',
        company: 'Agilent',
        phone: '01012345678',
        purpose: '장비 점검',
        visitDate: '2025-11-21',
        visitTime: '10:00',
        responsiblePerson: '박재홍',
        status: 'pending',
        notes: '테스트',
        diTrainingCompleted: true,
        diTrainingNA: false,
        diTrainingSignature: 'signed',
        createdAt: '2025-11-21T01:00:00.000Z',
      },
    ];

    const auditSeed: Omit<AuditTrail, 'hash'> = {
      id: 'audit_1',
      timestamp: '2025-11-21T01:05:00.000Z',
      action: 'create',
      actor: '시스템',
      entityType: 'visitor',
      entityId: 'visitor_1',
      entityInfo: {
        name: '홍길동',
        visitDate: '2025-11-21',
        company: 'Agilent',
        status: 'pending',
      },
      changes: [],
      result: 'success',
      details: '테스트',
    };

    const sampleAudits: AuditTrail[] = [{ ...auditSeed, hash: auditHash(auditSeed) }];

    writeJsonFileSync(join(dataDir, 'visitors.json'), sampleVisitors);
    writeJsonFileSync(join(dataDir, 'visitor-audit-trail.json'), sampleAudits);

    const { visitorCsvPath, auditCsvPath } = performBackup({ dataDir, backupDir });

    // 데이터 삭제 후 복구 테스트
    writeJsonFileSync(join(dataDir, 'visitors.json'), []);
    writeJsonFileSync(join(dataDir, 'visitor-audit-trail.json'), []);

    restoreFromCsv(visitorCsvPath, auditCsvPath, { dataDir });

    const restoredVisitors = readJsonFileSync<Visitor[]>(join(dataDir, 'visitors.json'), []);
    const restoredAudits = readJsonFileSync<AuditTrail[]>(join(dataDir, 'visitor-audit-trail.json'), []);

    assert.deepEqual(restoredVisitors, sampleVisitors);
    assert.deepEqual(restoredAudits, sampleAudits);

    rmSync(tmpRoot, { recursive: true, force: true });
  });
});

