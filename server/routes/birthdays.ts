/**
 * 생일자 관리 API 라우트
 */

import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { checkAndAddBirthdayNotices } from '../birthday-scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_FILE = resolve(__dirname, '../data/birthdays.json');

export interface Birthday {
  id: number;
  name: string;
  birthMonth: number; // 1-12
  birthDay: number; // 1-31
  department?: string; // 부서 (선택사항)
}

// 기본 생일자 데이터
const defaultBirthdays: Birthday[] = [];

// 데이터 파일 읽기
function readData(): Birthday[] {
  try {
    if (!existsSync(DATA_FILE)) {
      writeData(defaultBirthdays);
      return defaultBirthdays;
    }
    const data = readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('생일자 데이터 파일 읽기 실패:', error);
    return defaultBirthdays;
  }
}

// 데이터 파일 쓰기
function writeData(data: Birthday[]): void {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('생일자 데이터 파일 쓰기 실패:', error);
    throw error;
  }
}

// 생일 날짜 유효성 검사
function isValidDate(month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  // 각 월의 최대 일수 확인
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

const router = Router();

/**
 * GET /api/birthdays
 * 전체 생일자 조회
 */
router.get('/', (req, res) => {
  try {
    const data = readData();
    // 월, 일 순으로 정렬
    const sortedData = [...data].sort((a, b) => {
      if (a.birthMonth !== b.birthMonth) {
        return a.birthMonth - b.birthMonth;
      }
      return a.birthDay - b.birthDay;
    });
    res.json({
      success: true,
      data: sortedData,
    });
  } catch (error) {
    console.error('생일자 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * GET /api/birthdays/today
 * 오늘 생일인 사람 조회
 */
router.get('/today', (req, res) => {
  try {
    const today = new Date();
    const month = today.getMonth() + 1; // 1-12
    const day = today.getDate();
    
    const data = readData();
    const todayBirthdays = data.filter(
      b => b.birthMonth === month && b.birthDay === day
    );
    
    res.json({
      success: true,
      data: todayBirthdays,
    });
  } catch (error) {
    console.error('오늘 생일자 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * POST /api/birthdays
 * 생일자 등록
 */
router.post('/', (req, res) => {
  try {
    const { name, birthMonth, birthDay, department } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '이름을 입력하세요',
      });
    }

    const month = parseInt(birthMonth, 10);
    const day = parseInt(birthDay, 10);

    if (isNaN(month) || isNaN(day) || !isValidDate(month, day)) {
      return res.status(400).json({
        success: false,
        error: '유효한 생일 날짜를 입력하세요',
      });
    }

    const data = readData();
    const newId = data.length > 0 ? Math.max(...data.map(b => b.id)) + 1 : 1;
    
    const newBirthday: Birthday = {
      id: newId,
      name: name.trim(),
      birthMonth: month,
      birthDay: day,
      department: department?.trim() || undefined,
    };

    data.push(newBirthday);
    writeData(data);

    res.json({
      success: true,
      data: newBirthday,
    });
  } catch (error) {
    console.error('생일자 등록 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * PUT /api/birthdays/:id
 * 생일자 수정
 */
router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, birthMonth, birthDay, department } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 ID입니다',
      });
    }

    const data = readData();
    const index = data.findIndex(b => b.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: '생일자를 찾을 수 없습니다',
      });
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: '이름을 입력하세요',
        });
      }
      data[index].name = name.trim();
    }

    if (birthMonth !== undefined || birthDay !== undefined) {
      const month = birthMonth !== undefined ? parseInt(birthMonth, 10) : data[index].birthMonth;
      const day = birthDay !== undefined ? parseInt(birthDay, 10) : data[index].birthDay;

      if (isNaN(month) || isNaN(day) || !isValidDate(month, day)) {
        return res.status(400).json({
          success: false,
          error: '유효한 생일 날짜를 입력하세요',
        });
      }

      data[index].birthMonth = month;
      data[index].birthDay = day;
    }

    if (department !== undefined) {
      data[index].department = department?.trim() || undefined;
    }

    writeData(data);

    res.json({
      success: true,
      data: data[index],
    });
  } catch (error) {
    console.error('생일자 수정 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * DELETE /api/birthdays/:id
 * 생일자 삭제
 */
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 ID입니다',
      });
    }

    const data = readData();
    const index = data.findIndex(b => b.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: '생일자를 찾을 수 없습니다',
      });
    }

    data.splice(index, 1);
    writeData(data);

    res.json({
      success: true,
      message: '생일자가 삭제되었습니다',
    });
  } catch (error) {
    console.error('생일자 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * POST /api/birthdays/check-today
 * 오늘 생일 확인 및 축하 메시지 추가 (수동 실행용)
 */
router.post('/check-today', async (req, res) => {
  try {
    await checkAndAddBirthdayNotices();
    res.json({
      success: true,
      message: '생일 확인 완료',
    });
  } catch (error) {
    console.error('생일 확인 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

export default router;

