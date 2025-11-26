/**
 * 센서 데이터 수집 API 라우트
 * Python Dash 앱의 collect_data 함수와 동일한 기능
 */

import { Router } from 'express';
import https from 'https';
import { URL } from 'url';
import { readSensorSettings } from './sensor-settings.js';

const router = Router();

// CDS 센서 시스템 설정 (Python 코드와 동일)
const SENSOR_BASE_URL = 'https://10.217.2.31';
const LOGIN_URL = `${SENSOR_BASE_URL}/__login__`;
const REALTIME_URL = `${SENSOR_BASE_URL}/json/locations-locations_table_smooth`;

// 세션 관리 (Python 코드와 동일하게 단순화)
let sessionCookie: string | null = null;

// 센서 이름 → 그룹 이름 매핑 (Python 코드와 동일)
const sensorToGroup: Record<string, string> = {
  // 보관용검체보관실(349) 센서들
  "온도1(W4710677)": "보관용검체보관실(349)",
  "습도1(W4710677)": "보관용검체보관실(349)",
  "온도1(W4710595)": "보관용검체보관실(349)",
  "습도1(W4710595)": "보관용검체보관실(349)",
  "온도1(W4710679)": "보관용검체보관실(349)",
  "습도1(W4710679)": "보관용검체보관실(349)",
  
  // 안정성검체실(318) 센서들
  "온도1(W4710549)": "안정성검체실(318)",
  "습도1(W4710549)": "안정성검체실(318)",
  "온도1(W4710554)": "안정성검체실(318)",
  "습도1(W4710554)": "안정성검체실(318)",
  "온도1(W4710606)": "안정성검체실(318)",
  "습도1(W4710606)": "안정성검체실(318)",
  
  // 표준품보관실(309) 센서들
  "온도1(W4710597)": "표준품보관실(309)",
  "습도1(W4710597)": "표준품보관실(309)",
  
  // B1F 검체채취실(B09) 센서들
  "온도1(W4710589)": "B1F 검체채취실(B09)",
  "습도1(W4710589)": "B1F 검체채취실(B09)",
  
  // 검체냉장고(2378) 센서들
  "온도1(W4965600)": "검체냉장고(2378)",
  "온도2(W4965595)": "검체냉장고(2378)",
  
  // 안정성챔버(905) 센서들
  "온도1(W4710590)": "안정성챔버(905)",
  "습도1(W4710590)": "안정성챔버(905)",
  "온도2(W4710604)": "안정성챔버(905)",
  "습도2(W4710604)": "안정성챔버(905)",
  "온도3_battery test": "안정성챔버(905)",
  "습도3_battery test": "안정성챔버(905)",
  
  // 안정성챔버2(2732) 센서들
  "온도1(W4710592)": "안정성챔버2(2732)",
  "습도1(W4710592)": "안정성챔버2(2732)",
  "온도2(W4710678)": "안정성챔버2(2732)",
  "습도2(W4710678)": "안정성챔버2(2732)",
  
  // 냉장형필터시약장1(2946) 센서들
  "온도1(W4965599)": "냉장형필터시약장1(2946)",
  "온도2(W4965597)": "냉장형필터시약장1(2946)",
  
  // 표준품냉장고(1233) 센서들
  "온도1(W4965665)": "표준품냉장고(1233)",
  "온도2(W4965658)": "표준품냉장고(1233)",
  
  // 냉동고1(2047) 센서들
  "온도1(W5043287)": "냉동고1(2047)",
  "온도2(W5043289)": "냉동고1(2047)",
  
  // 보관검체냉장고1(2658) 센서들
  "온도1(W4965659)": "보관검체냉장고1(2658)",
  "온도2(W4965657)": "보관검체냉장고1(2658)",
  
  // 이화학시험실(305) 센서들
  "온도1(X2121877)": "이화학시험실(305)",
  "습도1(X2121877)": "이화학시험실(305)",
  
  // 칭량실(308) 센서들
  "온도1(X2121724)": "칭량실(308)",
  "습도1(X2121724)": "칭량실(308)",
  
  // 시약보관실1(311) 센서들
  "온도1(X2121871)": "시약보관실1(311)",
  "습도1(X2121871)": "시약보관실1(311)",
  
  // 시약보관실2(367) 센서들
  "온도1(W4710603)": "시약보관실2(367)",
  "습도1(W4710603)": "시약보관실2(367)",
  
  // 일반기기실2(316) 센서들
  "온도1(X2121884)": "일반기기실2(316)",
  "습도1(X2121884)": "일반기기실2(316)",
  
  // GC실(307) 센서들
  "온도1(X2121876)": "GC실(307)",
  "습도1(X2121876)": "GC실(307)",
  
  // LC실1(303) 센서들
  "온도1(X1919453)": "LC실1(303)",
  "습도1(X1919453)": "LC실1(303)",
  
  // LC실2(304) 센서들
  "온도1(X2121885)": "LC실2(304)",
  "습도1(X2121885)": "LC실2(304)",
  
  // 감압건조기(904) 센서들
  "온도1(25221009)": "감압건조기(904)",
  
  // 회화로2(2726) 센서들
  "온도1(25221010)": "회화로2(2726)",
  
  // DRY OVEN(663) 센서들
  "온도1(25221011)": "DRY OVEN(663)",
  
  // 미생물실 센서들
  "온도1(W5043294)": "Incubator(1522)",
  "온도2(W5043293)": "Incubator(1522)",
  "온도1(W4965664)": "Incubator(2960)",
  "온도2(W4965663)": "Incubator(2960)",
  "온도1(W5043298)": "저온배양기2(2868)",
  "온도2(W5043292)": "저온배양기2(2868)",
  "온도1(W5043295)": "냉장고(미생물)2(2724)",
  "온도2(W5043296)": "냉장고(미생물)2(2724)",
  "온도1(W5043290)": "배지보관기(798)",
  "온도2(W5043288)": "배지보관기(798)",
  "온도1(W5043297)": "진탕배양기(989)",
  "온도2(W5043291)": "진탕배양기(989)",
  "온도2(W4965593)": "Incubator(2044)",
  "온도1(W4965604)": "Incubator(2044)",
  "온도1(X2121883)": "미생물실(320)",
  "습도1(X2121883)": "미생물실(320)",
  "온도1(X2121860)": "미생물한도시험실(326)",
  "습도1(X2121860)": "미생물한도시험실(326)",
  "온도1(X2121886)": "무균시험실(321)",
  "습도1(X2121886)": "무균시험실(321)",
  
  // 냉장고(미생물)3 센서들
  "온도-1": "냉장고(미생물)3",
  "온도-2": "냉장고(미생물)3",
  
  // 소형배양기1 센서들
  "온도-1": "소형배양기1",
  "온도-2": "소형배양기1",
};

