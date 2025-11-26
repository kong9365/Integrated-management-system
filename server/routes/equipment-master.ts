/**
 * 시험장비 마스터 관리 API 라우트
 */

import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_FILE = resolve(__dirname, '../data/equipment-master.json');

export interface EquipmentMaster {
  id: string;
  code: string;
  name: string;
  location: string;
}

// 데이터 파일 읽기
function readData(): EquipmentMaster[] {
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
function writeData(data: EquipmentMaster[]): void {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('데이터 파일 쓰기 실패:', error);
    throw error;
  }
}

const router = Router();

/**
 * GET /api/equipment-master
 * 전체 장비 마스터 조회
 */
router.get('/', (req, res) => {
  try {
    const data = readData();
    res.json({
      success: true,
      data,
      count: data.length,
    });
  } catch (error) {
    console.error('장비 마스터 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * GET /api/equipment-master/:id
 * 특정 장비 마스터 조회
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = readData();
    const equipment = data.find((eq) => eq.id === id);
    
    if (!equipment) {
      return res.status(404).json({
        success: false,
        error: '장비를 찾을 수 없습니다',
      });
    }

    res.json({
      success: true,
      data: equipment,
    });
  } catch (error) {
    console.error('장비 마스터 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * POST /api/equipment-master
 * 장비 마스터 등록
 */
router.post('/', (req, res) => {
  try {
    const { code, name, location } = req.body;

    if (!code || !name || !location) {
      return res.status(400).json({
        success: false,
        error: '코드번, 기계명, 위치는 필수 항목입니다',
      });
    }

    const data = readData();
    
    // 코드 중복 확인
    if (data.some((eq) => eq.code === code)) {
      return res.status(400).json({
        success: false,
        error: '이미 존재하는 코드번입니다',
      });
    }

    // ID 생성 (코드번을 ID로 사용)
    const newEquipment: EquipmentMaster = {
      id: code,
      code,
      name,
      location,
    };

    data.push(newEquipment);
    writeData(data);

    res.json({
      success: true,
      data: newEquipment,
    });
  } catch (error) {
    console.error('장비 마스터 등록 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * PUT /api/equipment-master/:id
 * 장비 마스터 수정
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, location } = req.body;

    if (!code || !name || !location) {
      return res.status(400).json({
        success: false,
        error: '코드번, 기계명, 위치는 필수 항목입니다',
      });
    }

    const data = readData();
    const index = data.findIndex((eq) => eq.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: '장비를 찾을 수 없습니다',
      });
    }

    // 코드 변경 시 중복 확인
    if (code !== data[index].code && data.some((eq) => eq.code === code && eq.id !== id)) {
      return res.status(400).json({
        success: false,
        error: '이미 존재하는 코드번입니다',
      });
    }

    // 수정
    data[index] = {
      id: code, // 코드 변경 시 ID도 변경
      code,
      name,
      location,
    };

    writeData(data);

    res.json({
      success: true,
      data: data[index],
    });
  } catch (error) {
    console.error('장비 마스터 수정 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * DELETE /api/equipment-master/:id
 * 장비 마스터 삭제
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = readData();
    const index = data.findIndex((eq) => eq.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: '장비를 찾을 수 없습니다',
      });
    }

    data.splice(index, 1);
    writeData(data);

    res.json({
      success: true,
      message: '장비가 삭제되었습니다',
    });
  } catch (error) {
    console.error('장비 마스터 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

export default router;

