/**
 * Express 서버 진입점
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import cdsRoutes from './routes/cds.js';
import youtubeRoutes from './routes/youtube.js';
import equipmentMasterRoutes from './routes/equipment-master.js';
import userMasterRoutes from './routes/user-master.js';
import reservationsRoutes from './routes/reservations.js';
import visitorsRoutes from './routes/visitors.js';
import visitorSettingsRoutes from './routes/visitor-settings.js';
import dashboardSettingsRoutes from './routes/dashboard-settings.js';
import noticesRoutes from './routes/notices.js';
import birthdaysRoutes from './routes/birthdays.js';
import sensorsRoutes from './routes/sensors.js';
import sensorSettingsRoutes from './routes/sensor-settings.js';
import { startBackgroundCollection } from './cds-data-collector.js';
import { startBirthdayScheduler } from './birthday-scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

const app = express();
app.use(express.json());

// 정적 파일 서빙 (이미지 파일 직접 서빙)
// 와일드카드를 사용하여 중첩 경로 지원 (예: /static/uploads/lab/filename.png)
app.get('/static/*', (req, res) => {
  // req.path는 /static/uploads/lab/filename.png 형식
  // /static/을 제거하여 상대 경로 얻기
  const relativePath = req.path.replace(/^\/static\//, '');
  const decodedPath = decodeURIComponent(relativePath);
  const fullPath = resolve(PROJECT_ROOT, decodedPath);
  
  // 보안: 프로젝트 루트 밖으로 나가지 않도록 확인
  if (!fullPath.startsWith(PROJECT_ROOT)) {
    return res.status(403).send('Forbidden');
  }
  
  if (!existsSync(fullPath)) {
    return res.status(404).send('File not found');
  }
  
  // 파일 확장자에 따른 Content-Type 설정
  const ext = decodedPath.split('.').pop()?.toLowerCase();
  const contentTypeMap: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
  };
  
  const contentType = contentTypeMap[ext || ''] || 'application/octet-stream';
  
  try {
    const fileContent = readFileSync(fullPath);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(fileContent);
  } catch (error) {
    console.error('파일 읽기 오류:', error);
    res.status(500).send('Internal Server Error');
  }
});

// 헬스 체크 엔드포인트 (서버 상태 확인용)
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mode: process.env.NODE_ENV || 'development'
  });
});

// CDS API 라우트 등록 (Vite 미들웨어보다 먼저 등록하여 API 요청을 먼저 처리)
app.use('/api/cds', cdsRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/equipment-master', equipmentMasterRoutes);
app.use('/api/user-master', userMasterRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/visitors', visitorsRoutes);
app.use('/api/visitor-settings', visitorSettingsRoutes);
app.use('/api/dashboard-settings', dashboardSettingsRoutes);
app.use('/api/notices', noticesRoutes);
app.use('/api/birthdays', birthdaysRoutes);
app.use('/api/sensors', sensorsRoutes);
app.use('/api/sensor-settings', sensorSettingsRoutes);

// 백그라운드 데이터 수집 시작 (Python 버전과 동일)
startBackgroundCollection();

// 생일 확인 스케줄러 시작
startBirthdayScheduler();

const port = parseInt(process.env.PORT || '5000', 10);
const host = '0.0.0.0';

// 개발 모드에서 Vite 미들웨어 설정
if (process.env.NODE_ENV === 'development') {
  (async () => {
    try {
      console.log('Vite 서버 초기화 시작...');
      const vite = await createViteServer({
        configFile: resolve(__dirname, '..', 'vite.config.ts'),
        server: { 
          middlewareMode: true,
          // 프록시 비활성화 (Express가 직접 처리)
          hmr: {
            port: 5173,
          },
        },
        root: resolve(__dirname, '..'),
        appType: 'custom',
      });
      console.log('Vite 서버 초기화 완료');

      // API 라우트는 이미 등록되어 있으므로, Vite 미들웨어는 나중에 적용
      app.use(vite.middlewares);

      // HTML 템플릿 서빙 (API 경로와 정적 파일 경로가 아닌 경우에만)
      app.use('*', async (req, res, next) => {
        // API 경로와 정적 파일 경로는 이미 처리되었으므로 스킵
        if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/static')) {
          return next();
        }

        try {
          const url = req.originalUrl;
          const template = await vite.transformIndexHtml(url, `
            <!DOCTYPE html>
            <html lang="ko">
              <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>품질관리팀 통합 관리 시스템</title>
              </head>
              <body>
                <div id="root"></div>
                <script type="module" src="/client/src/main.tsx"></script>
              </body>
            </html>
          `);

          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } catch (e: any) {
          vite.ssrFixStacktrace(e);
          next(e);
        }
      });

      app.listen(port, host, () => {
        console.log(`서버가 포트 ${port}에서 실행 중입니다 (개발 모드)`);
        console.log(`접속 주소: http://localhost:${port} 또는 http://172.17.6.238:${port}`);
        console.log('서버가 정상적으로 시작되었습니다.');
      }).on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`포트 ${port}가 이미 사용 중입니다.`);
          console.error('다른 프로세스를 종료하거나 다른 포트를 사용하세요.');
        } else {
          console.error('서버 시작 실패:', err);
        }
        process.exit(1);
      });
    } catch (error) {
      console.error('Vite 서버 초기화 실패:', error);
      if (error instanceof Error) {
        console.error('에러 메시지:', error.message);
        console.error('스택 트레이스:', error.stack);
      }
      console.error('서버를 종료합니다.');
      process.exit(1);
    }
  })();
} else {
  // 프로덕션 모드에서는 빌드된 파일 서빙
  app.use(express.static(resolve(__dirname, '../dist')));
  
  app.get('*', (_req, res) => {
    res.sendFile(resolve(__dirname, '../dist/index.html'));
  });

  app.listen(port, host, () => {
    console.log(`서버가 포트 ${port}에서 실행 중입니다 (프로덕션 모드)`);
    console.log(`접속 주소: http://localhost:${port} 또는 http://172.17.6.238:${port}`);
  });
}

