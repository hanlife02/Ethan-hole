import { Suspense } from 'react';
import ClientDashboard from '@/components/ClientDashboard';
import { dataCache } from '@/lib/data-cache';

// 强制动态渲染，避免静态生成
export const dynamic = 'force-dynamic';
export const revalidate = 30; // 30秒重新验证

interface InitialData {
  latestHoles: any[];
  hotHoles: any[];
  stats: any;
  serverRendered: boolean;
  lastUpdated?: number;
}

// 服务端数据获取
async function getInitialData(): Promise<InitialData> {
  try {
    console.log('🏃 SSR: Fetching initial data from cache...');

    // 尝试从缓存获取数据
    let cachedData = dataCache.getCachedData();

    // 如果缓存为空，等待一次刷新
    if (!cachedData) {
      console.log('🔄 SSR: Cache empty, forcing refresh...');
      cachedData = await dataCache.forceRefresh();
    }

    if (cachedData) {
      console.log('✅ SSR: Using cached data', {
        latest: cachedData.latestHoles.length,
        hot: cachedData.hotHoles.length,
        age: Math.round((Date.now() - cachedData.lastUpdated) / 1000)
      });

      return {
        latestHoles: cachedData.latestHoles,
        hotHoles: cachedData.hotHoles,
        stats: cachedData.stats,
        serverRendered: true,
        lastUpdated: cachedData.lastUpdated
      };
    }

    // 如果缓存失败，返回空数据
    console.warn('⚠️ SSR: Cache failed, returning empty data');
    return {
      latestHoles: [],
      hotHoles: [],
      stats: { totalHoles: 0, totalComments: 0 },
      serverRendered: true
    };

  } catch (error) {
    console.error('❌ SSR: Failed to get initial data:', error);

    // 服务端渲染失败时的降级处理
    return {
      latestHoles: [],
      hotHoles: [],
      stats: { totalHoles: 0, totalComments: 0 },
      serverRendered: false // 标记为客户端渲染
    };
  }
}

// 加载状态组件
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
        <p className="text-muted-foreground">正在加载数据...</p>
        <p className="text-xs text-muted-foreground mt-2">首次访问可能需要几秒钟</p>
      </div>
    </div>
  );
}

// 主页面组件
export default async function Home() {
  const initialData = await getInitialData();

  return (
    <Suspense fallback={<LoadingFallback />}>
      <ClientDashboard
        initialData={initialData}
        useServerCache={true}
      />
    </Suspense>
  );
}

// 元数据
export async function generateMetadata() {
  const cacheStatus = dataCache.getCacheStatus();

  return {
    title: 'Ethan Hole - 树洞广场',
    description: '分享你的想法，倾听他人的声音',
    other: {
      'cache-status': cacheStatus.status,
      'last-updated': cacheStatus.lastUpdated?.toISOString() || 'never'
    }
  };
}