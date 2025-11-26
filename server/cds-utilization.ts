/**
 * CDS 장비 가동률 계산 유틸리티
 * JSONL 파일에서 세션 데이터 추출 및 가동률 계산
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 프로젝트 루트 경로 (server 폴더의 상위 디렉토리)
const PROJECT_ROOT = join(__dirname, '..');
const LOG_FILENAME = 'instrument_logs.jsonl';

export interface SessionRecord {
  집계일자: string; // YYYY-MM-DD
  장비: string;
  시험자: string;
  acquisitionMethod: string;
  샘플명: string;
  가동시간_h: number;
  세션시작?: string;
  세션종료?: string;
}

interface LogEntry {
  timestamp: string;
  name: string;
  state: string;
  sampleName?: string | null;
  fullUserName?: string | null;
  acquisitionMethod?: string | null;
}

/**
 * JSONL 파일에서 세션 데이터 추출
 */
export function processJsonlToSessions(jsonlPath?: string): SessionRecord[] {
  // 명시적 경로가 없으면 프로젝트 루트의 instrument_logs.jsonl 사용
  const logPath = jsonlPath || join(PROJECT_ROOT, LOG_FILENAME);

  if (!existsSync(logPath)) {
    console.log(`❌ JSONL 파일이 없습니다: ${logPath}`);
    return [];
  }

  try {
    // JSONL 파일 로드
    const fileContent = readFileSync(logPath, 'utf-8');
    const lines = fileContent.split('\n').filter((line) => line.trim());
    const records: LogEntry[] = [];
    for (const line of lines) {
      try {
        records.push(JSON.parse(line));
      } catch (parseError) {
        console.warn(`⚠️ JSON 파싱 실패 (라인 무시): ${line.substring(0, 50)}...`);
        continue;
      }
    }

    if (records.length === 0) {
      console.log('❌ JSONL 파일이 비어있습니다');
      return [];
    }

    // 타임스탬프 파싱 및 정렬
    const parsedRecords = records
      .map((record) => ({
        ...record,
        timestamp: new Date(record.timestamp),
      }))
      .filter((record) => !isNaN(record.timestamp.getTime()))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (parsedRecords.length === 0) {
      console.log('❌ 유효한 타임스탬프가 있는 레코드가 없습니다');
      return [];
    }

    console.log(
      `📅 로그 데이터 기간: ${parsedRecords[0]?.timestamp} ~ ${parsedRecords[parsedRecords.length - 1]?.timestamp}`
    );
    console.log(`📊 총 로그 레코드: ${parsedRecords.length}건`);

    // 세션 추출
    const sessionRecords: SessionRecord[] = [];

    // 장비별로 그룹화
    const equipmentGroups = new Map<string, typeof parsedRecords>();
    parsedRecords.forEach((record) => {
      if (!equipmentGroups.has(record.name)) {
        equipmentGroups.set(record.name, []);
      }
      equipmentGroups.get(record.name)!.push(record);
    });

    equipmentGroups.forEach((group, name) => {
      let currentSession: Partial<SessionRecord> | null = null;
      let lastRunningTime: Date | null = null;

      for (const row of group) {
        const state = row.state;
        const ts = row.timestamp;

        if (state === 'Running' && currentSession === null) {
          currentSession = {
            집계일자: ts.toISOString().split('T')[0],
            장비: name,
            시험자: row.fullUserName || '',
            acquisitionMethod: row.acquisitionMethod || '',
            샘플명: row.sampleName || '',
            세션시작: ts.toISOString(),
            세션종료: ts.toISOString(),
          };
          lastRunningTime = ts;
        } else if (state === 'PreRun') {
          continue;
        } else if (
          state === 'Idle' ||
          state === 'NotReady' ||
          state === 'NotConnected'
        ) {
          if (currentSession && lastRunningTime) {
            const idleDuration = (ts.getTime() - lastRunningTime.getTime()) / 1000 / 60; // 분
            if (idleDuration > 10) {
              // 10분 이상 Idle이면 세션 종료
              currentSession.세션종료 = lastRunningTime.toISOString();
              const duration =
                (new Date(currentSession.세션종료).getTime() -
                  new Date(currentSession.세션시작!).getTime()) /
                1000 /
                3600; // 시간

              if (duration > 0) {
                currentSession.가동시간_h = Math.round(duration * 100) / 100;
                sessionRecords.push(currentSession as SessionRecord);
              }

              currentSession = null;
              lastRunningTime = null;
            }
          }
        } else if (state === 'Running' && currentSession) {
          lastRunningTime = ts;
        }
      }

      // 세션이 끝나지 않은 경우 처리
      if (currentSession && lastRunningTime) {
        currentSession.세션종료 = lastRunningTime.toISOString();
        const duration =
          (new Date(currentSession.세션종료).getTime() -
            new Date(currentSession.세션시작!).getTime()) /
          1000 /
          3600; // 시간

        if (duration > 0) {
          currentSession.가동시간_h = Math.round(duration * 100) / 100;
          sessionRecords.push(currentSession as SessionRecord);
        }
      }
    });

    if (sessionRecords.length === 0) {
      console.log('⚠️ 추출된 세션이 없습니다');
      return [];
    }

    // 집계 처리 (집계일자, 장비, 시험자, acquisitionMethod별로 합산)
    const groupedMap = new Map<string, SessionRecord>();

    sessionRecords.forEach((session) => {
      const key = `${session.집계일자}|${session.장비}|${session.시험자}|${session.acquisitionMethod}`;
      if (groupedMap.has(key)) {
        const existing = groupedMap.get(key)!;
        existing.가동시간_h += session.가동시간_h;
        if (
          !existing.세션시작 ||
          (session.세션시작 &&
            new Date(session.세션시작) < new Date(existing.세션시작))
        ) {
          existing.세션시작 = session.세션시작;
        }
        if (
          !existing.세션종료 ||
          (session.세션종료 &&
            new Date(session.세션종료) > new Date(existing.세션종료))
        ) {
          existing.세션종료 = session.세션종료;
        }
      } else {
        groupedMap.set(key, { ...session });
      }
    });

    const groupedSessions = Array.from(groupedMap.values());

    console.log(`✅ 세션 추출 완료: ${groupedSessions.length}건`);
    return groupedSessions;
  } catch (error) {
    console.error('❌ JSONL 처리 오류:', error);
    return [];
  }
}

