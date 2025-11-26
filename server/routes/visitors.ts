/**
 * 외부인 출입관리 API 라우트
 */

import { Router } from 'express';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readJsonFileSync, writeJsonFileSync } from '../utils/fileStore';
import {
  auditTrailEntrySchema,
  visitorRegistrationSchema,
  visitorReservationSchema,
  visitorFullUpdateSchema,
  visitorUpdateSchema,
} from '../../shared/validation/visitors';
import type { VisitorRegistrationInput, VisitorReservationInput } from '../../shared/validation/visitors';
import { createHash } from 'crypto';
import type { ZodIssue } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_FILE = resolve(__dirname, '../data/visitors.json');
const AUDIT_TRAIL_FILE = resolve(__dirname, '../data/visitor-audit-trail.json');
const AUDIT_TRAIL_LOG_FILE = resolve(__dirname, '../data/visitor-audit-trail.ndjson');

export interface Visitor {
  id: string;
  name: string;
  company: string;
  phone: string;
  purpose: string;
  visitDate: string;
  visitTime: string;
  responsiblePerson: string;
  notes?: string;
  status: string; // pending, approved, rejected, completed, cancelled, reserved
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  completedAt?: string;
  badgeNumber?: string; // 출입증 번호
  // ALCOA+ D.I 교육 관련 필드
  diTrainingCompleted: boolean; // 교육 이수 여부
  diTrainingSignature?: string; // 서명 (Base64 이미지 또는 텍스트)
  diTrainingNA?: boolean; // N/A 체크 여부
  diTrainingNAReason?: string; // N/A 사유
  diTrainingDate?: string; // 교육 이수 날짜
}

export interface AuditTrail {
  id: string;
  timestamp: string;
  action: 'create' | 'update' | 'delete' | 'cancel_reservation' | 'complete_reservation';
  actor: string; // 작업자 (현재는 "시스템", 향후 사용자 정보로 확장 가능)
  entityType: 'visitor';
  entityId: string;
  entityInfo?: {
    name?: string;
    visitDate?: string;
    company?: string;
    status?: string;
  };
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  result: 'success' | 'failed';
  errorMessage?: string;
  details?: string;
  hash: string;
}

type AuditTrailSeed = Omit<AuditTrail, 'hash'>;

const pendingAuditTrailEntries: AuditTrail[] = [];
let auditTrailFlushTimer: NodeJS.Timeout | null = null;
const AUDIT_FLUSH_RETRY_MS = 1_000;
const AUDIT_FLUSH_BATCH_SIZE = 20;
const formatZodError = (issues: ZodIssue[]) => issues.map(issue => issue.message).join(', ');

// 데이터 파일 읽기
function readData(): Visitor[] {
  try {
    return readJsonFileSync<Visitor[]>(DATA_FILE, []);
  } catch (error) {
    console.error('데이터 파일 읽기 실패:', error);
    return [];
  }
}

// 데이터 파일 쓰기
function writeData(data: Visitor[]): void {
  try {
    writeJsonFileSync(DATA_FILE, data);
  } catch (error) {
    console.error('데이터 파일 쓰기 실패:', error);
    throw error;
  }
}

// Audit Trail 데이터 읽기
function readAuditTrail(): AuditTrail[] {
  try {
    const entries = readJsonFileSync<AuditTrail[]>(AUDIT_TRAIL_FILE, []);
    return entries.map((entry) => {
      if (entry.hash) {
        return auditTrailEntrySchema.parse(entry) as AuditTrail;
      }
      const { hash, ...seed } = entry as AuditTrail & { hash?: string };
      const normalized = seed as AuditTrailSeed;
      return auditTrailEntrySchema.parse({ ...normalized, hash: getAuditHash(normalized) }) as AuditTrail;
    });
  } catch (error) {
    console.error('Audit Trail 파일 읽기 실패:', error);
    return [];
  }
}

// Audit Trail 데이터 쓰기
function writeAuditTrail(data: AuditTrail[]): void {
  try {
    writeJsonFileSync(AUDIT_TRAIL_FILE, data);
  } catch (error) {
    console.error('Audit Trail 파일 쓰기 실패:', error);
    throw error;
  }
}

