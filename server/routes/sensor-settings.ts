/**
 * 센서 시스템 설정 API 라우트 (아이디/비밀번호 관리)
 */

import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_FILE = resolve(__dirname, '../data/sensor-settings.json');

export interface SensorSettings {
  username: string;
  password: string;
}

// 기본 설정 데이터
const defaultSettings: SensorSettings = {
  username: "10077:-:Korea Standard Time,UTC+09:00",
  password: "Kd10077@@"
};

// 데이터 파일 읽기
function readData(): SensorSettings {
  try {
    if (!existsSync(DATA_FILE)) {
      writeData(defaultSettings);
      return defaultSettings;
    }
    const data = readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('센서 설정 파일 읽기 실패:', error);
    return defaultSettings;
  }
}

// 데이터 파일 쓰기
function writeData(data: SensorSettings): void {
  try {
    // data 디렉토리가 없으면 생성
    const dataDir = resolve(__dirname, '../data');
    if (!existsSync(dataDir)) {
      const { mkdirSync } = require('fs');
      mkdirSync(dataDir, { recursive: true });
    }
    
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('센서 설정 파일 쓰기 실패:', error);
    throw error;
  }
}

const router = Router();

/**
 * GET /api/sensor-settings
 * 설정 조회
 */
router.get('/', (req, res) => {
  try {
    const data = readData();
    // 비밀번호는 마스킹하여 반환
    res.json({
      success: true,
      data: {
        username: data.username,
        password: data.password ? '*'.repeat(data.password.length) : '',
      },
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
 * PUT /api/sensor-settings
 * 설정 업데이트
 */
router.put('/', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: '아이디와 비밀번호를 모두 입력하세요',
      });
    }

    const data = readData();
    
    if (username !== undefined) {
      data.username = username;
    }
    if (password !== undefined) {
      // 비밀번호가 마스킹된 경우(***)가 아닐 때만 업데이트
      if (!password.startsWith('*')) {
        data.password = password;
      }
    }

    writeData(data);

    res.json({
      success: true,
      message: '설정이 저장되었습니다',
      data: {
        username: data.username,
        password: '*'.repeat(data.password.length),
      },
    });
  } catch (error) {
    console.error('설정 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

export default router;
export { readData as readSensorSettings };

