/**
 * 사용자 마스터 관리 API 라우트
 */

import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_FILE = resolve(__dirname, '../data/user-master.json');

export interface UserMaster {
  id: string;
  employeeId: string;
  name: string;
  isAdmin?: boolean;
}

// 데이터 파일 읽기
function readData(): UserMaster[] {
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
function writeData(data: UserMaster[]): void {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('데이터 파일 쓰기 실패:', error);
    throw error;
  }
}

const router = Router();

/**
 * GET /api/user-master
 * 전체 사용자 마스터 조회
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
    console.error('사용자 마스터 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * GET /api/user-master/:id
 * 특정 사용자 마스터 조회
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = readData();
    const user = data.find((u) => u.id === id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('사용자 마스터 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * POST /api/user-master
 * 사용자 마스터 등록
 */
router.post('/', (req, res) => {
  try {
    const { employeeId, name, isAdmin } = req.body;

    if (!employeeId || !employeeId.trim()) {
      return res.status(400).json({
        success: false,
        error: '사번은 필수 항목입니다',
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: '이름은 필수 항목입니다',
      });
    }

    const data = readData();
    
    // 사번 중복 확인
    if (data.some((u) => u.employeeId.trim() === employeeId.trim())) {
      return res.status(400).json({
        success: false,
        error: '이미 존재하는 사번입니다',
      });
    }

    // ID 생성
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newUser: UserMaster = {
      id,
      employeeId: employeeId.trim(),
      name: name.trim(),
      isAdmin: isAdmin === true || isAdmin === 'true',
    };

    data.push(newUser);
    writeData(data);

    res.json({
      success: true,
      data: newUser,
    });
  } catch (error) {
    console.error('사용자 마스터 등록 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * PUT /api/user-master/:id
 * 사용자 마스터 수정
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { employeeId, name, isAdmin } = req.body;

    console.log('사용자 수정 요청:', { id, employeeId, name, isAdmin, body: req.body });

    if (!employeeId || !employeeId.trim()) {
      return res.status(400).json({
        success: false,
        error: '사번은 필수 항목입니다',
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: '이름은 필수 항목입니다',
      });
    }

    const data = readData();
    const index = data.findIndex((u) => u.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다',
      });
    }

    // 사번 변경 시 중복 확인
    const newEmployeeId = employeeId.trim();
    if (data.some((u) => u.employeeId.trim() === newEmployeeId && u.id !== id)) {
      return res.status(400).json({
        success: false,
        error: '이미 존재하는 사번입니다',
      });
    }

    // 수정
    // isAdmin 필드 처리: 명시적으로 전달된 경우에만 업데이트
    const updatedUser: UserMaster = {
      ...data[index],
      employeeId: newEmployeeId,
      name: name.trim(),
    };
    
    // isAdmin 필드 처리: req.body에 isAdmin이 있는지 확인
    // 클라이언트에서 항상 isAdmin 필드를 전송하므로, 항상 업데이트
    if ('isAdmin' in req.body) {
      // isAdmin 필드가 요청에 포함되어 있으면 그 값을 사용
      // boolean true 또는 문자열 'true'/'1'이면 관리자, 그 외(false, 'false', '0' 등)는 일반 사용자
      const adminValue = isAdmin === true || isAdmin === 'true' || isAdmin === '1' || isAdmin === 1;
      updatedUser.isAdmin = adminValue;
      console.log('✅ isAdmin 업데이트 성공:', { 
        사용자: updatedUser.name,
        기존값: data[index].isAdmin, 
        새값: adminValue, 
        원본값: isAdmin,
        타입: typeof isAdmin,
        reqBodyKeys: Object.keys(req.body)
      });
    } else {
      // isAdmin이 전달되지 않으면 기존 값 유지 (이 경우는 발생하지 않아야 함)
      updatedUser.isAdmin = data[index].isAdmin;
      console.log('⚠️ isAdmin 필드가 요청에 없음, 기존 값 유지:', { 
        사용자: updatedUser.name,
        기존값: data[index].isAdmin,
        reqBodyKeys: Object.keys(req.body)
      });
    }
    
    data[index] = updatedUser;

    writeData(data);

    console.log('수정된 사용자:', data[index]);

    res.json({
      success: true,
      data: data[index],
    });
  } catch (error) {
    console.error('사용자 마스터 수정 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * DELETE /api/user-master/:id
 * 사용자 마스터 삭제
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = readData();
    const index = data.findIndex((u) => u.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다',
      });
    }

    data.splice(index, 1);
    writeData(data);

    res.json({
      success: true,
      message: '사용자가 삭제되었습니다',
    });
  } catch (error) {
    console.error('사용자 마스터 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

export default router;