function getAuditHash(payload: AuditTrailSeed): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function appendAuditTrailLog(entries: AuditTrail[]): void {
  if (entries.length === 0) {
    return;
  }
  const dir = dirname(AUDIT_TRAIL_LOG_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const serialized = entries.map(entry => JSON.stringify(entry)).join('\n') + '\n';
  appendFileSync(AUDIT_TRAIL_LOG_FILE, serialized, 'utf-8');
}

function scheduleAuditTrailFlush(delay = AUDIT_FLUSH_RETRY_MS) {
  if (auditTrailFlushTimer) {
    return;
  }
  auditTrailFlushTimer = setTimeout(() => {
    auditTrailFlushTimer = null;
    flushAuditTrailQueue();
  }, delay);
}

function flushAuditTrailQueue(): void {
  if (pendingAuditTrailEntries.length === 0) {
    return;
  }
  const batch = pendingAuditTrailEntries.splice(0, AUDIT_FLUSH_BATCH_SIZE);
  try {
    const auditTrails = readAuditTrail();
    auditTrails.push(...batch);
    writeAuditTrail(auditTrails);
    appendAuditTrailLog(batch);
    if (pendingAuditTrailEntries.length > 0) {
      scheduleAuditTrailFlush(0);
    }
  } catch (error) {
    console.error('Audit Trail 플러시 실패:', error);
    pendingAuditTrailEntries.unshift(...batch);
    scheduleAuditTrailFlush();
  }
}

// Audit Trail 기록 추가
function addAuditTrail(
  action: AuditTrail['action'],
  entityId: string,
  entityInfo: AuditTrail['entityInfo'],
  result: 'success' | 'failed',
  changes?: AuditTrail['changes'],
  errorMessage?: string,
  details?: string
): void {
  try {
    const baseEntry: AuditTrailSeed = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      action,
      actor: '시스템', // 향후 사용자 정보로 확장 가능
      entityType: 'visitor',
      entityId,
      entityInfo,
      changes,
      result,
      errorMessage,
      details,
    };
    const auditTrail: AuditTrail = { ...baseEntry, hash: getAuditHash(baseEntry) };
    pendingAuditTrailEntries.push(auditTrail);
    flushAuditTrailQueue();
  } catch (error) {
    console.error('Audit Trail 기록 실패:', error);
    scheduleAuditTrailFlush();
  }
}

// 지난 날짜의 예약 자동 삭제
function cleanupExpiredReservations(): number {
  try {
    const data = readData();
    const today = new Date().toISOString().split('T')[0];
    const initialLength = data.length;
    
    // 예약 상태이고 방문일자가 오늘보다 이전인 항목 삭제
    const filteredData = data.filter(v => {
      if (v.status === 'reserved' && v.visitDate < today) {
        // Audit Trail 기록
        addAuditTrail(
          'delete',
          v.id,
          { name: v.name, visitDate: v.visitDate, company: v.company, status: v.status },
          'success',
          undefined,
          undefined,
          '지난 날짜 예약 자동 삭제'
        );
        return false; // 삭제 대상
      }
      return true; // 유지
    });
    
    const deletedCount = initialLength - filteredData.length;
    
    if (deletedCount > 0) {
      writeData(filteredData);
      console.log(`지난 날짜 예약 ${deletedCount}건 자동 삭제 완료`);
    }
    
    return deletedCount;
  } catch (error) {
    console.error('지난 날짜 예약 삭제 실패:', error);
    return 0;
  }
}

const router = Router();

/**
 * GET /api/visitors
 * 전체 방문자 조회 (쿼리 파라미터로 필터링 가능)
 */
