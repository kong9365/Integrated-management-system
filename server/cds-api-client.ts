/**
 * CDS 장비 가동현황 모니터링 시스템 API 클라이언트
 * OpenLab Sample Scheduler API v2 연동
 */

import https from 'https';
import { URL } from 'url';

const BASE_URL = 'https://10.211.2.32:52088/openlab/samplescheduler/api/v2';
const LOGIN_URL = `${BASE_URL}/authentication/login`;
const INSTRUMENTS_URL = `${BASE_URL}/instruments`;

// 환경 변수에서 인증 정보 가져오기 (기본값 제공)
const CDS_USERNAME = process.env.CDS_USERNAME || '10077';
const CDS_PASSWORD = process.env.CDS_PASSWORD || 'kd10077';

interface LoginResponse {
  userToken: string;
}

interface InstrumentState {
  state: string;
}

interface CurrentRun {
  sampleName?: string;
  fullUserName?: string;
  acquisitionMethod?: string;
}

interface Workload {
  totalQueuedAnalyses: number;
}

export interface Instrument {
  name: string;
  state: InstrumentState;
  currentRun?: CurrentRun;
  workload?: Workload;
}

class CDSApiClient {
  private userToken: string | null = null;
  private agent: https.Agent;

  constructor() {
    // SSL 인증서 검증 비활성화 (사내망 환경)
    this.agent = new https.Agent({
      rejectUnauthorized: false,
    });
  }

  /**
   * HTTP 요청 헬퍼 함수
   */
  private async makeRequest(
    url: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    } = {}
  ): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const requestOptions: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        agent: this.agent,
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ status: res.statusCode || 500, body: data });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  /**
   * CDS 시스템에 로그인하고 토큰 획득
   */
  async login(): Promise<boolean> {
    if (this.userToken) {
      return true; // 이미 로그인됨
    }

    const loginPayload = {
      userName: CDS_USERNAME,
      password: CDS_PASSWORD,
      domain: '',
    };

    const headers = {
      'Content-Type': 'application/json',
      Origin: 'https://10.211.2.32:52088',
      Referer: 'https://10.211.2.32:52088/openlab/samplescheduler/',
      'User-Agent': 'Mozilla/5.0',
    };

    try {
      const response = await this.makeRequest(LOGIN_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(loginPayload),
      });

      if (response.status !== 200) {
        throw new Error(`Login failed: ${response.status}`);
      }

      const result: LoginResponse = JSON.parse(response.body);
      this.userToken = result.userToken;

      if (!this.userToken) {
        throw new Error('userToken not found in response');
      }

      console.log('CDS API 로그인 성공');
      return true;
    } catch (error) {
      console.error('CDS API 로그인 실패:', error);
      this.userToken = null;
      return false;
    }
  }

  /**
   * 모든 장비 데이터 수집
   */
  async getInstruments(): Promise<Instrument[]> {
    // 토큰이 없으면 로그인 시도
    if (!this.userToken) {
      const loggedIn = await this.login();
      if (!loggedIn) {
        throw new Error('로그인 실패로 인해 장비 데이터를 가져올 수 없습니다');
      }
    }

    const headers = {
      Accept: 'application/json',
      Referer: 'https://10.211.2.32:52088/openlab/samplescheduler/',
      usertoken: this.userToken!,
    };

    try {
      const response = await this.makeRequest(INSTRUMENTS_URL, {
        method: 'GET',
        headers,
      });

      if (response.status !== 200) {
        // 401 등 인증 오류 시 토큰 초기화하고 재로그인 시도
        if (response.status === 401) {
          this.userToken = null;
          const loggedIn = await this.login();
          if (loggedIn) {
            return this.getInstruments(); // 재귀 호출로 재시도
          }
        }
        throw new Error(`Failed to fetch instruments: ${response.status}`);
      }

      const instruments: Instrument[] = JSON.parse(response.body);
      console.log(`CDS API에서 ${instruments.length}개 장비 데이터 수집 완료`);
      return instruments;
    } catch (error) {
      console.error('장비 데이터 수집 실패:', error);
      // 네트워크 오류 등으로 실패 시 토큰 초기화
      this.userToken = null;
      throw error;
    }
  }

  /**
   * 특정 장비의 상태 조회
   */
  async getInstrumentStatus(instrumentName: string): Promise<Instrument | null> {
    const instruments = await this.getInstruments();
    return instruments.find((inst) => inst.name === instrumentName) || null;
  }

  /**
   * 토큰 초기화 (강제 재로그인)
   */
  resetToken(): void {
    this.userToken = null;
  }

  /**
   * 실시간 장비 데이터 수집 및 JSONL 저장
   * Python 버전의 collect_instrument_data()와 동일한 기능
   */
  async collectInstrumentData(logFilePath: string): Promise<boolean> {
    // 토큰이 없으면 로그인 시도
    if (!this.userToken) {
      const loggedIn = await this.login();
      if (!loggedIn) {
        console.error('❌ 로그인 실패로 데이터 수집 불가');
        return false;
      }
    }

    const headers = {
      Accept: 'application/json',
      Referer: 'https://10.211.2.32:52088/openlab/samplescheduler/',
      usertoken: this.userToken!,
    };

    try {
      const response = await this.makeRequest(INSTRUMENTS_URL, {
        method: 'GET',
        headers,
      });

      if (response.status !== 200) {
        // 401 등 인증 오류 시 토큰 초기화하고 재로그인 시도
        if (response.status === 401) {
          this.userToken = null;
          const loggedIn = await this.login();
          if (loggedIn) {
            return this.collectInstrumentData(logFilePath); // 재귀 호출로 재시도
          }
        }
        throw new Error(`Failed to fetch instruments: ${response.status}`);
      }

      const instruments: Instrument[] = JSON.parse(response.body);
      console.log(`📡 데이터 수집 성공: ${instruments.length}개 장비`);

      // JSONL 파일에 저장 (append 모드)
      const fs = await import('fs');
      const currentTime = new Date().toISOString();

      const logEntries: string[] = [];
      for (const inst of instruments) {
        const logEntry: any = {
          timestamp: currentTime,
          name: inst.name || 'Unknown',
          state: inst.state?.state || 'Unknown',
          sampleName: null,
          fullUserName: null,
          acquisitionMethod: null,
        };

        // Running/PreRun 상태일 때만 상세 정보 저장
        const currentState = logEntry.state;
        if (currentState === 'Running' || currentState === 'PreRun') {
          const currentRunInfo = inst.currentRun || {};
          logEntry.sampleName = currentRunInfo.sampleName || null;
          logEntry.fullUserName = currentRunInfo.fullUserName || null;
          logEntry.acquisitionMethod = currentRunInfo.acquisitionMethod || null;
        }

        logEntries.push(JSON.stringify(logEntry));
      }

      // 파일에 append
      fs.appendFileSync(logFilePath, logEntries.join('\n') + '\n', 'utf-8');

      return true;
    } catch (error) {
      console.error('❌ 데이터 수집 실패:', error);
      this.userToken = null;
      return false;
    }
  }
}

// 싱글톤 인스턴스
export const cdsApiClient = new CDSApiClient();