/**
 * 샘플 데이터 생성 (JSONL 파일이 없을 때)
 * Python 버전과 동일하게 최근 30일 데이터 생성
 */
export function createSampleData(): SessionRecord[] {
  const dates: string[] = [];
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // 최근 30일

  for (
    let d = new Date(startDate);
    d <= endDate;
    d.setDate(d.getDate() + 1)
  ) {
    dates.push(d.toISOString().split('T')[0]);
  }

  const equipments = [
    'GC-Headspace (FID/ECD)',
    'HPLC Agilent-14',
    'HPLC Agilent-28',
    'HPLC Agilent-29',
    'HPLC Agilent-27',
  ];
  const users = [
    'Park Yun Jin',
    'Lee Yeong Nam',
    'Lee Sang Won',
    'Roh Han Sub',
    'Jang Jae Hoon',
  ];
  const methods = ['AS', 'AS,CU', 'AS,DS', 'CU', 'DS', 'ID'];

  const data: SessionRecord[] = [];

  dates.forEach((date) => {
    equipments.forEach((equipment) => {
      if (Math.random() > 0.3) {
        data.push({
          집계일자: date,
          장비: equipment,
          가동시간_h: Math.round((Math.random() * 23.5 + 0.5) * 100) / 100,
          시험자: users[Math.floor(Math.random() * users.length)],
          acquisitionMethod: methods[Math.floor(Math.random() * methods.length)],
          샘플명: `Sample_${Math.floor(Math.random() * 9000 + 1000)}`,
        });
      }
    });
  });

  console.log(`📊 샘플 데이터 생성: ${data.length}건`);
  return data;
}

