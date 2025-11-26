/**
 * 공지사항 API 라우트
 */

import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_FILE = resolve(__dirname, '../data/notices.json');

export interface Notice {
  id: number;
  content: string;
  createdAt: string | Date;
  isImportant: boolean;
  isWelcome?: boolean; // 환영 메시지 여부
  startDate?: string | Date | null; // 게시 시작일 (null이면 즉시 게시)
  endDate?: string | Date | null; // 게시 종료일 (null이면 영구 게시)
}

// 기본 공지사항 데이터
const defaultNotices: Notice[] = [
  {
    id: 1,
    content: '환영합니다! 품질관리팀 통합 관리 시스템에 오신 것을 환영합니다.',
    createdAt: new Date().toISOString(),
    isImportant: true,
  },
];

// 데이터 파일 읽기
function readData(): Notice[] {
  try {
    if (!existsSync(DATA_FILE)) {
      writeData(defaultNotices);
      return defaultNotices;
    }
    const data = readFileSync(DATA_FILE, 'utf-8');
    const notices = JSON.parse(data);
    // 날짜 필드를 Date 객체로 변환
    return notices.map((notice: Notice) => ({
      ...notice,
      createdAt: new Date(notice.createdAt),
      startDate: notice.startDate ? new Date(notice.startDate) : null,
      endDate: notice.endDate ? new Date(notice.endDate) : null,
    }));
  } catch (error) {
    console.error('공지사항 데이터 파일 읽기 실패:', error);
    return defaultNotices;
  }
}

// 데이터 파일 쓰기
function writeData(data: Notice[]): void {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('공지사항 데이터 파일 쓰기 실패:', error);
    throw error;
  }
}

const router = Router();

/**
 * GET /api/notices
 * 전체 공지사항 조회 (최신순 정렬)
 */
router.get('/', (req, res) => {
  try {
    const data = readData();
    const now = new Date();
    
    // 게시 기간 필터링: 현재 날짜가 게시 기간 내인 공지사항만 반환
    const activeNotices = data.filter((notice) => {
      const startDate = notice.startDate ? new Date(notice.startDate) : null;
      const endDate = notice.endDate ? new Date(notice.endDate) : null;
      
      // 시작일이 있고 현재 날짜가 시작일 이전이면 제외
      if (startDate && now < startDate) {
        return false;
      }
      
      // 종료일이 있고 현재 날짜가 종료일 이후이면 제외 (영구 게시는 endDate가 null)
      if (endDate && now > endDate) {
        return false;
      }
      
      return true;
    });
    
    // 최신순 정렬
    const sortedData = [...activeNotices].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
    res.json(sortedData);
  } catch (error) {
    console.error('공지사항 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * POST /api/notices
 * 공지사항 등록
 */
router.post('/', (req, res) => {
  try {
    const { content, isImportant, isWelcome, startDate, endDate } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '공지사항 내용을 입력하세요',
      });
    }

    // 날짜 유효성 검사
    let parsedStartDate: string | null = null;
    let parsedEndDate: string | null = null;
    
    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 시작일입니다',
        });
      }
      parsedStartDate = start.toISOString();
    }
    
    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 종료일입니다',
        });
      }
      parsedEndDate = end.toISOString();
      
      // 종료일이 시작일보다 이전이면 오류
      if (parsedStartDate && end < new Date(parsedStartDate)) {
        return res.status(400).json({
          success: false,
          error: '종료일은 시작일보다 이후여야 합니다',
        });
      }
    }

    const data = readData();
    const newId = data.length > 0 ? Math.max(...data.map(n => n.id)) + 1 : 1;
    
    const newNotice: Notice = {
      id: newId,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      isImportant: Boolean(isImportant),
      isWelcome: Boolean(isWelcome),
      startDate: parsedStartDate,
      endDate: parsedEndDate,
    };

    data.push(newNotice);
    writeData(data);

    res.json({
      success: true,
      data: newNotice,
    });
  } catch (error) {
    console.error('공지사항 등록 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * PUT /api/notices/:id
 * 공지사항 수정
 */
router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { content, isImportant, isWelcome, startDate, endDate } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 ID입니다',
      });
    }

    if (content !== undefined && (typeof content !== 'string' || content.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        error: '공지사항 내용을 입력하세요',
      });
    }

    // 날짜 유효성 검사
    let parsedStartDate: string | null | undefined = undefined;
    let parsedEndDate: string | null | undefined = undefined;
    
    if (startDate !== undefined) {
      if (startDate === null || startDate === '') {
        parsedStartDate = null;
      } else {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            error: '유효하지 않은 시작일입니다',
          });
        }
        parsedStartDate = start.toISOString();
      }
    }
    
    if (endDate !== undefined) {
      if (endDate === null || endDate === '') {
        parsedEndDate = null;
      } else {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            error: '유효하지 않은 종료일입니다',
          });
        }
        parsedEndDate = end.toISOString();
      }
      
    }

    const data = readData();
    const index = data.findIndex(n => n.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: '공지사항을 찾을 수 없습니다',
      });
    }

    // 종료일이 시작일보다 이전이면 오류
    if (parsedEndDate !== undefined && parsedEndDate !== null) {
      const currentStartDate = parsedStartDate !== undefined 
        ? parsedStartDate 
        : (data[index].startDate ? new Date(data[index].startDate).toISOString() : null);
      
      if (currentStartDate && new Date(parsedEndDate) < new Date(currentStartDate)) {
        return res.status(400).json({
          success: false,
          error: '종료일은 시작일보다 이후여야 합니다',
        });
      }
    }

    if (content !== undefined) {
      data[index].content = content.trim();
    }
    if (isImportant !== undefined) {
      data[index].isImportant = Boolean(isImportant);
    }
    if (isWelcome !== undefined) {
      data[index].isWelcome = Boolean(isWelcome);
    }
    if (parsedStartDate !== undefined) {
      data[index].startDate = parsedStartDate;
    }
    if (parsedEndDate !== undefined) {
      data[index].endDate = parsedEndDate;
    }

    writeData(data);

    res.json({
      success: true,
      data: data[index],
    });
  } catch (error) {
    console.error('공지사항 수정 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * DELETE /api/notices/:id
 * 공지사항 삭제
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
    const index = data.findIndex(n => n.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: '공지사항을 찾을 수 없습니다',
      });
    }

    data.splice(index, 1);
    writeData(data);

    res.json({
      success: true,
      message: '공지사항이 삭제되었습니다',
    });
  } catch (error) {
    console.error('공지사항 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

export default router;

