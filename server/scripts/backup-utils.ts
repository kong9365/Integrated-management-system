import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { readJsonFileSync, writeJsonFileSync } from '../utils/fileStore';
import { toCsv, fromCsv } from '../utils/csv';
import type { Visitor, AuditTrail } from '../routes/visitors';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = resolve(SCRIPT_DIR, '../data');
const DEFAULT_BACKUP_DIR = resolve(SCRIPT_DIR, '../../backups');

export interface BackupOptions {
  dataDir?: string;
  backupDir?: string;
}

export interface BackupResult {
  visitorCsvPath: string;
  auditCsvPath: string;
}

function ensureDir(path: string) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function writeHashFile(filePath: string) {
  const checksum = createHash('sha256').update(readFileSync(filePath)).digest('hex');
  writeFileSync(`${filePath}.sha256`, checksum, 'utf-8');
}

function verifyHash(filePath: string) {
  const hashFile = `${filePath}.sha256`;
  if (!existsSync(hashFile)) {
    throw new Error(`Hash 파일을 찾을 수 없습니다: ${hashFile}`);
  }
  const expected = readFileSync(hashFile, 'utf-8').trim();
  const actual = createHash('sha256').update(readFileSync(filePath)).digest('hex');
  if (expected !== actual) {
    throw new Error(`무결성 검증 실패: ${filePath}`);
  }
}

const visitorColumns = [
  'id',
  'name',
  'company',
  'phone',
  'purpose',
  'visitDate',
  'visitTime',
  'responsiblePerson',
  'status',
  'notes',
  'badgeNumber',
  'diTrainingCompleted',
  'diTrainingNA',
  'diTrainingSignature',
  'diTrainingNAReason',
  'createdAt',
] as const;

const auditColumns = [
  'id',
  'timestamp',
  'action',
  'actor',
  'entityType',
  'entityId',
  'entityName',
  'entityVisitDate',
  'entityCompany',
  'entityStatus',
  'result',
  'changes',
  'details',
  'errorMessage',
  'hash',
] as const;

export function performBackup(options: BackupOptions = {}): BackupResult {
  const dataDir = options.dataDir ?? DEFAULT_DATA_DIR;
  const backupDir = options.backupDir ?? DEFAULT_BACKUP_DIR;
  ensureDir(backupDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const visitorFile = resolve(dataDir, 'visitors.json');
  const auditFile = resolve(dataDir, 'visitor-audit-trail.json');

  const visitors = readJsonFileSync<Visitor[]>(visitorFile, []);
  const audits = readJsonFileSync<AuditTrail[]>(auditFile, []);

  const visitorRows: (string | boolean | null | undefined)[][] = [
    [...visitorColumns],
    ...visitors.map((visitor) => [
      visitor.id,
      visitor.name,
      visitor.company,
      visitor.phone,
      visitor.purpose,
      visitor.visitDate,
      visitor.visitTime,
      visitor.responsiblePerson,
      visitor.status,
      visitor.notes ?? '',
      visitor.badgeNumber ?? '',
      visitor.diTrainingCompleted ?? false,
      visitor.diTrainingNA ?? false,
      visitor.diTrainingSignature ?? '',
      visitor.diTrainingNAReason ?? '',
      visitor.createdAt ?? '',
    ]),
  ];

  const auditRows: (string | boolean | null | undefined)[][] = [
    [...auditColumns],
    ...audits.map((entry) => [
      entry.id,
      entry.timestamp,
      entry.action,
      entry.actor,
      entry.entityType,
      entry.entityId,
      entry.entityInfo?.name ?? '',
      entry.entityInfo?.visitDate ?? '',
      entry.entityInfo?.company ?? '',
      entry.entityInfo?.status ?? '',
      entry.result,
      JSON.stringify(entry.changes ?? []),
      entry.details ?? '',
      entry.errorMessage ?? '',
      entry.hash,
    ]),
  ];

  const visitorCsvPath = join(backupDir, `visitors-${timestamp}.csv`);
  const auditCsvPath = join(backupDir, `audit-trail-${timestamp}.csv`);

  writeFileSync(visitorCsvPath, toCsv(visitorRows), 'utf-8');
  writeFileSync(auditCsvPath, toCsv(auditRows), 'utf-8');
  writeHashFile(visitorCsvPath);
  writeHashFile(auditCsvPath);

  return { visitorCsvPath, auditCsvPath };
}

export function restoreFromCsv(
  visitorCsvPath: string,
  auditCsvPath: string,
  options: BackupOptions = {},
): void {
  const dataDir = options.dataDir ?? DEFAULT_DATA_DIR;
  ensureDir(dataDir);

  verifyHash(visitorCsvPath);
  verifyHash(auditCsvPath);

  const visitorFile = resolve(dataDir, 'visitors.json');
  const auditFile = resolve(dataDir, 'visitor-audit-trail.json');

  const visitorRows = fromCsv(readFileSync(visitorCsvPath, 'utf-8'));
  const auditRows = fromCsv(readFileSync(auditCsvPath, 'utf-8'));

  const [, ...visitorData] = visitorRows;
  const visitors: Visitor[] = visitorData
    .filter((row) => row.length)
    .map((row) => ({
      id: row[0],
      name: row[1],
      company: row[2],
      phone: row[3],
      purpose: row[4],
      visitDate: row[5],
      visitTime: row[6],
      responsiblePerson: row[7],
      status: row[8],
      notes: row[9] || undefined,
      badgeNumber: row[10] || undefined,
      diTrainingCompleted: row[11] === 'true',
      diTrainingNA: row[12] === 'true',
      diTrainingSignature: row[13] || undefined,
      diTrainingNAReason: row[14] || undefined,
      createdAt: row[15] || undefined,
    }));

  const [, ...auditData] = auditRows;
  const audits: AuditTrail[] = auditData
    .filter((row) => row.length)
    .map((row) => ({
      id: row[0],
      timestamp: row[1],
      action: row[2] as AuditTrail['action'],
      actor: row[3],
      entityType: row[4] as AuditTrail['entityType'],
      entityId: row[5],
      entityInfo: {
        name: row[6] || undefined,
        visitDate: row[7] || undefined,
        company: row[8] || undefined,
        status: row[9] || undefined,
      },
      result: row[10] as AuditTrail['result'],
      changes: JSON.parse(row[11] || '[]'),
      details: row[12] || undefined,
      errorMessage: row[13] || undefined,
      hash: row[14],
    }));

  writeJsonFileSync(visitorFile, visitors);
  writeJsonFileSync(auditFile, audits);
}


