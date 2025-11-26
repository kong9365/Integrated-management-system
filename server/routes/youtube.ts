/**
 * YouTube 채널 영상 API 라우트
 * 광동제약 YouTube 채널의 최신 영상 목록 제공
 */

import { Router } from 'express';
import https from 'https';
import { parseString } from 'xml2js';

const router = Router();

// YouTube 채널 RSS 피드 URL
// @Kwangdong 채널의 RSS 피드 (채널 ID 필요 시 변경)
const YOUTUBE_RSS_URL = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCYOUR_CHANNEL_ID';

// 임시로 채널 페이지에서 최신 영상 ID를 가져오는 방법 사용
// 실제로는 채널 ID를 찾아서 RSS 피드를 사용하거나, YouTube Data API를 사용해야 함

interface YouTubeVideo {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
}

/**
 * GET /api/youtube/videos
 * YouTube 채널의 최신 영상 목록 조회
 */
router.get('/videos', async (req, res) => {
  try {
    // 간단한 방법: 채널 페이지를 직접 임베드하거나
    // 최신 영상 몇 개를 하드코딩하여 제공
    
    // 실제 구현 시 YouTube Data API나 RSS 피드를 사용해야 하지만,
    // 간단한 iframe 임베드 방식으로 채널의 최신 영상들을 표시
    
    // 채널 URL을 직접 사용하는 방법
    const channelUrl = 'https://www.youtube.com/@Kwangdong';
    
    // 또는 최신 영상 ID를 직접 제공 (실제 영상 ID로 교체 필요)
    const videos: YouTubeVideo[] = [
      // 여기에 실제 영상 ID를 추가하거나, RSS 피드를 파싱하여 동적으로 가져옴
    ];

    res.json({
      success: true,
      channelUrl,
      videos,
      message: 'YouTube 채널 영상 목록 (iframe 임베드 방식 사용)',
    });
  } catch (error) {
    console.error('YouTube 영상 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
});

export default router;

