/**
 * 생일 축하 메시지 자동 생성 스케줄러
 * 매일 자정에 오늘 생일인 사람을 확인하고 축하 메시지를 공지사항에 추가
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BIRTHDAYS_FILE = resolve(__dirname, './data/birthdays.json');
const NOTICES_FILE = resolve(__dirname, './data/notices.json');

interface Birthday {
  id: number;
  name: string;
  birthMonth: number;
  birthDay: number;
  department?: string;
}

interface Notice {
  id: number;
  content: string;
  createdAt: string | Date;
  isImportant: boolean;
}

// 생일자 데이터 읽기
function readBirthdays(): Birthday[] {
  try {
    if (!existsSync(BIRTHDAYS_FILE)) {
      return [];
    }
    const data = readFileSync(BIRTHDAYS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('생일자 데이터 읽기 실패:', error);
    return [];
  }
}

// 공지사항 데이터 읽기
function readNotices(): Notice[] {
  try {
    if (!existsSync(NOTICES_FILE)) {
      return [];
    }
    const data = readFileSync(NOTICES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('공지사항 데이터 읽기 실패:', error);
    return [];
  }
}

// 공지사항 데이터 쓰기
function writeNotices(notices: Notice[]): void {
  try {
    writeFileSync(NOTICES_FILE, JSON.stringify(notices, null, 2), 'utf-8');
  } catch (error) {
    console.error('공지사항 데이터 쓰기 실패:', error);
    throw error;
  }
}

/**
 * 오늘 생일인 사람 확인 및 축하 메시지 추가
 * + 지난 생일 메시지 자동 삭제
 */
export async function checkAndAddBirthdayNotices(): Promise<void> {
  try {
    const notices = readNotices();
    const today = new Date();
    const todayDateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD 형식
    
    // 1. 지난 생일 축하 메시지 삭제
    // "생일을 축하합니다"가 포함되어 있고, 작성일이 오늘이 아닌 공지사항 삭제
    const initialCount = notices.length;
    const activeNotices = notices.filter(notice => {
      const isBirthdayNotice = notice.content.includes('생일을 축하합니다');
      if (!isBirthdayNotice) return true;
      
      const noticeDate = new Date(notice.createdAt).toISOString().split('T')[0];
      return noticeDate === todayDateStr; // 오늘 작성된 생일 공지만 유지
    });

    if (activeNotices.length < initialCount) {
      console.log(`[${today.toLocaleDateString('ko-KR')}] 지난 생일 축하 메시지 ${initialCount - activeNotices.length}개를 삭제했습니다.`);
      // 변경사항이 있으면 즉시 저장 (아래 로직에서 activeNotices를 사용하기 위함)
      writeNotices(activeNotices);
    }

    // 2. 오늘 생일인 사람 확인
    const month = today.getMonth() + 1; // 1-12
    const day = today.getDate();
    
    const birthdays = readBirthdays();
    const todayBirthdays = birthdays.filter(
      b => b.birthMonth === month && b.birthDay === day
    );

    if (todayBirthdays.length === 0) {
      console.log(`[${today.toLocaleDateString('ko-KR')}] 생일인 사람이 없습니다.`);
      return;
    }

    // 최신 공지사항 목록 다시 읽기 (위에서 삭제되었을 수 있음)
    // 또는 activeNotices 사용
    const currentNotices = activeNotices;
    
    // 오늘 이미 추가된 생일 축하 메시지가 있는지 확인 (중복 방지)
    const existingBirthdayNotices = currentNotices.filter(notice => {
      const noticeDate = new Date(notice.createdAt).toISOString().split('T')[0];
      return noticeDate === todayDateStr && notice.content.includes('생일을 축하합니다');
    });

    if (existingBirthdayNotices.length > 0) {
      // 이미 등록된 경우 추가하지 않음
      // 단, 생일자가 여러 명인데 일부만 등록된 경우는 고려하지 않음 (단순화를 위해 하루 한 번 일괄 등록 가정)
      console.log(`[${today.toLocaleDateString('ko-KR')}] 이미 생일 축하 메시지가 추가되어 있습니다.`);
      return;
    }

    // 3. 생일 축하 메시지 추가
    let newId = currentNotices.length > 0 ? Math.max(...currentNotices.map(n => n.id)) + 1 : 1;
    const newNotices = [...currentNotices];
    
    for (const birthday of todayBirthdays) {
      const departmentText = birthday.department ? ` (${birthday.department})` : '';
      const content = `${birthday.name}${departmentText}님의 생일을 축하합니다!`;
      
      const newNotice: Notice = {
        id: newId++,
        content,
        createdAt: new Date().toISOString(),
        isImportant: true, // 생일 축하 메시지는 중요 공지로 표시
      };

      newNotices.push(newNotice);
      console.log(`[${today.toLocaleDateString('ko-KR')}] 생일 축하 메시지 추가: ${birthday.name}님`);
    }

    writeNotices(newNotices);
    console.log(`[${today.toLocaleDateString('ko-KR')}] ${todayBirthdays.length}명의 생일 축하 메시지가 추가되었습니다.`);
  } catch (error) {
    console.error('생일 축하 메시지 관리 실패:', error);
  }
}

/**
 * 다음 자정까지의 시간 계산 (밀리초)
 */
function getMillisecondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0); // 다음 자정
  
  return midnight.getTime() - now.getTime();
}

/**
 * 생일 확인 스케줄러 시작
 */
export function startBirthdayScheduler(): void {
  console.log('🎂 생일 확인 스케줄러 시작됨');
  
  // 즉시 한 번 실행 (서버 시작 시 오늘 생일 확인)
  checkAndAddBirthdayNotices().catch(error => {
    console.error('초기 생일 확인 실패:', error);
  });

  // 다음 자정까지 대기 후 실행
  const msUntilMidnight = getMillisecondsUntilMidnight();
  
  setTimeout(() => {
    // 자정에 실행
    checkAndAddBirthdayNotices().catch(error => {
      console.error('자정 생일 확인 실패:', error);
    });

    // 이후 매일 자정에 실행 (24시간마다)
    setInterval(() => {
      checkAndAddBirthdayNotices().catch(error => {
        console.error('생일 확인 실패:', error);
      });
    }, 24 * 60 * 60 * 1000); // 24시간
  }, msUntilMidnight);

  console.log(`⏰ 다음 생일 확인: ${new Date(Date.now() + msUntilMidnight).toLocaleString('ko-KR')}`);
}

