import { performBackup } from './backup-utils';

const targetDir = process.argv[2];

try {
  const result = performBackup({ backupDir: targetDir });
  console.log('백업이 완료되었습니다.');
  console.log(`- 방문자 CSV: ${result.visitorCsvPath}`);
  console.log(`- Audit Trail CSV: ${result.auditCsvPath}`);
  console.log('각 CSV와 동일 경로의 .sha256 파일을 사용해 무결성을 검증할 수 있습니다.');
} catch (error) {
  console.error('백업 실행 중 오류가 발생했습니다:', error instanceof Error ? error.message : error);
  process.exit(1);
}

