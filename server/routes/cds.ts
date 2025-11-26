/**
 * CDS 장비 가동현황 API 라우트
 */

import { Router } from 'express';
import { cdsApiClient, Instrument } from '../cds-api-client.js';
import {
  processJsonlToSessions,
  createSampleData,
} from '../cds-utilization.js';
import { collectDataNow } from '../cds-data-collector.js';
import { readJsonFileSync, writeJsonFileSync } from '../utils/fileStore.js';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import multer from 'multer';
import { existsSync, mkdirSync } from 'fs';

const router = Router();

/**
 * GET /api/cds/instruments
 * 모든 장비 상태 조회
 */
router.get('/instruments', async (req, res) => {
  try {
    const instruments = await cdsApiClient.getInstruments();
    res.json({
      success: true,
      data: instruments,
      count: instruments.length,
    });
  } catch (error) {
    console.error('장비 데이터 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * GET /api/cds/instruments/:name
 * 특정 장비 상태 조회
 */
router.get('/instruments/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const instrument = await cdsApiClient.getInstrumentStatus(name);
    
    if (!instrument) {
      return res.status(404).json({
        success: false,
        error: '장비를 찾을 수 없습니다',
      });
    }

    res.json({
      success: true,
      data: instrument,
    });
  } catch (error) {
    console.error('장비 상태 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * GET /api/cds/stats
 * 장비 상태 통계 조회
 */
router.get('/stats', async (req, res) => {
  try {
    const instruments = await cdsApiClient.getInstruments();
    
    const stats = {
      total: instruments.length,
      byStatus: {} as Record<string, number>,
      running: instruments.filter((inst) => 
        inst.state.state === 'Running' || inst.state.state === 'PreRun'
      ).length,
      idle: instruments.filter((inst) => inst.state.state === 'Idle').length,
      notReady: instruments.filter((inst) => inst.state.state === 'NotReady').length,
      notConnected: instruments.filter((inst) => inst.state.state === 'NotConnected').length,
      sleep: instruments.filter((inst) => inst.state.state === 'Sleep').length,
    };

    // 상태별 카운트
    instruments.forEach((inst) => {
      const status = inst.state.state;
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('장비 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * GET /api/cds/utilization
 * 장비 가동률 데이터 조회 (세션 데이터)
 */
router.get('/utilization', async (req, res) => {
  try {
    const { startDate, endDate, equipment, user, analysis, product, timeperiod } = req.query;

    // JSONL에서 세션 데이터 처리
    let sessions = processJsonlToSessions();

    // 데이터가 없으면 샘플 데이터 사용
    if (sessions.length === 0) {
      console.log('📊 JSONL 데이터가 없어 샘플 데이터를 사용합니다');
      sessions = createSampleData();
    }

    // 필터링
    let filteredSessions = sessions;

    if (startDate) {
      filteredSessions = filteredSessions.filter(
        (s) => s.집계일자 >= startDate as string
      );
    }

    if (endDate) {
      filteredSessions = filteredSessions.filter(
        (s) => s.집계일자 <= endDate as string
      );
    }

    if (equipment) {
      const equipmentList = Array.isArray(equipment)
        ? equipment
        : [equipment];
      filteredSessions = filteredSessions.filter((s) =>
        equipmentList.includes(s.장비)
      );
    }

    if (user) {
      const userList = Array.isArray(user) ? user : [user];
      filteredSessions = filteredSessions.filter((s) =>
        userList.includes(s.시험자)
      );
    }

    if (analysis) {
      const analysisList = Array.isArray(analysis) ? analysis : [analysis];
      filteredSessions = filteredSessions.filter((s) =>
        analysisList.includes(s.acquisitionMethod)
      );
    }

    if (product) {
      const productList = Array.isArray(product) ? product : [product];
      filteredSessions = filteredSessions.filter((s) =>
        productList.includes(s.샘플명)
      );
    }

    if (timeperiod) {
      const timeperiodList = Array.isArray(timeperiod) ? timeperiod : [timeperiod];
      filteredSessions = filteredSessions.filter((s) => {
        if (!s.세션시작) return false;
        const hour = new Date(s.세션시작).getHours();
        return timeperiodList.some((tp) => {
          if (tp === 'AM') return hour < 12;
          if (tp === 'PM') return hour >= 12;
          return false;
        });
      });
    }

    res.json({
      success: true,
      data: filteredSessions,
      count: filteredSessions.length,
    });
  } catch (error) {
    console.error('가동률 데이터 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * GET /api/cds/utilization/stats
 * 가동률 통계 조회 (장비별, 사용자별 랭킹)
 */
router.get('/utilization/stats', async (req, res) => {
  try {
    const { startDate, endDate, equipment, user, analysis, product, timeperiod } = req.query;

    // JSONL에서 세션 데이터 처리
    let sessions = processJsonlToSessions();

    // 데이터가 없으면 샘플 데이터 사용
    if (sessions.length === 0) {
      sessions = createSampleData();
    }

    // 필터링
    let filteredSessions = sessions;

    if (startDate) {
      filteredSessions = filteredSessions.filter(
        (s) => s.집계일자 >= startDate as string
      );
    }

    if (endDate) {
      filteredSessions = filteredSessions.filter(
        (s) => s.집계일자 <= endDate as string
      );
    }

    if (equipment) {
      const equipmentList = Array.isArray(equipment)
        ? equipment
        : [equipment];
      filteredSessions = filteredSessions.filter((s) =>
        equipmentList.includes(s.장비)
      );
    }

    if (user) {
      const userList = Array.isArray(user) ? user : [user];
      filteredSessions = filteredSessions.filter((s) =>
        userList.includes(s.시험자)
      );
    }

    if (analysis) {
      const analysisList = Array.isArray(analysis) ? analysis : [analysis];
      filteredSessions = filteredSessions.filter((s) =>
        analysisList.includes(s.acquisitionMethod)
      );
    }

    if (product) {
      const productList = Array.isArray(product) ? product : [product];
      filteredSessions = filteredSessions.filter((s) =>
        productList.includes(s.샘플명)
      );
    }

    if (timeperiod) {
      const timeperiodList = Array.isArray(timeperiod) ? timeperiod : [timeperiod];
      filteredSessions = filteredSessions.filter((s) => {
        if (!s.세션시작) return false;
        const hour = new Date(s.세션시작).getHours();
        return timeperiodList.some((tp) => {
          if (tp === 'AM') return hour < 12;
          if (tp === 'PM') return hour >= 12;
          return false;
        });
      });
    }

    // 장비별 랭킹
    const equipmentRanking = new Map<string, number>();
    filteredSessions.forEach((s) => {
      equipmentRanking.set(
        s.장비,
        (equipmentRanking.get(s.장비) || 0) + s.가동시간_h
      );
    });

    const equipmentRankingList = Array.from(equipmentRanking.entries())
      .map(([장비, 가동시간_h]) => ({ 장비, 가동시간_h }))
      .sort((a, b) => b.가동시간_h - a.가동시간_h)
      .map((item, index) => ({ 순위: index + 1, ...item }));

    // 사용자별 랭킹
    const userRanking = new Map<string, number>();
    filteredSessions.forEach((s) => {
      if (s.시험자) {
        userRanking.set(
          s.시험자,
          (userRanking.get(s.시험자) || 0) + s.가동시간_h
        );
      }
    });

    const userRankingList = Array.from(userRanking.entries())
      .map(([시험자, 가동시간_h]) => ({ 시험자, 가동시간_h }))
      .sort((a, b) => b.가동시간_h - a.가동시간_h)
      .map((item, index) => ({ 순위: index + 1, ...item }));

    res.json({
      success: true,
      data: {
        equipmentRanking: equipmentRankingList,
        userRanking: userRankingList,
      },
    });
  } catch (error) {
    console.error('가동률 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * POST /api/cds/utilization/collect
 * 수동 데이터 수집 (즉시 실행)
 */
router.post('/utilization/collect', async (req, res) => {
  try {
    const success = await collectDataNow();
    res.json({
      success,
      message: success ? '데이터 수집이 완료되었습니다' : '데이터 수집에 실패했습니다',
    });
  } catch (error) {
    console.error('수동 데이터 수집 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * GET /api/cds/utilization/options
 * 필터 옵션 조회 (장비 목록, 사용자 목록, 분석법 목록)
 */
router.get('/utilization/options', async (req, res) => {
  try {
    // JSONL에서 세션 데이터 처리
    let sessions = processJsonlToSessions();

    // 데이터가 없으면 샘플 데이터 사용
    if (sessions.length === 0) {
      sessions = createSampleData();
    }

    const equipmentOptions = Array.from(
      new Set(sessions.map((s) => s.장비))
    ).sort();

    const userOptions = Array.from(
      new Set(sessions.map((s) => s.시험자).filter((u) => u))
    ).sort();

    const analysisOptions = Array.from(
      new Set(sessions.map((s) => s.acquisitionMethod).filter((a) => a))
    ).sort();

    const productOptions = Array.from(
      new Set(sessions.map((s) => s.샘플명).filter((p) => p))
    ).sort();

    res.json({
      success: true,
      data: {
        equipment: equipmentOptions.map((eq) => ({ label: eq, value: eq })),
        users: userOptions.map((user) => ({ label: user, value: user })),
        analysis: analysisOptions.map((analysis) => ({
          label: analysis,
          value: analysis,
        })),
        products: productOptions.map((product) => ({
          label: product,
          value: product,
        })),
        timeperiods: [
          { label: 'AM', value: 'AM' },
          { label: 'PM', value: 'PM' },
        ],
      },
    });
  } catch (error) {
    console.error('필터 옵션 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const EQUIPMENT_COSTS_FILE = resolve(PROJECT_ROOT, 'server', 'data', 'equipment-costs.json');
const ANALYSIS_MAPPING_FILE = resolve(PROJECT_ROOT, 'server', 'data', 'analysis-mapping.json');

/**
 * GET /api/cds/equipment-costs
 * 장비별 유지보수 비용 조회
 */
router.get('/equipment-costs', async (req, res) => {
  try {
    const costs = readJsonFileSync<Record<string, number>>(EQUIPMENT_COSTS_FILE, {});
    res.json({
      success: true,
      data: costs,
    });
  } catch (error) {
    console.error('유지보수 비용 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * PUT /api/cds/equipment-costs
 * 장비별 유지보수 비용 업데이트
 */
router.put('/equipment-costs', async (req, res) => {
  try {
    const { costs } = req.body;
    if (!costs || typeof costs !== 'object') {
      return res.status(400).json({
        success: false,
        error: '비용 데이터가 올바르지 않습니다',
      });
    }

    writeJsonFileSync(EQUIPMENT_COSTS_FILE, costs);
    res.json({
      success: true,
      message: '유지보수 비용이 업데이트되었습니다',
      data: costs,
    });
  } catch (error) {
    console.error('유지보수 비용 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

// Excel 파일 업로드를 위한 multer 설정
const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = resolve(PROJECT_ROOT, 'uploads', 'equipment-costs');
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, `${timestamp}-${originalName}`);
  },
});

const excelUpload = multer({
  storage: excelStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /xlsx|xls|csv/;
    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
    if (allowedTypes.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Excel 또는 CSV 파일만 업로드 가능합니다'));
    }
  },
});

/**
 * POST /api/cds/equipment-costs/upload
 * Excel/CSV 파일로 유지보수 비용 업로드
 */
router.post('/equipment-costs/upload', excelUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '파일을 업로드하세요',
      });
    }

    // Excel 파일 파싱 (간단한 구현, 실제로는 xlsx 라이브러리 필요)
    // 여기서는 JSON 파일로 변환된 것으로 가정
    const filePath = req.file.path;
    const fs = await import('fs');
    const fileContent = await fs.promises.readFile(filePath, 'utf-8');
    
    // CSV 파싱 (간단한 구현)
    let costs: Record<string, number> = {};
    if (req.file.originalname.endsWith('.csv')) {
      const lines = fileContent.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      const equipmentIndex = headers.findIndex(h => h.includes('장비') || h.includes('equipment'));
      const costIndex = headers.findIndex(h => h.includes('비용') || h.includes('cost'));

      if (equipmentIndex === -1 || costIndex === -1) {
        return res.status(400).json({
          success: false,
          error: 'CSV 파일 형식이 올바르지 않습니다. 장비명과 비용 컬럼이 필요합니다',
        });
      }

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const equipment = values[equipmentIndex];
        const cost = parseFloat(values[costIndex]);
        if (equipment && !isNaN(cost)) {
          costs[equipment] = cost;
        }
      }
    }

    // 기존 비용과 병합
    const existingCosts = readJsonFileSync<Record<string, number>>(EQUIPMENT_COSTS_FILE, {});
    const mergedCosts = { ...existingCosts, ...costs };
    writeJsonFileSync(EQUIPMENT_COSTS_FILE, mergedCosts);

    res.json({
      success: true,
      message: '유지보수 비용이 업로드되었습니다',
      data: mergedCosts,
    });
  } catch (error) {
    console.error('파일 업로드 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * GET /api/cds/analysis-mapping
 * 분석법 매핑 데이터 조회
 */
router.get('/analysis-mapping', async (req, res) => {
  try {
    const mapping = readJsonFileSync<Record<string, string>>(ANALYSIS_MAPPING_FILE, {});
    res.json({
      success: true,
      data: mapping,
    });
  } catch (error) {
    console.error('분석법 매핑 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * POST /api/cds/analysis-mapping/upload
 * 분석법 매핑 파일 업로드
 */
const analysisMappingUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = resolve(PROJECT_ROOT, 'uploads', 'analysis-mapping');
      if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `mapping-${uniqueSuffix}-${file.originalname}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.post('/analysis-mapping/upload', analysisMappingUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '파일이 업로드되지 않았습니다',
      });
    }

    const fs = await import('fs/promises');
    const fileContent = await fs.readFile(req.file.path, 'utf-8');

    // CSV 파싱 (간단한 구현)
    let mapping: Record<string, string> = {};
    if (req.file.originalname.endsWith('.csv')) {
      const lines = fileContent.split('\n').filter(line => line.trim());
      for (let i = 0; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length >= 2) {
          const original = values[0];
          const mapped = values[1];
          if (original && mapped) {
            mapping[original] = mapped;
          }
        }
      }
    } else {
      // Excel 파일의 경우 향후 xlsx 파서 추가 필요
      return res.status(400).json({
        success: false,
        error: '현재는 CSV 파일만 지원합니다. Excel 파일 지원은 향후 추가 예정입니다.',
      });
    }

    // 기존 매핑과 병합
    const existingMapping = readJsonFileSync<Record<string, string>>(ANALYSIS_MAPPING_FILE, {});
    const mergedMapping = { ...existingMapping, ...mapping };
    writeJsonFileSync(ANALYSIS_MAPPING_FILE, mergedMapping);

    // 업로드된 파일 삭제
    try {
      await fs.unlink(req.file.path);
    } catch (unlinkError) {
      console.warn('업로드 파일 삭제 실패:', unlinkError);
    }

    res.json({
      success: true,
      message: '분석법 매핑이 업로드되었습니다',
      data: mergedMapping,
    });
  } catch (error) {
    console.error('파일 업로드 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * POST /api/cds/ai-report
 * LM Studio를 활용한 AI 보고서 생성
 */
router.post('/ai-report', async (req, res) => {
  try {
    const { reportType, dataSummary, options } = req.body;

    // LM Studio API 호출
    const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://172.17.0.57:1234/v1/chat/completions';

    const prompt = `당신은 제약회사의 분석장비 관리 전문가입니다. 다음 데이터를 바탕으로 핵심 인사이트를 3-5개 bullet point로 작성해주세요.

데이터:
${dataSummary}

다음 관점에서 분석해주세요:
1. 가동률이 높은/낮은 장비 식별
2. 유지보수 계약 재검토가 필요한 장비
3. 업무 피크 시간대 및 리소스 배치
4. 비용 절감 기회

간결하고 실행 가능한 제안을 해주세요.`;

    const payload = {
      model: 'local-model',
      messages: [
        {
          role: 'system',
          content: '당신은 제약회사의 분석장비 관리 전문가입니다.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    };

    try {
      const response = await fetch(LM_STUDIO_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`LM Studio API 오류: ${response.statusText}`);
      }

      const result = await response.json();
      const insights = result.choices?.[0]?.message?.content || 'AI 분석 결과를 가져올 수 없습니다.';

      res.json({
        success: true,
        data: {
          insights,
          reportType,
        },
      });
    } catch (fetchError) {
      console.error('LM Studio 연동 실패:', fetchError);
      // LM Studio가 연결되지 않은 경우 기본 인사이트 반환
      res.json({
        success: true,
        data: {
          insights: `📊 보고서 유형: ${reportType}\n\n${dataSummary}\n\n💡 AI 분석 서비스가 연결되지 않아 기본 요약만 제공됩니다.`,
          reportType,
        },
      });
    }
  } catch (error) {
    console.error('AI 보고서 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

export default router;

