/**
 * 대시보드 설정 API 라우트 (광고 영상 정보, 홍보 이미지 관리)
 */

import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import multer from 'multer';
import { unlinkSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_FILE = resolve(__dirname, '../data/dashboard-settings.json');
const PROJECT_ROOT = resolve(__dirname, '../..');

export interface DashboardSettings {
  ad: {
    youtubeUrl: string; // YouTube URL 또는 채널명
    channelName: string; // 채널명
    autoplay: boolean; // 자동재생 여부
  };
  promo: {
    images: string[]; // 홍보 이미지 파일명 목록
  };
  lab: {
    fileType: 'image' | 'pdf'; // 현재 선택된 파일 타입
    files: string[]; // 시험실 파일명 목록
  };
}

// 기본 설정 데이터
const defaultSettings: DashboardSettings = {
  ad: {
    youtubeUrl: 'https://www.youtube.com/embed?listType=user_uploads&list=Kwangdong&autoplay=0',
    channelName: 'Kwangdong',
    autoplay: false,
  },
  promo: {
    images: ['홍보페이지-1.png', '홍보페이지-2.png'],
  },
  lab: {
    fileType: 'image',
    files: [],
  },
};

// 데이터 파일 읽기
function readData(): DashboardSettings {
  try {
    if (!existsSync(DATA_FILE)) {
      writeData(defaultSettings);
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
function writeData(data: DashboardSettings): void {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('데이터 파일 쓰기 실패:', error);
    throw error;
  }
}

// Multer 설정 (이미지 업로드)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PROJECT_ROOT); // 프로젝트 루트에 저장
  },
  filename: (req, file, cb) => {
    // 한글 파일명 지원
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, originalName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 제한
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(file.originalname.split('.').pop()?.toLowerCase() || '');
    
    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다 (jpeg, jpg, png, gif, webp)'));
    }
  },
});

// 시험실 파일 업로드용 storage
const labStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = resolve(PROJECT_ROOT, 'uploads', 'lab');
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 한글 파일명 지원
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    // 파일명에 타임스탬프 추가하여 중복 방지
    const timestamp = Date.now();
    const ext = originalName.split('.').pop();
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
    cb(null, `${timestamp}-${nameWithoutExt}.${ext}`);
  },
});

// 시험실 파일 업로드용 multer (이미지 + PDF)
const labUpload = multer({
  storage: labStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB 제한 (PDF 포함)
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
    const allowedPdfTypes = /pdf/;
    const fileType = req.body.fileType; // 클라이언트에서 전송된 파일 타입
    
    if (fileType === 'image' && allowedImageTypes.test(file.mimetype) && allowedImageTypes.test(file.originalname.split('.').pop()?.toLowerCase() || '')) {
      cb(null, true);
    } else if (fileType === 'pdf' && allowedPdfTypes.test(file.mimetype) && allowedPdfTypes.test(file.originalname.split('.').pop()?.toLowerCase() || '')) {
      cb(null, true);
    } else {
      cb(new Error(`허용되지 않는 파일 형식입니다. ${fileType === 'image' ? '이미지' : 'PDF'} 파일만 업로드 가능합니다.`));
    }
  },
});

const router = Router();

/**
 * GET /api/dashboard-settings
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
 * PUT /api/dashboard-settings/ad
 * 광고 영상 정보 설정 업데이트
 */
