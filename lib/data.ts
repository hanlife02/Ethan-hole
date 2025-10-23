import { db } from './db';

// 简单内存缓存
const cache = new Map<string, { data: any; expires: number }>();

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

export interface Hole {
  pid: number;
  text: string;
  type: 'text' | 'image';
  tag: string;
  created_at: Date;
  reply?: number;
  url?: string;
  extra?: string;
  likenum: number;
  attention: number;
  reportnum: number;
  permissions: string;
}

export interface DStats {
  hole_num: number;
  seven_day_num: number;
  today_num: number;
}

export async function fetchLatestHoles(page: number = 1, limit: number = 20): Promise<Hole[]> {
  const cacheKey = `latest_${page}_${limit}`;
  const cached = getCached<Hole[]>(cacheKey);
  if (cached) return cached;

  try {
    const offset = (page - 1) * limit;
    const result = await db.query(
      `SELECT pid, text, type, tag, created_at, reply, url, extra, likenum, attention, reportnum, permissions
       FROM holes
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    setCache(cacheKey, result.rows, 60000); // 1分钟缓存
    return result.rows;
  } catch (error) {
    console.error('Error fetching latest holes:', error);
    return [];
  }
}

export async function fetchHotHoles(timeframe: '6h' | '24h' | '3d' | '7d' = '24h', limit: number = 20): Promise<Hole[]> {
  const cacheKey = `hot_${timeframe}_${limit}`;
  const cached = getCached<Hole[]>(cacheKey);
  if (cached) return cached;

  try {
    const result = await db.query(
      `SELECT pid, text, type, tag, created_at, reply, url, extra, likenum, attention, reportnum, permissions
       FROM holes
       WHERE created_at > NOW() - INTERVAL $2
       ORDER BY likenum DESC, attention DESC, created_at DESC
       LIMIT $1`,
      [limit, timeframe === '6h' ? '6 hours' : timeframe === '24h' ? '24 hours' : timeframe === '3d' ? '3 days' : '7 days']
    );

    setCache(cacheKey, result.rows, 300000); // 5分钟缓存
    return result.rows;
  } catch (error) {
    console.error('Error fetching hot holes:', error);
    return [];
  }
}

export async function fetchStats(): Promise<DStats> {
  const cached = getCached<DStats>('stats');
  if (cached) return cached;

  try {
    const result = await db.query(`
      SELECT
        COUNT(*) as hole_num,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as seven_day_num,
        COUNT(*) FILTER (WHERE created_at > CURRENT_DATE) as today_num
      FROM holes
    `);

    const stats = {
      hole_num: parseInt(result.rows[0].hole_num),
      seven_day_num: parseInt(result.rows[0].seven_day_num),
      today_num: parseInt(result.rows[0].today_num)
    };

    setCache('stats', stats, 600000); // 10分钟缓存
    return stats;
  } catch (error) {
    console.error('Error fetching stats:', error);
    return {
      hole_num: 0,
      seven_day_num: 0,
      today_num: 0
    };
  }
}

export async function fetchHoleById(pid: number): Promise<Hole | null> {
  try {
    const result = await db.query(
      `SELECT pid, text, type, tag, created_at, reply, url, extra, likenum, attention, reportnum, permissions
       FROM holes
       WHERE pid = $1`,
      [pid]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching hole by id:', error);
    return null;
  }
}

export async function searchHoles(keyword: string, limit: number = 20): Promise<Hole[]> {
  try {
    const result = await db.query(
      `SELECT pid, text, type, tag, created_at, reply, url, extra, likenum, attention, reportnum, permissions
       FROM holes
       WHERE text ILIKE $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [`%${keyword}%`, limit]
    );
    return result.rows;
  } catch (error) {
    console.error('Error searching holes:', error);
    return [];
  }
}

export interface InitialData {
  latestHoles: Hole[];
  hotHoles: Hole[];
  stats: DStats;
}

export async function getInitialPageData(): Promise<InitialData> {
  try {
    const [latestHoles, hotHoles, stats] = await Promise.all([
      fetchLatestHoles(1, 20),
      fetchHotHoles('24h', 20),
      fetchStats()
    ]);

    return {
      latestHoles,
      hotHoles,
      stats
    };
  } catch (error) {
    console.error('Error fetching initial page data:', error);
    return {
      latestHoles: [],
      hotHoles: [],
      stats: {
        hole_num: 0,
        seven_day_num: 0,
        today_num: 0
      }
    };
  }
}