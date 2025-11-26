/**
 * 외부인 출입관리 설정 API 라우트 (소속, 방문목적 관리)
 */

import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_FILE = resolve(__dirname, '../data/visitor-settings.json');

export interface VisitorSettings {
  companies: string[]; // 소속 목록
  purposes: string[]; // 방문목적 목록
  naReasons: string[]; // N/A 사유 목록
}

// 기본 설정 데이터
const defaultSettings: VisitorSettings = {
  companies: [],
  purposes: [],
  naReasons: [],
};

// 데이터 파일 읽기
function readData(): VisitorSettings {
  try {
    if (!existsSync(DATA_FILE)) {
      return defaultSettings;
    }
    const data = readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('데이터 파일 읽기 실패:', error);
    return defaultSettings;
  }
}

// 데이터 파일 쓰기
function writeData(data: VisitorSettings): void {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('데이터 파일 쓰기 실패:', error);
    throw error;
  }
}

const router = Router();

/**
 * GET /api/visitor-settings
 * 설정 조회
 */
router.get('/', (req, res) => {
  try {
    const data = readData();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('설정 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * POST /api/visitor-settings/companies
 * 소속 추가
 */
router.post('/companies', (req, res) => {
  try {
    const { company } = req.body;

    if (!company || typeof company !== 'string' || !company.trim()) {
      return res.status(400).json({
        success: false,
        error: '소속명을 입력하세요',
      });
    }

    const data = readData();
    const trimmedCompany = company.trim();

    // 중복 확인
    if (data.companies.includes(trimmedCompany)) {
      return res.status(400).json({
        success: false,
        error: '이미 존재하는 소속입니다',
      });
    }

    data.companies.push(trimmedCompany);
    data.companies.sort(); // 정렬
    writeData(data);

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('소속 추가 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * PUT /api/visitor-settings/companies/:company
 * 소속 수정
 */
router.put('/companies/:company', (req, res) => {
  try {
    const { company: oldCompany } = req.params;
    const { company: newCompany } = req.body;

    if (!newCompany || typeof newCompany !== 'string' || !newCompany.trim()) {
      return res.status(400).json({
        success: false,
        error: '소속명을 입력하세요',
      });
    }

    const data = readData();
    const decodedOldCompany = decodeURIComponent(oldCompany);
    const trimmedNewCompany = newCompany.trim();

    const index = data.companies.indexOf(decodedOldCompany);
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: '소속을 찾을 수 없습니다',
      });
    }

    // 새 이름이 기존 이름과 다르고 이미 존재하는 경우
    if (trimmedNewCompany !== decodedOldCompany && data.companies.includes(trimmedNewCompany)) {
      return res.status(400).json({
        success: false,
        error: '이미 존재하는 소속입니다',
      });
    }

    data.companies[index] = trimmedNewCompany;
    data.companies.sort(); // 정렬
    writeData(data);

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('소속 수정 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * DELETE /api/visitor-settings/companies/:company
 * 소속 삭제
 */
router.delete('/companies/:company', (req, res) => {
  try {
    const { company } = req.params;
    const data = readData();

    const index = data.companies.indexOf(decodeURIComponent(company));
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: '소속을 찾을 수 없습니다',
      });
    }

    data.companies.splice(index, 1);
    writeData(data);

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('소속 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * POST /api/visitor-settings/purposes
 * 방문목적 추가
 */
router.post('/purposes', (req, res) => {
  try {
    const { purpose } = req.body;

    if (!purpose || typeof purpose !== 'string' || !purpose.trim()) {
      return res.status(400).json({
        success: false,
        error: '방문목적을 입력하세요',
      });
    }

    const data = readData();
    const trimmedPurpose = purpose.trim();

    // 중복 확인
    if (data.purposes.includes(trimmedPurpose)) {
      return res.status(400).json({
        success: false,
        error: '이미 존재하는 방문목적입니다',
      });
    }

    data.purposes.push(trimmedPurpose);
    data.purposes.sort(); // 정렬
    writeData(data);

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('방문목적 추가 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * PUT /api/visitor-settings/purposes/:purpose
 * 방문목적 수정
 */
router.put('/purposes/:purpose', (req, res) => {
  try {
    const { purpose: oldPurpose } = req.params;
    const { purpose: newPurpose } = req.body;

    if (!newPurpose || typeof newPurpose !== 'string' || !newPurpose.trim()) {
      return res.status(400).json({
        success: false,
        error: '방문목적을 입력하세요',
      });
    }

    const data = readData();
    const decodedOldPurpose = decodeURIComponent(oldPurpose);
    const trimmedNewPurpose = newPurpose.trim();

    const index = data.purposes.indexOf(decodedOldPurpose);
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: '방문목적을 찾을 수 없습니다',
      });
    }

    // 새 이름이 기존 이름과 다르고 이미 존재하는 경우
    if (trimmedNewPurpose !== decodedOldPurpose && data.purposes.includes(trimmedNewPurpose)) {
      return res.status(400).json({
        success: false,
        error: '이미 존재하는 방문목적입니다',
      });
    }

    data.purposes[index] = trimmedNewPurpose;
    data.purposes.sort(); // 정렬
    writeData(data);

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('방문목적 수정 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * DELETE /api/visitor-settings/purposes/:purpose
 * 방문목적 삭제
 */
router.delete('/purposes/:purpose', (req, res) => {
  try {
    const { purpose } = req.params;
    const data = readData();

    const index = data.purposes.indexOf(decodeURIComponent(purpose));
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: '방문목적을 찾을 수 없습니다',
      });
    }

    data.purposes.splice(index, 1);
    writeData(data);

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('방문목적 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * POST /api/visitor-settings/na-reasons
 * N/A 사유 추가
 */
router.post('/na-reasons', (req, res) => {
  try {
    const { naReason } = req.body;

    if (!naReason || typeof naReason !== 'string' || !naReason.trim()) {
      return res.status(400).json({
        success: false,
        error: 'N/A 사유를 입력하세요',
      });
    }

    const data = readData();
    const trimmedNaReason = naReason.trim();

    // 중복 확인
    if (data.naReasons.includes(trimmedNaReason)) {
      return res.status(400).json({
        success: false,
        error: '이미 존재하는 N/A 사유입니다',
      });
    }

    data.naReasons.push(trimmedNaReason);
    data.naReasons.sort(); // 정렬
    writeData(data);

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('N/A 사유 추가 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * PUT /api/visitor-settings/na-reasons/:naReason
 * N/A 사유 수정
 */
router.put('/na-reasons/:naReason', (req, res) => {
  try {
    const { naReason: oldNaReason } = req.params;
    const { naReason: newNaReason } = req.body;

    if (!newNaReason || typeof newNaReason !== 'string' || !newNaReason.trim()) {
      return res.status(400).json({
        success: false,
        error: 'N/A 사유를 입력하세요',
      });
    }

    const data = readData();
    const decodedOldNaReason = decodeURIComponent(oldNaReason);
    const trimmedNewNaReason = newNaReason.trim();

    const index = data.naReasons.indexOf(decodedOldNaReason);
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'N/A 사유를 찾을 수 없습니다',
      });
    }

    // 새 이름이 기존 이름과 다르고 이미 존재하는 경우
    if (trimmedNewNaReason !== decodedOldNaReason && data.naReasons.includes(trimmedNewNaReason)) {
      return res.status(400).json({
        success: false,
        error: '이미 존재하는 N/A 사유입니다',
      });
    }

    data.naReasons[index] = trimmedNewNaReason;
    data.naReasons.sort(); // 정렬
    writeData(data);

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('N/A 사유 수정 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * DELETE /api/visitor-settings/na-reasons/:naReason
 * N/A 사유 삭제
 */
router.delete('/na-reasons/:naReason', (req, res) => {
  try {
    const { naReason } = req.params;
    const data = readData();

    const index = data.naReasons.indexOf(decodeURIComponent(naReason));
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'N/A 사유를 찾을 수 없습니다',
      });
    }

    data.naReasons.splice(index, 1);
    writeData(data);

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('N/A 사유 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

export default router;

