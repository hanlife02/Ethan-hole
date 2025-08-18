import { db } from './db';

export interface Hole {
  pid: number;
  text: string;
  type: 'text' | 'image';
  tag: string;
  timestamp: Date;
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
  try {
    const offset = (page - 1) * limit;
    const result = await db.query(
      `SELECT pid, text, type, tag, timestamp, reply, url, extra, likenum, attention, reportnum, permissions
       FROM holes 
       ORDER BY timestamp DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching latest holes:', error);
    return [];
  }
}

export async function fetchHotHoles(timeframe: '6h' | '24h' | '3d' | '7d' = '24h', limit: number = 20): Promise<Hole[]> {
  try {
    const timeMap = {
      '6h': '6 hours',
      '24h': '24 hours', 
      '3d': '3 days',
      '7d': '7 days'
    };

    const result = await db.query(
      `SELECT pid, text, type, tag, timestamp, reply, url, extra, likenum, attention, reportnum, permissions
       FROM holes 
       WHERE timestamp > NOW() - INTERVAL '${timeMap[timeframe]}'
       ORDER BY likenum DESC, attention DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching hot holes:', error);
    return [];
  }
}

export async function fetchStats(): Promise<DStats> {
  try {
    const [holeCountResult, sevenDayResult, todayResult] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM holes'),
      db.query("SELECT COUNT(*) as count FROM holes WHERE timestamp > NOW() - INTERVAL '7 days'"),
      db.query("SELECT COUNT(*) as count FROM holes WHERE timestamp > CURRENT_DATE")
    ]);

    return {
      hole_num: parseInt(holeCountResult.rows[0].count),
      seven_day_num: parseInt(sevenDayResult.rows[0].count),
      today_num: parseInt(todayResult.rows[0].count)
    };
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
      `SELECT pid, text, type, tag, timestamp, reply, url, extra, likenum, attention, reportnum, permissions
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
      `SELECT pid, text, type, tag, timestamp, reply, url, extra, likenum, attention, reportnum, permissions
       FROM holes 
       WHERE text ILIKE $1
       ORDER BY timestamp DESC
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