router.get('/', (req, res) => {
  try {
    // 지난 날짜의 예약 자동 삭제
    cleanupExpiredReservations();
    
    let data = readData();
    
    // 쿼리 파라미터 필터링
    const { 
      startDate, 
      endDate, 
      name, 
      responsiblePerson, 
      status,
      company,
      purpose 
    } = req.query;
    
    const start = typeof startDate === 'string' ? startDate : undefined;
    const end = typeof endDate === 'string' ? endDate : undefined;

    if (start) {
      data = data.filter(v => v.visitDate >= start);
    }
    
    if (end) {
      data = data.filter(v => v.visitDate <= end);
    }
    
    if (name) {
      const searchName = (name as string).toLowerCase();
      data = data.filter(v => v.name.toLowerCase().includes(searchName));
    }
    
    if (responsiblePerson) {
      const searchPerson = (responsiblePerson as string).toLowerCase();
      data = data.filter(v => v.responsiblePerson.toLowerCase().includes(searchPerson));
    }
    
    if (status) {
      data = data.filter(v => v.status === status);
    }
    
    if (company) {
      const searchCompany = (company as string).toLowerCase();
      data = data.filter(v => v.company.toLowerCase().includes(searchCompany));
    }
    
    if (purpose) {
      data = data.filter(v => v.purpose === purpose);
    }
    
    // 날짜순 정렬 (최신순)
    data.sort((a, b) => {
      const dateCompare = b.visitDate.localeCompare(a.visitDate);
      if (dateCompare !== 0) return dateCompare;
      return b.visitTime.localeCompare(a.visitTime);
    });
    
    res.json(data);
  } catch (error) {
    console.error('방문자 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * GET /api/visitors/stats
 * 방문자 통계 조회
 */
router.get('/stats', (_req, res) => {
  try {
    // 지난 날짜의 예약 자동 삭제
    cleanupExpiredReservations();
    
    const data = readData();
    const today = new Date().toISOString().split('T')[0];
    
    const todayVisitors = data.filter(v => v.visitDate === today);
    const pendingCount = data.filter(v => v.status === 'pending').length;
    const approvedCount = data.filter(v => v.status === 'approved').length;
    const completedCount = data.filter(v => v.status === 'completed').length;
    const rejectedCount = data.filter(v => v.status === 'rejected').length;
    
    // 목적별 통계
    const purposeStats: Record<string, number> = {};
    data.forEach(v => {
      purposeStats[v.purpose] = (purposeStats[v.purpose] || 0) + 1;
    });
    
    // 일별 방문자 수 (최근 30일)
    const dailyStats: Record<string, number> = {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    data.forEach(v => {
      if (v.visitDate >= thirtyDaysAgo.toISOString().split('T')[0]) {
        dailyStats[v.visitDate] = (dailyStats[v.visitDate] || 0) + 1;
      }
    });
    
    res.json({
      today: {
        total: todayVisitors.length,
        pending: todayVisitors.filter(v => v.status === 'pending').length,
        approved: todayVisitors.filter(v => v.status === 'approved').length,
        completed: todayVisitors.filter(v => v.status === 'completed').length,
      },
      overall: {
        pending: pendingCount,
        approved: approvedCount,
        completed: completedCount,
        rejected: rejectedCount,
        total: data.length,
      },
      byPurpose: purposeStats,
      daily: dailyStats,
    });
  } catch (error) {
    console.error('통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * GET /api/visitors/audit-trail
 * Audit Trail 조회
 */
router.get('/audit-trail', (req, res) => {
  try {
    const { startDate, endDate, action, name } = req.query;
    let auditTrails = readAuditTrail();

    // 날짜 필터링
    const auditStart = typeof startDate === 'string' ? startDate : undefined;
    const auditEnd = typeof endDate === 'string' ? endDate : undefined;

    if (auditStart) {
      auditTrails = auditTrails.filter(a => a.timestamp >= `${auditStart}T00:00:00.000Z`);
    }
    if (auditEnd) {
      auditTrails = auditTrails.filter(a => a.timestamp <= `${auditEnd}T23:59:59.999Z`);
    }

    // 작업 유형 필터링
    if (action) {
      auditTrails = auditTrails.filter(a => a.action === action);
    }

    // 방문자명 필터링
    const searchName = typeof name === 'string' ? name.toLowerCase() : '';
    if (searchName) {
      auditTrails = auditTrails.filter(a =>
        a.entityInfo?.name?.toLowerCase().includes(searchName)
      );
    }

    // 최신순 정렬
    auditTrails.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    res.json({
      success: true,
      data: auditTrails,
      count: auditTrails.length,
    });
  } catch (error) {
    console.error('Audit Trail 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * GET /api/visitors/:id
 * 특정 방문자 조회
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = readData();
    const visitor = data.find(v => v.id === id);
    
    if (!visitor) {
      return res.status(404).json({
        success: false,
        error: '방문자를 찾을 수 없습니다',
      });
    }
    
    res.json(visitor);
  } catch (error) {
    console.error('방문자 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * POST /api/visitors
 * 방문자 등록
 */
router.post('/', (req, res) => {
  try {
    const isReservation = req.body.status === 'reserved';
    const schema = isReservation ? visitorReservationSchema : visitorRegistrationSchema;
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      const errorMessage = formatZodError(parsed.error.issues);
      console.warn('[VISITOR_VALIDATION_ERROR]', errorMessage);
      return res.status(400).json({
        success: false,
        error: errorMessage,
      });
    }

    const basePayload = parsed.data as VisitorReservationInput;
    const registrationPayload = !isReservation ? (parsed.data as VisitorRegistrationInput) : null;

    // 방문 일자가 오늘 날짜 이전인지 검증
    const today = new Date().toISOString().split('T')[0];
    if (basePayload.visitDate < today) {
      return res.status(400).json({
        success: false,
        error: '방문 일자는 오늘 날짜 이후로만 선택 가능합니다.',
      });
    }

    const data = readData();

    // ID 생성
    const id = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newVisitor: Visitor = {
      id,
      name: basePayload.name,
      company: basePayload.company,
      phone: basePayload.phone,
      purpose: basePayload.purpose,
      visitDate: basePayload.visitDate,
      visitTime: isReservation ? '' : basePayload.visitTime,
      responsiblePerson: basePayload.responsiblePerson,
      status: isReservation ? 'reserved' : 'pending',
      createdAt: new Date().toISOString(),
      diTrainingCompleted: isReservation ? false : !(registrationPayload?.diTrainingNA ?? false),
      diTrainingNA: isReservation ? false : registrationPayload?.diTrainingNA ?? false,
    };

    if (basePayload.notes) {
      newVisitor.notes = basePayload.notes;
    }

    if (!isReservation && registrationPayload) {
      if (registrationPayload.diTrainingSignature) {
        newVisitor.diTrainingSignature = registrationPayload.diTrainingSignature;
      }

      if (registrationPayload.diTrainingNAReason) {
        newVisitor.diTrainingNAReason = registrationPayload.diTrainingNAReason;
      }
    }

    data.push(newVisitor);
    writeData(data);

    // Audit Trail 기록
    addAuditTrail(
      isReservation ? 'create' : 'create',
      id,
      { name: newVisitor.name, visitDate: newVisitor.visitDate, company: newVisitor.company, status: newVisitor.status },
      'success',
      undefined,
      undefined,
      isReservation ? '방문 예약 등록' : '방문자 등록'
    );

    res.json({
      success: true,
      data: newVisitor,
    });
  } catch (error) {
    console.error('방문자 등록 실패:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    
    // Audit Trail 기록 (실패)
    try {
      const tempId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fallbackBody = req.body ?? {};
      addAuditTrail(
        'create',
        tempId,
        {
          name: fallbackBody.name || '',
          visitDate: fallbackBody.visitDate || '',
          company: fallbackBody.company || '',
          status: fallbackBody.status || 'pending',
        },
        'failed',
        undefined,
        errorMessage,
        '방문자 등록 실패'
      );
    } catch (auditError) {
      console.error('Audit Trail 기록 실패:', auditError);
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * PATCH /api/visitors/:id
 * 방문자 상태 업데이트 (승인, 거부, 완료 등)
 */
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  try {
    const parsed = visitorUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      const errorMessage = formatZodError(parsed.error.issues);
      console.warn('[VISITOR_VALIDATION_ERROR]', errorMessage);
      return res.status(400).json({
        success: false,
        error: errorMessage,
      });
    }

    const { status, badgeNumber, name, phone, visitTime, diTrainingNA, diTrainingSignature, diTrainingNAReason } =
      parsed.data;
    
    const data = readData();
    const index = data.findIndex(v => v.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: '방문자를 찾을 수 없습니다',
      });
    }

    const visitor = data[index];
    const oldVisitor = { ...visitor }; // 변경 전 상태 저장
    const now = new Date().toISOString();
    const changes: AuditTrail['changes'] = [];

    // 데이터 무결성: 예약 완료(예약 → pending)만 허용
    // (기존 승인/완료 상태 체크 제거)

    // 방문자명 업데이트 (예약 완료 시)
    if (name !== undefined && name !== visitor.name) {
      changes.push({ field: 'name', oldValue: visitor.name, newValue: name });
      visitor.name = name;
    }

    if (phone !== undefined && phone !== visitor.phone) {
      changes.push({ field: 'phone', oldValue: visitor.phone, newValue: phone });
      visitor.phone = phone;
    }

    if (visitTime !== undefined && visitTime !== visitor.visitTime) {
      changes.push({ field: 'visitTime', oldValue: visitor.visitTime, newValue: visitTime });
      visitor.visitTime = visitTime;
    }

    // 상태 업데이트
    let actionType: AuditTrail['action'] = 'update';
    if (status) {
      // 예약 완료 (reserved → pending)
      if (status === 'pending' && visitor.status === 'reserved') {
        actionType = 'complete_reservation';
      }
      
      if (visitor.status !== status) {
        changes.push({ field: 'status', oldValue: visitor.status, newValue: status });
      }
      visitor.status = status;
    }

    // 예약 완료 시 D.I 교육 정보 업데이트
    if (status === 'pending' && oldVisitor.status === 'reserved') {
      // 예약에서 pending으로 변경되는 경우 (예약 완료)
      if (diTrainingNA !== undefined) {
        visitor.diTrainingNA = diTrainingNA;
        visitor.diTrainingCompleted = !diTrainingNA;
        
        if (diTrainingNA) {
          // N/A인 경우 사유 필수
          if (!diTrainingNAReason || (typeof diTrainingNAReason === 'string' && diTrainingNAReason.trim() === '')) {
            return res.status(400).json({
              success: false,
              error: 'N/A 선택 시 사유를 입력해주세요.',
            });
          }
          visitor.diTrainingNAReason = diTrainingNAReason.trim();
          visitor.diTrainingSignature = undefined;
        } else {
          // N/A가 아닌 경우 서명 필수
          if (!diTrainingSignature || (typeof diTrainingSignature === 'string' && diTrainingSignature.trim() === '')) {
            return res.status(400).json({
              success: false,
              error: 'D.I 준수 교육 서명이 필요합니다.',
            });
          }
          visitor.diTrainingSignature = diTrainingSignature.trim();
          visitor.diTrainingNAReason = undefined;
        }
        visitor.diTrainingDate = now;
      }
    }

    // 출입증 번호 업데이트 (정보 수정용)
    if (badgeNumber !== undefined && badgeNumber !== visitor.badgeNumber) {
      changes.push({ field: 'badgeNumber', oldValue: visitor.badgeNumber || '', newValue: badgeNumber });
      visitor.badgeNumber = badgeNumber;
    }

    data[index] = visitor;
    writeData(data);

    // Audit Trail 기록
    addAuditTrail(
      actionType,
      id,
      { name: visitor.name, visitDate: visitor.visitDate, company: visitor.company, status: visitor.status },
      'success',
      changes.length > 0 ? changes : undefined,
      undefined,
      actionType === 'complete_reservation' ? '예약 완료 (방문 등록)' : undefined
    );

    res.json({
      success: true,
      data: visitor,
    });
  } catch (error) {
    console.error('방문자 업데이트 실패:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    
    // Audit Trail 기록 (실패)
    try {
      const data = readData();
      const visitor = data.find(v => v.id === id);
      if (visitor) {
        addAuditTrail(
          'update',
          id,
          { name: visitor.name, visitDate: visitor.visitDate, company: visitor.company, status: visitor.status },
          'failed',
          undefined,
          errorMessage,
          '방문자 업데이트 실패'
        );
      }
    } catch (auditError) {
      console.error('Audit Trail 기록 실패:', auditError);
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * PUT /api/visitors/:id
 * 방문자 정보 전체 수정 (데이터 무결성 원칙에 따라 제한됨)
 */
router.put('/:id', (req, res) => {
  const { id } = req.params;
  try {
    const parsed = visitorFullUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      const errorMessage = formatZodError(parsed.error.issues);
      console.warn('[VISITOR_VALIDATION_ERROR]', errorMessage);
      return res.status(400).json({
        success: false,
        error: errorMessage,
      });
    }

    const data = readData();
    const index = data.findIndex(v => v.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: '방문자를 찾을 수 없습니다',
      });
    }

    const visitor = data[index];
    
    // 데이터 무결성: 예약 완료(예약 → pending)만 허용
    // (기존 승인/완료 상태 체크 제거)

    const oldVisitor = { ...visitor };
    const payload = parsed.data;

    const updatedVisitor = {
      ...visitor,
      ...payload,
    };

    // 변경 사항 추적
    const changes: AuditTrail['changes'] = [];
    Object.keys(payload).forEach(key => {
      if (oldVisitor[key as keyof Visitor] !== updatedVisitor[key as keyof Visitor]) {
        changes.push({
          field: key,
          oldValue: oldVisitor[key as keyof Visitor],
          newValue: updatedVisitor[key as keyof Visitor],
        });
      }
    });

    data[index] = updatedVisitor;
    writeData(data);

    // Audit Trail 기록
    addAuditTrail(
      'update',
      id,
      { name: updatedVisitor.name, visitDate: updatedVisitor.visitDate, company: updatedVisitor.company, status: updatedVisitor.status },
      'success',
      changes.length > 0 ? changes : undefined,
      undefined,
      '방문자 정보 전체 수정'
    );

    res.json({
      success: true,
      data: updatedVisitor,
    });
  } catch (error) {
    console.error('방문자 수정 실패:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    
    // Audit Trail 기록 (실패)
    try {
      const data = readData();
      const visitor = data.find(v => v.id === id);
      if (visitor) {
        addAuditTrail(
          'update',
          id,
          { name: visitor.name, visitDate: visitor.visitDate, company: visitor.company, status: visitor.status },
          'failed',
          undefined,
          errorMessage,
          '방문자 정보 전체 수정 실패'
        );
      }
    } catch (auditError) {
      console.error('Audit Trail 기록 실패:', auditError);
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * DELETE /api/visitors/:id
 * 방문자 삭제 (데이터 무결성 원칙: 예약 취소만 허용)
 */
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  try {
    const data = readData();
    const index = data.findIndex(v => v.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: '방문자를 찾을 수 없습니다',
      });
    }

    const visitor = data[index];

    // 데이터 무결성: 예약 상태가 아닌 방문자는 삭제 불가
    if (visitor.status !== 'reserved') {
      addAuditTrail(
        'delete',
        id,
        { name: visitor.name, visitDate: visitor.visitDate, company: visitor.company, status: visitor.status },
        'failed',
        undefined,
        '예약 상태가 아닌 방문자는 삭제할 수 없습니다.',
        '데이터 무결성 위반: 삭제 시도'
      );
      return res.status(403).json({
        success: false,
        error: '예약 상태가 아닌 방문자는 삭제할 수 없습니다. 예약 취소만 가능합니다.',
      });
    }

    // 예약 취소만 허용
    data.splice(index, 1);
    writeData(data);

    // Audit Trail 기록
    addAuditTrail(
      'cancel_reservation',
      id,
      { name: visitor.name, visitDate: visitor.visitDate, company: visitor.company, status: visitor.status },
      'success',
      undefined,
      undefined,
      '예약 취소'
    );

    res.json({
      success: true,
      message: '예약이 취소되었습니다',
    });
  } catch (error) {
    console.error('방문자 삭제 실패:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    
    // Audit Trail 기록 (실패)
    try {
      const data = readData();
      const visitor = data.find(v => v.id === id);
      if (visitor) {
        addAuditTrail(
          'delete',
          id,
          { name: visitor.name, visitDate: visitor.visitDate, company: visitor.company, status: visitor.status },
          'failed',
          undefined,
          errorMessage,
          '방문자 삭제 실패'
        );
      }
    } catch (auditError) {
      console.error('Audit Trail 기록 실패:', auditError);
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

export default router;