// 상위 그룹 맵 정의
const highLevelGroupMap: Record<string, string> = {
  "Incubator(1522)": "미생물실",
  "Incubator(2960)": "미생물실",
  "저온배양기2(2868)": "미생물실",
  "냉장고(미생물)2(2724)": "미생물실",
  "배지보관기(798)": "미생물실",
  "진탕배양기(989)": "미생물실",
  "Incubator(2044)": "미생물실",
  "미생물실(320)": "미생물실",
  "미생물한도시험실(326)": "미생물실",
  "무균시험실(321)": "미생물실",
  "냉장고(미생물)3": "미생물실",
  "소형배양기1": "미생물실",
  "표준품보관실(309)": "시험실",
  "검체냉장고(2378)": "시험실",
  "냉장형필터시약장1(2946)": "시험실",
  "표준품냉장고(1233)": "시험실",
  "냉동고1(2047)": "시험실",
  "보관검체냉장고1(2658)": "시험실",
  "안정성챔버2(2732)": "시험실",
  "안정성챔버(905)": "안정성실",
  "안정성검체실(318)": "안정성실",
  "보관용검체보관실(349)": "보관용 검체보관실",
  "B1F 검체채취실(B09)": "검체채취실",
  "이화학시험실(305)": "시험실",
  "칭량실(308)": "시험실",
  "시약보관실1(311)": "시험실",
  "시약보관실2(367)": "시험실",
  "일반기기실2(316)": "시험실",
  "GC실(307)": "시험실",
  "LC실1(303)": "시험실",
  "LC실2(304)": "시험실",
  "감압건조기(904)": "시험실",
  "회화로2(2726)": "시험실",
  "DRY OVEN(663)": "시험실",
};

