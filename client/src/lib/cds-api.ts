/**
 * CDS API 공통 타입 및 훅
 * 시험장비 가동현황과 시험장비 가동률 페이지에서 공통으로 사용
 */

import { useQuery } from '@tanstack/react-query';

// ====== 공통 타입 정의 ======
export interface InstrumentState {
  state: string;
}

export interface CurrentRun {
  sampleName?: string;
  fullUserName?: string;
  acquisitionMethod?: string;
}

export interface Workload {
  totalQueuedAnalyses: number;
}

export interface Instrument {
  name: string;
  state: InstrumentState;
  currentRun?: CurrentRun;
  workload?: Workload;
}

export interface InstrumentsResponse {
  success: boolean;
  data: Instrument[];
  count: number;
}

export interface StatsResponse {
  success: boolean;
  data: {
    total: number;
    byStatus: Record<string, number>;
    running: number;
    idle: number;
    notReady: number;
    notConnected: number;
    sleep: number;
  };
}

// ====== 공통 상수 ======
export const STATUS_COLORS: Record<string, string> = {
  NotReady: '#ffcc00',
  Running: '#007bff',
  Idle: '#28a745',
  NotConnected: '#6c757d',
  Sleep: '#17a2b8',
  PreRun: '#007bff',
};

export const GROUP_CLASSIFICATION: Record<string, string[]> = {
  HPLC장비: [
    'HPLC Agilent-14',
    'HPLC Agilent-18',
    'HPLC Agilent-19',
    'HPLC Agilent-20',
    'HPLC Agilent-21',
    'HPLC Agilent-23',
    'HPLC Agilent-24',
    'HPLC Agilent-25',
    'HPLC Agilent-26',
    'HPLC Agilent-27',
    'HPLC Agilent-28',
    'HPLC Agilent-29',
    'HPLC Agilent-30',
    'HPLC Agilent-31',
    'HPLC Agilent-15',
    'HPLC Agilent-16',
    'HPLC Agilent-17',
    'HPLC Agilent-22',
    'UHPLC',
  ],
  GC장비: [
    'GC (FID/FPD)',
    'GC (NPD/TCD/FID)',
    'GC-5 (FID/FID)',
    'GC-Headspace (FID/ECD)',
    'GC-Headspace (FID/FPD)',
  ],
  'GC/MS장비': ['GC/MS Agilent-3', 'GC/MS Agilent'],
};

export const ROOM_CLASSIFICATION: Record<string, string[]> = {
  LC실1: [
    'UHPLC',
    'HPLC Agilent-15',
    'HPLC Agilent-16',
    'HPLC Agilent-17',
    'HPLC Agilent-22',
  ],
  LC실2: [
    'HPLC Agilent-14',
    'HPLC Agilent-18',
    'HPLC Agilent-19',
    'HPLC Agilent-20',
    'HPLC Agilent-21',
    'HPLC Agilent-23',
    'HPLC Agilent-24',
    'HPLC Agilent-25',
    'HPLC Agilent-26',
    'HPLC Agilent-27',
    'HPLC Agilent-28',
    'HPLC Agilent-29',
    'HPLC Agilent-30',
    'HPLC Agilent-31',
  ],
  GC실: [
    'GC (FID/FPD)',
    'GC (NPD/TCD/FID)',
    'GC-5 (FID/FID)',
    'GC-Headspace (FID/ECD)',
    'GC-Headspace (FID/FPD)',
    'GC/MS Agilent-3',
    'GC/MS Agilent',
  ],
};

// ====== 공통 API 훅 ======

/**
 * 장비 목록 조회 훅
 */
export function useInstruments(refetchInterval?: number) {
  return useQuery<InstrumentsResponse>({
    queryKey: ['cds-instruments'],
    queryFn: async () => {
      const response = await fetch('/api/cds/instruments');
      if (!response.ok) {
        throw new Error('장비 데이터를 가져오는데 실패했습니다');
      }
      return response.json();
    },
    refetchInterval: refetchInterval || 5000, // 기본 5초
    staleTime: 0,
    refetchOnMount: true,
  });
}

/**
 * 장비 통계 조회 훅
 */
export function useStats(refetchInterval?: number) {
  return useQuery<StatsResponse>({
    queryKey: ['cds-stats'],
    queryFn: async () => {
      const response = await fetch('/api/cds/stats');
      if (!response.ok) {
        throw new Error('통계 데이터를 가져오는데 실패했습니다');
      }
      return response.json();
    },
    refetchInterval: refetchInterval || 5000, // 기본 5초
    staleTime: 0,
    refetchOnMount: true,
  });
}

/**
 * 수동 데이터 수집 함수
 */
export async function collectDataNow(): Promise<boolean> {
  try {
    const response = await fetch('/api/cds/utilization/collect', {
      method: 'POST',
    });
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('수동 수집 실패:', error);
    return false;
  }
}

