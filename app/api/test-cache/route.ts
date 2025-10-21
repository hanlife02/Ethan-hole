import { NextRequest, NextResponse } from "next/server";
import { verifyJWTAuth, createAuthResponse } from "@/lib/auth-middleware";

export async function GET(request: NextRequest) {
  // 验证JWT认证
  const authResult = await verifyJWTAuth(request);
  if (!authResult.success) {
    return createAuthResponse(authResult);
  }

  try {
    console.log('🧪 Simple cache test API called');

    // 返回一些模拟数据来测试前端逻辑
    const mockData = {
      latestHoles: [
        {
          pid: 12345,
          text: "这是一条测试树洞数据，用于验证前端显示是否正常",
          type: "text",
          created_at: new Date().toISOString(),
          reply: 5,
          likenum: 10,
          image_response: null
        },
        {
          pid: 12346,
          text: "第二条测试数据，确认列表渲染",
          type: "text",
          created_at: new Date(Date.now() - 3600000).toISOString(), // 1小时前
          reply: 2,
          likenum: 7,
          image_response: null
        }
      ],
      hotHoles: [
        {
          pid: 12347,
          text: "这是热点测试数据",
          type: "text",
          created_at: new Date(Date.now() - 7200000).toISOString(), // 2小时前
          reply: 15,
          likenum: 25,
          image_response: null
        }
      ],
      stats: {
        totalHoles: 1000,
        totalComments: 500
      },
      lastUpdated: Date.now(),
      source: 'mock-data'
    };

    return NextResponse.json(mockData);

  } catch (error) {
    console.error("Mock cache API error:", error);
    return NextResponse.json(
      { error: "Mock cache test failed" },
      { status: 500 }
    );
  }
}