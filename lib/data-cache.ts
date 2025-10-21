// 服务端数据缓存管理器
// 定期刷新数据，避免用户直接查询大数据库

interface CachedData {
  latestHoles: any[];
  hotHoles: any[];
  stats: any;
  lastUpdated: number;
}

interface CacheConfig {
  refreshInterval: number; // 刷新间隔（毫秒）
  maxRetries: number; // 最大重试次数
}

class DataCacheManager {
  private cache: CachedData | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private config: CacheConfig;

  constructor(config: CacheConfig = { refreshInterval: 30000, maxRetries: 3 }) {
    this.config = config;
    this.startAutoRefresh();
  }

  // 获取缓存数据（客户端被动获取，不触发刷新）
  public getCachedData(): CachedData | null {
    if (!this.cache) {
      console.warn('📋 Cache not ready yet, returning null');
      return null;
    }

    const age = Date.now() - this.cache.lastUpdated;
    console.log(`📊 Serving cached data (age: ${Math.round(age / 1000)}s, items: ${this.cache.latestHoles.length} latest, ${this.cache.hotHoles.length} hot)`);

    return this.cache;
  }

  // 手动刷新数据
  public async forceRefresh(): Promise<CachedData | null> {
    return await this.refreshData();
  }

  // 启动自动刷新（服务端持续运行）
  private startAutoRefresh(): void {
    console.log('🚀 DataCacheManager: Starting server-side background refresh...');

    // 立即执行一次刷新
    this.refreshData().catch((error) => {
      console.error('❌ Initial server cache refresh failed:', error);
    });

    // 设置定时刷新 - 服务端持续运行
    this.refreshTimer = setInterval(() => {
      if (!this.isRefreshing) {
        console.log('⏰ Server auto-refresh triggered');
        this.refreshData().catch((error) => {
          console.error('❌ Server auto-refresh failed:', error);
        });
      } else {
        console.log('⏳ Server refresh already in progress, skipping');
      }
    }, this.config.refreshInterval);

    console.log(`✅ Server-side auto-refresh started with ${this.config.refreshInterval / 1000}s interval`);
  }

  // 停止自动刷新
  public stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      console.log('Data cache auto-refresh stopped');
    }
  }

  // 刷新数据的核心逻辑
  private async refreshData(retryCount = 0): Promise<CachedData | null> {
    if (this.isRefreshing) {
      console.log('Refresh already in progress, skipping');
      return this.cache;
    }

    this.isRefreshing = true;
    const startTime = Date.now();

    try {
      console.log('🔄 Starting cache refresh...');

      const { getDbPool } = await import('./db');
      const pool = getDbPool();
      const client = await pool.connect();

      try {
        // 并行执行所有查询，但加上超时保护
        const [latestResult, hotResult, statsResult] = await Promise.allSettled([
          // 最新树洞（所有数据，限制20条）
          Promise.race([
            client.query(`
              SELECT pid, text, type, created_at, reply, likenum, image_response, extra
              FROM holes
              ORDER BY created_at DESC
              LIMIT 20
            `),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Latest holes query timeout')), 15000))
          ]),

          // 热点树洞（降低阈值以适应历史数据）
          Promise.race([
            client.query(`
              SELECT pid, text, type, created_at, reply, likenum, image_response, extra
              FROM holes
              WHERE (reply + likenum) >= 2
              ORDER BY (reply + likenum) DESC, created_at DESC
              LIMIT 50
            `),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Hot holes query timeout')), 15000))
          ]),

          // 统计信息（基于实际数据）
          Promise.race([
            client.query(`
              SELECT
                COUNT(*) as total_holes,
                (SELECT COUNT(*) FROM holes WHERE created_at > NOW() - INTERVAL '7 days') as seven_day_num,
                (SELECT COUNT(*) FROM holes WHERE created_at > CURRENT_DATE) as today_num
            `),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Stats query timeout')), 10000))
          ])
        ]);

        // 处理查询结果
        const latestHoles = latestResult.status === 'fulfilled' ? latestResult.value.rows : [];
        const hotHoles = hotResult.status === 'fulfilled' ? hotResult.value.rows : [];
        const statsData = statsResult.status === 'fulfilled' ? {
          totalHoles: parseInt(statsResult.value.rows[0].total_holes),
          totalComments: parseInt(statsResult.value.rows[0].seven_day_num), // 使用7天数据作为评论数
        } : {
          totalHoles: 0,
          totalComments: 0,
        };

        // 记录失败的查询
        if (latestResult.status === 'rejected') {
          console.error('❌ Latest holes query failed:', latestResult.reason);
        }
        if (hotResult.status === 'rejected') {
          console.error('❌ Hot holes query failed:', hotResult.reason);
        }
        if (statsResult.status === 'rejected') {
          console.error('❌ Stats query failed:', statsResult.reason);
        }

        // 更新缓存
        this.cache = {
          latestHoles,
          hotHoles,
          stats: statsData,
          lastUpdated: Date.now()
        };

        const duration = Date.now() - startTime;
        console.log(`✅ Cache refresh completed in ${duration}ms`);
        console.log(`📊 Cached: ${latestHoles.length} latest, ${hotHoles.length} hot holes`);

        return this.cache;

      } finally {
        client.release();
      }

    } catch (error) {
      console.error(`❌ Cache refresh failed (attempt ${retryCount + 1}):`, error);

      // 重试逻辑
      if (retryCount < this.config.maxRetries) {
        console.log(`🔄 Retrying cache refresh in 5 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.refreshData(retryCount + 1);
      } else {
        console.error('🚨 Cache refresh failed after all retries, keeping old cache');
        return this.cache;
      }

    } finally {
      this.isRefreshing = false;
    }
  }

  // 获取缓存状态信息
  public getCacheStatus() {
    if (!this.cache) {
      return { status: 'empty', lastUpdated: null, age: null };
    }

    const age = Date.now() - this.cache.lastUpdated;
    return {
      status: age > this.config.refreshInterval * 2 ? 'stale' : 'fresh',
      lastUpdated: new Date(this.cache.lastUpdated),
      age: Math.round(age / 1000),
      isRefreshing: this.isRefreshing
    };
  }
}

// 创建全局缓存实例（30秒刷新间隔）
export const dataCache = new DataCacheManager({
  refreshInterval: 30000, // 30秒刷新一次
  maxRetries: 3
});

// 导出类型和工具函数
export type { CachedData };
export { DataCacheManager };