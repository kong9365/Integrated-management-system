import { restoreFromCsv } from './backup-utils';

const [visitorCsv, auditCsv] = process.argv.slice(2);

if (!visitorCsv || !auditCsv) {
  console.error('Usage: tsx server/scripts/visitor-restore.ts <visitors.csv> <audit-trail.csv>');
  process.exit(1);
}

try {
  restoreFromCsv(visitorCsv, auditCsv);
  console.log('CSV 복구가 완료되었습니다.');
} catch (error) {
  console.error('복구 실행 중 오류가 발생했습니다:', error instanceof Error ? error.message : error);
  process.exit(1);
}