router.put('/ad', (req, res) => {
  try {
    const { youtubeUrl, channelName, autoplay } = req.body;
    const data = readData();

    if (youtubeUrl !== undefined) {
      data.ad.youtubeUrl = youtubeUrl;
    }
    if (channelName !== undefined) {
      data.ad.channelName = channelName;
    }
    if (autoplay !== undefined) {
      data.ad.autoplay = autoplay;
    }

    writeData(data);

    res.json({
      success: true,
      data: data.ad,
    });
  } catch (error) {
    console.error('광고 설정 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * POST /api/dashboard-settings/promo/images
 * 홍보 이미지 업로드
 */
router.post('/promo/images', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '이미지 파일을 업로드하세요',
      });
    }

    const data = readData();
    const filename = req.file.filename;

    // 중복 확인
    if (!data.promo.images.includes(filename)) {
      data.promo.images.push(filename);
      writeData(data);
    }

    res.json({
      success: true,
      data: {
        filename,
        images: data.promo.images,
      },
    });
  } catch (error) {
    console.error('이미지 업로드 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * DELETE /api/dashboard-settings/promo/images/:filename
 * 홍보 이미지 삭제
 */
router.delete('/promo/images/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const decodedFilename = decodeURIComponent(filename);
    const data = readData();

    const index = data.promo.images.indexOf(decodedFilename);
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: '이미지를 찾을 수 없습니다',
      });
    }

    // 파일 삭제
    const filePath = resolve(PROJECT_ROOT, decodedFilename);
    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath);
      } catch (error) {
        console.error('파일 삭제 실패:', error);
        // 파일 삭제 실패해도 목록에서 제거
      }
    }

    data.promo.images.splice(index, 1);
    writeData(data);

    res.json({
      success: true,
      data: {
        images: data.promo.images,
      },
    });
  } catch (error) {
    console.error('이미지 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * PUT /api/dashboard-settings/promo/images/order
 * 홍보 이미지 순서 변경
 */
router.put('/promo/images/order', (req, res) => {
  try {
    const { images } = req.body;

    if (!Array.isArray(images)) {
      return res.status(400).json({
        success: false,
        error: '이미지 목록을 배열로 제공하세요',
      });
    }

    const data = readData();
    data.promo.images = images;
    writeData(data);

    res.json({
      success: true,
      data: {
        images: data.promo.images,
      },
    });
  } catch (error) {
    console.error('이미지 순서 변경 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * PUT /api/dashboard-settings/lab
 * 시험실 파일 타입 설정 업데이트
 */
router.put('/lab', (req, res) => {
  try {
    const { fileType } = req.body;
    const data = readData();

    if (fileType !== undefined) {
      if (fileType !== 'image' && fileType !== 'pdf') {
        return res.status(400).json({
          success: false,
          error: '파일 타입은 image 또는 pdf여야 합니다',
        });
      }
      
      // 파일 타입 변경 시 기존 파일 목록 초기화
      if (data.lab.fileType !== fileType) {
        // 기존 파일들 삭제
        data.lab.files.forEach(filename => {
          const filePath = resolve(PROJECT_ROOT, 'uploads', 'lab', filename);
          if (existsSync(filePath)) {
            try {
              unlinkSync(filePath);
            } catch (error) {
              console.error('파일 삭제 실패:', error);
            }
          }
        });
        data.lab.files = [];
      }
      
      data.lab.fileType = fileType;
      writeData(data);
    }

    res.json({
      success: true,
      data: data.lab,
    });
  } catch (error) {
    console.error('시험실 설정 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

/**
 * POST /api/dashboard-settings/lab/files
 * 시험실 파일 업로드 (이미지 또는 PDF)
 */
router.post('/lab/files', labUpload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '파일을 업로드하세요',
      });
    }

    const data = readData();
    const filename = req.file.filename;
    const fileExt = filename.split('.').pop()?.toLowerCase() || '';
    const isImage = ['jpeg', 'jpg', 'png', 'gif', 'webp'].includes(fileExt);
    const isPdf = fileExt === 'pdf';

    // 현재 설정된 파일 타입과 일치하는지 확인
    if ((data.lab.fileType === 'image' && !isImage) || (data.lab.fileType === 'pdf' && !isPdf)) {
      // 파일 삭제
      const filePath = resolve(PROJECT_ROOT, 'uploads', 'lab', filename);
      if (existsSync(filePath)) {
        try {
          unlinkSync(filePath);
        } catch (error) {
          console.error('파일 삭제 실패:', error);
        }
      }
      
      return res.status(400).json({
        success: false,
        error: `현재 선택된 파일 타입(${data.lab.fileType})과 일치하지 않습니다`,
      });
    }

    // 중복 확인
    if (!data.lab.files.includes(filename)) {
      data.lab.files.push(filename);
      writeData(data);
    }

    res.json({
      success: true,
      data: {
        filename,
        files: data.lab.files,
      },
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
 * DELETE /api/dashboard-settings/lab/files/:filename
 * 시험실 파일 삭제
 */
router.delete('/lab/files/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const decodedFilename = decodeURIComponent(filename);
    const data = readData();

    const index = data.lab.files.indexOf(decodedFilename);
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: '파일을 찾을 수 없습니다',
      });
    }

    // 파일 삭제
    const filePath = resolve(PROJECT_ROOT, 'uploads', 'lab', decodedFilename);
    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath);
      } catch (error) {
        console.error('파일 삭제 실패:', error);
        // 파일 삭제 실패해도 목록에서 제거
      }
    }

    data.lab.files.splice(index, 1);
    writeData(data);

    res.json({
      success: true,
      data: {
        files: data.lab.files,
      },
    });
  } catch (error) {
    console.error('파일 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

export default router;

