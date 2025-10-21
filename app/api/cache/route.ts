import { NextRequest, NextResponse } from "next/server";
import { verifyJWTAuth, createAuthResponse } from "@/lib/auth-middleware";
import { dataCache } from "@/lib/data-cache";

export async function GET(request: NextRequest) {
  // 验证JWT认证
  const authResult = await verifyJWTAuth(request);
  if (!authResult.success) {
    return createAuthResponse(authResult);
  }

  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';
    const includeStatus = searchParams.get('status') === 'true';

    console.log('📊 Cache data API called', { forceRefresh, includeStatus });

    let cachedData;

    if (forceRefresh) {
      console.log('🔄 Force refresh requested');
      cachedData = await dataCache.forceRefresh();
    } else {
      cachedData = dataCache.getCachedData();
    }

    if (!cachedData) {
      console.log('⚠️ No cached data available, returning empty response');
      return NextResponse.json({
        latestHoles: [],
        hotHoles: [],
        stats: { totalHoles: 0, totalComments: 0 },
        error: "Cache not ready, please retry in a few seconds",
        status: includeStatus ? dataCache.getCacheStatus() : undefined
      }, { status: 202 }); // 202 = Accepted, still processing
    }

    const response = {
      latestHoles: cachedData.latestHoles,
      hotHoles: cachedData.hotHoles,
      stats: cachedData.stats,
      lastUpdated: cachedData.lastUpdated,
      ...(includeStatus && { status: dataCache.getCacheStatus() })
    };

    // 设置缓存头
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    headers.set('X-Data-Source', 'server-cache');
    headers.set('X-Cache-Age', Math.round((Date.now() - cachedData.lastUpdated) / 1000).toString());

    return NextResponse.json(response, { headers });

  } catch (error) {
    console.error("Cache API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cached data" },
      { status: 500 }
    );
  }
}

// 管理端点 - 用于手动控制缓存
export async function POST(request: NextRequest) {
  // 验证JWT认证
  const authResult = await verifyJWTAuth(request);
  if (!authResult.success) {
    return createAuthResponse(authResult);
  }

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'refresh':
        console.log('🔄 Manual cache refresh triggered');
        const newData = await dataCache.forceRefresh();
        return NextResponse.json({
          success: true,
          message: 'Cache refreshed successfully',
          data: newData,
          status: dataCache.getCacheStatus()
        });

      case 'status':
        return NextResponse.json({
          success: true,
          status: dataCache.getCacheStatus()
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: refresh, status' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error("Cache management error:", error);
    return NextResponse.json(
      { error: "Cache management operation failed" },
      { status: 500 }
    );
  }
}