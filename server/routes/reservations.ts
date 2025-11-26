/**
 * 시험장비 예약 API 라우트
 */

import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_FILE = resolve(__dirname, '../data/reservations.json');

export interface Reservation {
  id: string;
  equipmentId: string;
  equipmentName: string;
  userName: string;
  reservationDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  purpose: string;
  testItem?: string;
  sampleCount?: number;
  notes?: string;
  status: string;
  createdAt: string;
}

// 데이터 파일 읽기
function readData(): Reservation[] {
  try {
    if (!existsSync(DATA_FILE)) {
      return [];
    }
    const data = readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('데이터 파일 읽기 실패:', error);
    return [];
  }
}

// 데이터 파일 쓰기
function writeData(data: Reservation[]): void {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('데이터 파일 쓰기 실패:', error);
    throw error;
  }
}

const router = Router();

/**
 * GET /api/reservations
 * 전체 예약 조회
 */
router.get('/', (req, res) => {
  try {
    const data = readData();
    res.json(data);
  } catch (error) {
    console.error('예약 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * POST /api/reservations
 * 예약 등록
 */
router.post('/', (req, res) => {
  try {
    const {
      equipmentId,
      equipmentName,
      userName,
      reservationDate,
      endDate,
      startTime,
      endTime,
      purpose,
      testItem,
      sampleCount,
      notes,
    } = req.body;

    console.log('받은 요청 데이터:', JSON.stringify(req.body, null, 2));

    // 필수 항목 검증 (빈 문자열도 체크)
    if (!equipmentId || (typeof equipmentId === 'string' && equipmentId.trim() === '')) {
      return res.status(400).json({
        success: false,
        error: '장비 ID가 누락되었습니다',
      });
    }
    if (!equipmentName || (typeof equipmentName === 'string' && equipmentName.trim() === '')) {
      return res.status(400).json({
        success: false,
        error: '장비명이 누락되었습니다',
      });
    }
    if (!userName || (typeof userName === 'string' && userName.trim() === '')) {
      return res.status(400).json({
        success: false,
        error: '사용자명이 누락되었습니다',
      });
    }
    if (!reservationDate || (typeof reservationDate === 'string' && reservationDate.trim() === '')) {
      return res.status(400).json({
        success: false,
        error: '예약 일자가 누락되었습니다',
      });
    }
    if (!purpose || (typeof purpose === 'string' && purpose.trim() === '')) {
      return res.status(400).json({
        success: false,
        error: '사용 목적이 누락되었습니다',
      });
    }

    const data = readData();

    // 중복 예약 확인 (Conflict Check)
    const isOverlap = data.some((existing) => {
      // 1. 같은 장비인지 확인
      if (existing.equipmentId !== equipmentId) return false;
      
      // 2. 취소된 예약은 제외
      if (existing.status === 'cancelled') return false;

      // 3. 같은 날짜인지 확인
      if (existing.reservationDate !== reservationDate) return false;

      // 4. 시간 겹침 확인
      // 기존 예약이나 새 예약에 시간이 없으면(종일 예약) 무조건 겹침으로 간주 (같은 날짜이므로)
      if (!existing.startTime || !existing.endTime || !startTime || !endTime) {
        return true;
      }

      // 시간 문자열 비교 ("HH:mm" 형식은 문자열 비교 가능)
      // (StartA < EndB) && (EndA > StartB)
      return (startTime < existing.endTime) && (endTime > existing.startTime);
    });

    if (isOverlap) {
      return res.status(409).json({
        success: false,
        error: '해당 시간에 이미 예약이 존재합니다. 다른 시간을 선택해주세요.',
      });
    }

    // ID 생성
    const id = `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 빈 문자열을 undefined로 변환 (옵션 필드)
    const newReservation: any = {
      id,
      equipmentId,
      equipmentName,
      userName,
      reservationDate,
      purpose,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // 옵션 필드는 값이 있을 때만 추가
    if (endDate && typeof endDate === 'string' && endDate.trim() !== "") {
      newReservation.endDate = endDate.trim();
    }
    if (startTime && typeof startTime === 'string' && startTime.trim() !== "") {
      newReservation.startTime = startTime.trim();
    }
    if (endTime && typeof endTime === 'string' && endTime.trim() !== "") {
      newReservation.endTime = endTime.trim();
    }
    if (testItem && typeof testItem === 'string' && testItem.trim() !== "") {
      newReservation.testItem = testItem.trim();
    }
    if (sampleCount !== undefined && sampleCount !== null) {
      newReservation.sampleCount = sampleCount;
    }
    if (notes && typeof notes === 'string' && notes.trim() !== "") {
      newReservation.notes = notes.trim();
    }

    data.push(newReservation);
    writeData(data);

    res.json({
      success: true,
      data: newReservation,
    });
  } catch (error) {
    console.error('예약 등록 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * PUT /api/reservations/:id
 * 예약 수정
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = readData();
    const index = data.findIndex((res) => res.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: '예약을 찾을 수 없습니다',
      });
    }

    // 수정
    const updatedReservation = {
      ...data[index],
      ...req.body,
    };

    // 중복 예약 확인 (Conflict Check) - 자기 자신 제외
    // 기간 예약의 경우 전체 기간에 대한 중복 확인
    const isOverlap = data.some((existing) => {
      if (existing.id === id) return false; // 자기 자신은 제외
      if (existing.equipmentId !== updatedReservation.equipmentId) return false;
      if (existing.status === 'cancelled') return false;
      
      // 기간 예약인 경우 날짜 범위 겹침 확인
      const updatedStart = updatedReservation.reservationDate;
      const updatedEnd = updatedReservation.endDate || updatedReservation.reservationDate;
      const existingStart = existing.reservationDate;
      const existingEnd = existing.endDate || existing.reservationDate;
      
      // 날짜 범위가 겹치는지 확인: (updatedStart <= existingEnd) && (updatedEnd >= existingStart)
      if (updatedStart <= existingEnd && updatedEnd >= existingStart) {
        // 같은 날짜 범위에 있으면 시간 겹침 확인
        if (!existing.startTime || !existing.endTime || !updatedReservation.startTime || !updatedReservation.endTime) {
          return true; // 시간 정보가 없으면 같은 날짜 범위에 있으면 무조건 겹침
        }
        // 시간 겹침 확인
        return (updatedReservation.startTime < existing.endTime) && (updatedReservation.endTime > existing.startTime);
      }
      
      return false;
    });

    if (isOverlap) {
      return res.status(409).json({
        success: false,
        error: '해당 시간에 이미 예약이 존재합니다. 다른 시간을 선택해주세요.',
      });
    }

    data[index] = updatedReservation;

    writeData(data);

    res.json({
      success: true,
      data: data[index],
    });
  } catch (error) {
    console.error('예약 수정 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * DELETE /api/reservations/:id
 * 예약 삭제
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = readData();
    const index = data.findIndex((res) => res.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: '예약을 찾을 수 없습니다',
      });
    }

    data.splice(index, 1);
    writeData(data);

    res.json({
      success: true,
      message: '예약이 삭제되었습니다',
    });
  } catch (error) {
    console.error('예약 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

export default router;

