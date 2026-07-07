// ============================================================
// Bilibili Video Utilities
// Parse BV IDs, timestamps, generate embed URLs
// ============================================================

export interface BilibiliVideoInfo {
  bvid: string;
  startTime?: number; // seconds
  embedUrl: string;
  thumbnailUrl: string;
  originalUrl: string;
}

/**
 * Parse a Bilibili URL to extract video info
 * Supports formats:
 *   - https://www.bilibili.com/video/BV1xxxxxx
 *   - https://www.bilibili.com/video/BV1xxxxxx?t=85.9
 *   - https://b23.tv/xxxxxx (short URL)
 *   - BV1xxxxxx (bare BV ID)
 */
export function parseBilibiliUrl(url: string): BilibiliVideoInfo | null {
  if (!url || typeof url !== 'string') return null;

  let bvid = '';
  let startTime: number | undefined;

  // Try to extract BV ID
  const bvMatch = url.match(/BV[a-zA-Z0-9]+/);
  if (bvMatch) {
    bvid = bvMatch[0];
  }

  if (!bvid) return null;

  // Extract timestamp
  const timeMatch = url.match(/[?&]t=([0-9.]+)/);
  if (timeMatch) {
    startTime = parseFloat(timeMatch[1]);
  }

  // Extract page number
  const pageMatch = url.match(/[?&]p=(\d+)/);
  const page = pageMatch ? parseInt(pageMatch[1]) : 1;

  const params = [`bvid=${bvid}`, `page=${page}`, 'high_quality=1', 'autoplay=0'];
  if (startTime) params.push(`t=${startTime}`);

  return {
    bvid,
    startTime,
    embedUrl: `https://player.bilibili.com/player.html?${params.join('&')}`,
    thumbnailUrl: `https://i0.hdslb.com/bfs/archive/${bvid}.jpg`,
    originalUrl: url,
  };
}

/**
 * Check if a URL is a Bilibili video link
 */
export function isBilibiliUrl(url: string): boolean {
  return /bilibili\.com\/video|b23\.tv/i.test(url);
}

/**
 * Check if a URL is any supported video link
 */
export function isVideoUrl(url: string): boolean {
  return isBilibiliUrl(url) || /youtube\.com|youtu\.be/i.test(url);
}

/**
 * Generate a generic video embed URL from any supported URL
 */
export function getVideoEmbedUrl(url: string): string | null {
  if (isBilibiliUrl(url)) {
    const info = parseBilibiliUrl(url);
    return info?.embedUrl || null;
  }
  // YouTube support
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) {
    const timeMatch = url.match(/[?&]t=([0-9]+)/);
    const params = timeMatch ? `?start=${timeMatch[1]}&autoplay=0` : '?autoplay=0';
    return `https://www.youtube.com/embed/${ytMatch[1]}${params}`;
  }
  return null;
}

/**
 * Get a display name for the video source
 */
export function getVideoSourceName(url: string): string {
  if (isBilibiliUrl(url)) return 'Bilibili';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'YouTube';
  return '视频';
}
