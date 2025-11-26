/**
 * CDS 장비 데이터 백그라운드 수집기
 * Python 버전의 background_data_collection()과 동일한 기능
 */

import { cdsApiClient } from './cds-api-client.js';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 프로젝트 루트 경로
const PROJECT_ROOT = join(__dirname, '..');
const LOG_FILENAME = 'instrument_logs.jsonl';
const LOG_FILE_PATH = join(PROJECT_ROOT, LOG_FILENAME);

// 수집 간격 (5분 = 300초, Python 버전과 동일)
const COLLECTION_INTERVAL_MS = 5 * 60 * 1000; // 5분

let collectionInterval: NodeJS.Timeout | null = null;
let isCollecting = false;

/**
 * 백그라운드 데이터 수집 실행
 */
async function collectData(): Promise<void> {
  if (isCollecting) {
    return; // 이미 수집 중이면 스킵
  }

  isCollecting = true;
  const currentTime = new Date().toISOString();
  
  try {
    console.log(`[${new Date().toLocaleString('ko-KR')}] 🔄 백그라운드 데이터 수집 시작`);
    const success = await cdsApiClient.collectInstrumentData(LOG_FILE_PATH);
    
    if (success) {
      console.log(`[${new Date().toLocaleString('ko-KR')}] ✅ 백그라운드 수집 성공`);
    } else {
      console.log(`[${new Date().toLocaleString('ko-KR')}] ❌ 백그라운드 수집 실패`);
    }
  } catch (error) {
    console.error(`[${new Date().toLocaleString('ko-KR')}] ❌ 백그라운드 수집 예외:`, error);
  } finally {
    isCollecting = false;
  }
}

/**
 * 백그라운드 데이터 수집 시작
 * Python 버전의 백그라운드 스레드와 동일한 기능
 */
export function startBackgroundCollection(): void {
  if (collectionInterval) {
    console.log('⚠️ 백그라운드 데이터 수집이 이미 실행 중입니다');
    return;
  }

  console.log('🔄 백그라운드 데이터 수집 스레드 시작됨');
  console.log(`📁 로그 파일: ${LOG_FILE_PATH}`);
  console.log(`⏰ 수집 간격: ${COLLECTION_INTERVAL_MS / 1000}초 (5분)`);

  // 초기 수집 시도
  collectData().catch((error) => {
    console.error('초기 데이터 수집 실패:', error);
  });

  // 주기적 수집 시작
  collectionInterval = setInterval(() => {
    collectData().catch((error) => {
      console.error('주기적 데이터 수집 실패:', error);
    });
  }, COLLECTION_INTERVAL_MS);
}

/**
 * 백그라운드 데이터 수집 중지
 */
export function stopBackgroundCollection(): void {
  if (collectionInterval) {
    clearInterval(collectionInterval);
    collectionInterval = null;
    console.log('🛑 백그라운드 데이터 수집 중지됨');
  }
}

/**
 * 수동 데이터 수집 (즉시 실행)
 */
export async function collectDataNow(): Promise<boolean> {
  try {
    console.log('🔄 수동 데이터 수집 시작');
    const success = await cdsApiClient.collectInstrumentData(LOG_FILE_PATH);
    
    if (success) {
      console.log('✅ 수동 데이터 수집 성공');
    } else {
      console.log('❌ 수동 데이터 수집 실패');
    }
    
    return success;
  } catch (error) {
    console.error('❌ 수동 데이터 수집 예외:', error);
    return false;
  }
}