// location_ids (Python 코드와 동일)
const locationIds = [
  // 보관용검체보관실(349) 센서들
  2430, 2432, 2470, 2472, 2475, 2477,
  
  // 안정성검체실(318) 센서들
  2449, 2451, 2454, 2456, 2464, 2466,
  
  // 표준품보관실(309) 센서들
  2425, 2427,
  
  // B1F 검체채취실(B09) 센서들
  2444, 2446,
  
  // 검체냉장고(2378) 센서들
  2340, 2342,
  
  // 안정성챔버(905) 센서들
  2435, 2437, 2483, 2485, 8402, 8404,
  
  // 안정성챔버2(2732) 센서들
  1670, 1672, 2479, 2481,
  
  // 냉장형필터시약장1(2946) 센서들
  1678, 1680,
  
  // 표준품냉장고(1233) 센서들
  2415, 2417,
  
  // 냉동고1(2047) 센서들
  2420, 2422,
  
  // 보관검체냉장고1(2658) 센서들
  2440, 2442,
  
  // 이화학시험실(305) 센서들
  10435, 10437,
  
  // 칭량실(308) 센서들
  10451, 10453,
  
  // 시약보관실1(311) 센서들
  10455, 10457,
  
  // 시약보관실2(367) 센서들
  10476, 10478,
  
  // 일반기기실2(316) 센서들
  10459, 10461,
  
  // GC실(307) 센서들
  10463, 10465,
  
  // LC실1(303) 센서들
  10467, 10469,
  
  // LC실2(304) 센서들
  10471, 10473,
  
  // 감압건조기(904) 센서들
  11455,
  
  // 회화로2(2726) 센서들
  11437,
  
  // DRY OVEN(663) 센서들
  11453,
  
  // 미생물실 센서들
  2355, 2357, 2385, 2387, 2375, 2377, 2380, 2382, 
  1537, 1538, 2370, 2372, 2362, 2360,
  
  // 미생물실 추가 센서들
  10439, 10441, 10443, 10445, 10447, 10449,
  
  // 냉장고(미생물)3 센서들
  27804, 27806,
  
  // 소형배양기1 센서들
  27808, 27810
];

// HTTPS Agent (SSL 검증 비활성화)
const agent = new https.Agent({
  rejectUnauthorized: false,
});

/**
 * HTTP 요청 헬퍼 함수 (리다이렉트 자동 처리, Python의 requests.Session()과 유사하게)
 */
function makeRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    followRedirects?: boolean;
    maxRedirects?: number;
  } = {}
): Promise<{ status: number; body: string; headers: Record<string, string | string[] | undefined> }> {
  const followRedirects = options.followRedirects !== false;
  const maxRedirects = options.maxRedirects || 5;
  
  return new Promise((resolve, reject) => {
    let redirectCount = 0;
    let currentUrl = url;
    let cookies: string[] = [];

    const makeRequestInternal = (urlToRequest: string, headersToUse: Record<string, string>) => {
      const urlObj = new URL(urlToRequest);
      const requestOptions: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: headersToUse,
        agent,
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk.toString();
        });
        res.on('end', () => {
          // 쿠키 수집
          const setCookie = res.headers['set-cookie'];
          if (setCookie) {
            if (Array.isArray(setCookie)) {
              cookies.push(...setCookie.map(c => c.split(';')[0]));
            } else {
              cookies.push(setCookie.split(';')[0]);
            }
          }

          // 리다이렉트 처리 (Python의 requests.Session()과 동일하게)
          if (followRedirects && (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303 || res.statusCode === 307 || res.statusCode === 308)) {
            if (redirectCount >= maxRedirects) {
              reject(new Error(`최대 리다이렉트 횟수(${maxRedirects}) 초과`));
              return;
            }

            const location = res.headers.location;
            if (location) {
              redirectCount++;
              let redirectUrl: string;
              if (location.startsWith('http')) {
                redirectUrl = location;
              } else if (location.startsWith('/')) {
                redirectUrl = `${urlObj.protocol}//${urlObj.hostname}${location}`;
              } else {
                redirectUrl = `${urlObj.protocol}//${urlObj.hostname}/${location}`;
              }

              // 쿠키를 헤더에 추가하여 리다이렉트 요청
              const redirectHeaders = { ...headersToUse };
              if (cookies.length > 0) {
                redirectHeaders['Cookie'] = cookies.join('; ');
              }

              makeRequestInternal(redirectUrl, redirectHeaders);
              return;
            }
          }

          // 최종 응답에 쿠키 정보 포함
          const finalHeaders = { ...res.headers };
          if (cookies.length > 0 && !finalHeaders['set-cookie']) {
            finalHeaders['set-cookie'] = cookies;
          }

          resolve({
            status: res.statusCode || 500,
            body: data,
            headers: finalHeaders,
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    };

    makeRequestInternal(currentUrl, options.headers || {});
  });
}

/**
 * 세션 생성 및 로그인
 */
async function createSession(): Promise<boolean> {
  try {
    // 설정 파일에서 아이디/비밀번호 읽기
    const settings = readSensorSettings();
    
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Origin": SENSOR_BASE_URL,
      "Referer": `${SENSOR_BASE_URL}/`,
      "User-Agent": "Mozilla/5.0",
      "X-Requested-With": "XMLHttpRequest"
    };

    const body = new URLSearchParams({
      username: settings.username,
      password: settings.password
    }).toString();

    const response = await makeRequest(LOGIN_URL, {
      method: 'POST',
      headers,
      body,
    });

    // HTTP 200 또는 302 모두 성공으로 처리 (리다이렉트는 이미 makeRequest에서 처리됨)
    if (response.status === 200 || response.status === 302) {
      // 쿠키 추출 - 여러 방법 시도 (Python의 requests.Session()과 동일하게)
      const setCookie = response.headers['set-cookie'];
      let cookieValue: string | null = null;

      if (setCookie) {
        if (Array.isArray(setCookie)) {
          // 배열인 경우 모든 쿠키를 합침 (Python의 requests.Session()과 동일하게)
          cookieValue = setCookie.map(c => c.split(';')[0]).join('; ');
        } else if (typeof setCookie === 'string') {
          cookieValue = setCookie.split(';')[0];
        }
      }

      if (cookieValue) {
        sessionCookie = cookieValue;
        console.log(`세션 생성 및 로그인 성공 (HTTP ${response.status})`);
        console.log(`쿠키: ${cookieValue.substring(0, 50)}...`);
        return true;
      } else {
        // 쿠키가 없어도 200이면 성공으로 처리 (일부 환경에서는 쿠키 없이도 작동)
        if (response.status === 200) {
          console.log('세션 생성 및 로그인 성공 (HTTP 200, 쿠키 없음)');
          return true;
        } else {
          console.error('쿠키를 찾을 수 없습니다. 응답 헤더:', JSON.stringify(response.headers, null, 2));
          return false;
        }
      }
    } else {
      console.error(`로그인 실패: HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('센서 시스템 로그인 오류:', error);
    if (error instanceof Error) {
      console.error('에러 스택:', error.stack);
    }
    return false;
  }
}

/**
 * 세션 유효성 확인 (Python의 check_session_validity와 동일)
 */
async function checkSessionValidity(): Promise<boolean> {
  try {
    if (!sessionCookie) {
      return false;
    }
    
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0",
      "Cookie": sessionCookie
    };
    
    const testResponse = await makeRequest(`${SENSOR_BASE_URL}/`, {
      method: 'GET',
      headers,
    });
    
    return testResponse.status === 200;
  } catch (error) {
    console.error('세션 유효성 확인 오류:', error);
    return false;
  }
}

/**
 * 세션 유효성 확인 및 재로그인 (Python의 ensure_valid_session과 동일)
 */
async function ensureValidSession(): Promise<boolean> {
  const isValid = await checkSessionValidity();
  if (!isValid) {
    console.log('세션 만료 감지, 재로그인 시도');
    return await createSession();
  }
  return true;
}

/**
 * 임계값 파싱
 */
function parseThresholds(summary: string): Record<string, number> {
  const thresholds: Record<string, number> = {};
  if (!summary) return thresholds;

  for (const part of summary.split(";")) {
    const trimmed = part.trim();
    if (trimmed.includes(">")) {
      const [label, value] = trimmed.split(">");
      const numValue = parseFloat(value.trim().split(" ")[0]);
      if (!isNaN(numValue)) {
        thresholds[label.trim()] = numValue;
      }
    } else if (trimmed.includes("<")) {
      const [label, value] = trimmed.split("<");
      const numValue = parseFloat(value.trim().split(" ")[0]);
      if (!isNaN(numValue)) {
        thresholds[label.trim()] = numValue;
      }
    }
  }
  return thresholds;
}

/**
 * 알람 레벨 판단
 */
function judgeAlarmLevel(value: number, thresholds: Record<string, number>): 'normal' | 'warning' | 'danger' {
  const high = thresholds['High Threshold'] || thresholds['높은 한계값'];
  const low = thresholds['Low Threshold'] || thresholds['낮은 한계값'];
  const highhigh = thresholds['HighHigh Threshold'] || thresholds['아주 높은 한계값'];
  const lowlow = thresholds['LowLow Threshold'] || thresholds['아주 낮은 한계값'];

  // 경고(빨강): HighHigh/LowLow를 벗어남
  if (highhigh !== undefined && value > highhigh) return 'danger';
  if (lowlow !== undefined && value < lowlow) return 'danger';

  // 주의(주황): High/Low를 벗어남
  if (high !== undefined && value > high) return 'warning';
  if (low !== undefined && value < low) return 'warning';

  return 'normal';
}

/**
 * 그룹 구조 변환
 */
function restructureByHighGroup(grouped: Record<string, Array<{ name: string; value: number; unit: string; thresholds: Record<string, number>; alarmLevel: string }>>): Record<string, Record<string, typeof grouped[string]>> {
  const newGroup: Record<string, Record<string, typeof grouped[string]>> = {};
  for (const [room, sensors] of Object.entries(grouped)) {
    const highGroup = highLevelGroupMap[room] || "기타";
    if (!newGroup[highGroup]) {
      newGroup[highGroup] = {};
    }
    newGroup[highGroup][room] = sensors;
  }
  return newGroup;
}

/**
 * GET /api/sensors
 * 센서 데이터 수집 및 반환
 */
router.get('/', async (req, res) => {
  try {
    // Python 코드의 collect_data 함수와 동일한 로직
    const maxRetries = 5;
    const retryDelay = 1000; // 1초
    
    // 세션 유효성 확인 및 재로그인 (Python의 ensure_valid_session과 동일)
    if (!(await ensureValidSession())) {
      return res.status(500).json({
        success: false,
        error: '세션 유효성 확인 실패',
      });
    }

  // 재시도 로직 (Python의 for attempt in range(max_retries)와 동일)
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // 쿠키가 없으면 재로그인 시도
      if (!sessionCookie) {
        console.log('쿠키가 없어 재로그인 시도');
        if (!(await createSession())) {
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
            continue;
          }
          return res.status(500).json({
            success: false,
            error: '세션 생성 실패',
          });
        }
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Origin": SENSOR_BASE_URL,
        "Referer": `${SENSOR_BASE_URL}/`,
        "User-Agent": "Mozilla/5.0",
        "X-Requested-With": "XMLHttpRequest"
      };

      // 쿠키 추가 (반드시 필요)
      if (sessionCookie) {
        headers["Cookie"] = sessionCookie;
        console.log(`데이터 수집 요청 (시도 ${attempt + 1}/${maxRetries}), 쿠키: ${sessionCookie.substring(0, 30)}...`);
      } else {
        console.error('쿠키가 없습니다. 재로그인 필요');
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
          continue;
        }
      }

      // Python 코드와 동일하게 payload 구성
      // Python: payload = {"location_ids": json.dumps(location_ids), "request_version": "5"}
      // requests.post(data=payload)는 딕셔너리를 form-data로 자동 변환
      const payload = {
        location_ids: JSON.stringify(locationIds),
        request_version: "5"
      };

      const body = new URLSearchParams({
        location_ids: payload.location_ids,
        request_version: payload.request_version
      }).toString();

      // 타임아웃 설정으로 무한 대기 방지 (Python: timeout=15)
      const response = await Promise.race([
        makeRequest(REALTIME_URL, {
          method: 'POST',
          headers,
          body,
        }),
        new Promise<{ status: number; body: string; headers: Record<string, string | string[] | undefined> }>((_, reject) => {
          setTimeout(() => reject(new Error('타임아웃 오류')), 15000);
        })
      ]) as { status: number; body: string; headers: Record<string, string | string[] | undefined> };

      if (response.status === 200) {
        const result = JSON.parse(response.body);
        const tempData: Record<string, Array<{ name: string; value: number; unit: string; thresholds: Record<string, number>; alarmLevel: string }>> = {};
        const thresholdsData: Record<string, Record<string, number>> = {};

        if (result.items && Array.isArray(result.items)) {
          for (const item of result.items) {
            const name = item.location_name || "알 수 없음";
            const value = Math.round((item.value || 0) * 100) / 100; // 소수점 2자리 (Python 코드와 동일)
            const unit = item.display_units || "";
            const thresholdSummary = item.threshold_summary || "";

            // 센서 이름이 중복되는 경우 zone 정보를 활용하여 구분
            const zone = item.zone || "";
            let displayName = name;
            let group = sensorToGroup[name] || "(그룹 미지정)";

            if (zone.includes("냉장고(미생물)3")) {
              displayName = `${name}(냉장고미생물3)`;
              group = "냉장고(미생물)3";
            } else if (zone.includes("소형배양기1")) {
              displayName = `${name}(소형배양기1)`;
              group = "소형배양기1";
            }

            if (!tempData[group]) {
              tempData[group] = [];
            }

            const thresholds = parseThresholds(thresholdSummary);
            thresholdsData[displayName] = thresholds;
            const alarmLevel = judgeAlarmLevel(value, thresholds);

            tempData[group].push({
              name: displayName,
              value,
              unit,
              thresholds,
              alarmLevel,
            });
          }
        }

        const groupedData = restructureByHighGroup(tempData);

        return res.json({
          success: true,
          data: groupedData,
          thresholds: thresholdsData,
          timestamp: new Date().toISOString(),
        });
      } else if (response.status === 401 || response.status === 404) {
        // HTTP 401 (인증 실패) 또는 404 (리소스 없음) - 세션 만료 가능성, 재로그인 필요
        const errorType = response.status === 401 ? '인증 실패' : '리소스 없음';
        console.log(`HTTP ${response.status} (${errorType}) 감지, 세션 무효화 및 재로그인 시도 (시도 ${attempt + 1}/${maxRetries})`);
        // 응답 본문 로깅 (디버깅용)
        if (response.body && response.body.length > 0) {
          console.log(`응답 본문 (처음 200자): ${response.body.substring(0, 200)}`);
        }
        sessionCookie = null; // 세션 쿠키 무효화
        
        // 재로그인 시도
        if (await createSession()) {
          console.log('재로그인 성공, 데이터 수집 재시도');
          // 재로그인 성공 시 바로 재시도 (지수 백오프 없이)
          continue;
        } else {
          console.error('재로그인 실패');
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
            continue;
          }
        }
      } else {
        // 기타 HTTP 오류 시 재시도 (Python과 동일)
        const errorMsg = `HTTP 오류: ${response.status}`;
        console.error(errorMsg);
        if (attempt < maxRetries - 1) {
          // 지수 백오프 (Python: time.sleep(retry_delay * (2 ** attempt)))
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
          continue;
        }
      }
    } catch (error: any) {
      // 타임아웃 오류 처리
      if (error.message === '타임아웃 오류') {
        const errorMsg = `타임아웃 오류 (시도 ${attempt + 1}/${maxRetries})`;
        console.error(errorMsg);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
          continue;
        }
      }
      // 연결 오류 처리
      else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        const errorMsg = `연결 오류 (시도 ${attempt + 1}/${maxRetries})`;
        console.error(errorMsg);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
          continue;
        }
      }
      // 기타 오류 처리
      else {
        const errorMsg = `수집 오류 (시도 ${attempt + 1}/${maxRetries}): ${error.message}`;
        console.error(errorMsg);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
          continue;
        }
      }
    }
  }

    // 모든 재시도 실패
    return res.status(500).json({
      success: false,
      error: `센서 데이터 수집 완전 실패 - 재시도 ${maxRetries}회 모두 실패`,
    });
  } catch (error: any) {
    // 예상치 못한 오류 처리
    console.error('센서 API 라우터 오류:', error);
    console.error('에러 스택:', error.stack);
    return res.status(500).json({
      success: false,
      error: `서버 오류: ${error.message}`,
    });
  }
});

export default router;

