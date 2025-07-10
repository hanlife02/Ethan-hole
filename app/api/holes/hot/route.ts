import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { verifyJWTAuth, createAuthResponse } from "@/lib/auth-middleware";

export async function GET(request: NextRequest) {
  // 验证JWT认证
  const authResult = await verifyJWTAuth(request);
  if (!authResult.success) {
    return createAuthResponse(authResult);
  }
  try {
    const { searchParams } = new URL(request.url);
    const timeFilter = searchParams.get("time") || "24h"; // 默认24小时
    const threshold = parseInt(searchParams.get("threshold") || "20"); // 默认阈值20
    const filterMode = searchParams.get("filterMode") || "combined"; // 筛选模式：combined, comments, likes
    const sortMode = searchParams.get("sortMode") || "hot"; // 排序模式：hot, time

    let timeCondition = "";
    switch (timeFilter) {
      case "1h":
        timeCondition = "AND created_at >= NOW() - INTERVAL '1 hour'";
        break;
      case "6h":
        timeCondition = "AND created_at >= NOW() - INTERVAL '6 hours'";
        break;
      case "24h":
        timeCondition = "AND created_at >= NOW() - INTERVAL '24 hours'";
        break;
      case "7d":
        timeCondition = "AND created_at >= NOW() - INTERVAL '7 days'";
        break;
      case "all":
        timeCondition = ""; // 不添加时间限制
        break;
      default:
        timeCondition = "AND created_at >= NOW() - INTERVAL '24 hours'";
    }

    // 根据筛选模式构建WHERE条件
    let filterCondition = "";
    switch (filterMode) {
      case "combined":
        filterCondition = "(reply + likenum) >= $1";
        break;
      case "comments":
        filterCondition = "reply >= $1";
        break;
      case "likes":
        filterCondition = "likenum >= $1";
        break;
      default:
        filterCondition = "(reply + likenum) >= $1";
    }

    // 根据排序模式构建ORDER BY条件
    let orderByCondition = "";
    if (sortMode === "time") {
      orderByCondition = "created_at DESC, pid DESC";
    } else {
      // 默认按热度排序
      orderByCondition = `
        CASE 
          WHEN $2 = 'combined' THEN (reply + likenum)
          WHEN $2 = 'comments' THEN reply
          WHEN $2 = 'likes' THEN likenum
          ELSE (reply + likenum)
        END DESC,
        pid DESC
      `;
    }

    const pool = getDbPool();
    const client = await pool.connect();

    let result;
    if (sortMode === "time") {
      // 按时间排序时，不需要传递filterMode参数
      result = await client.query(
        `
        SELECT pid, text, type, created_at, reply, likenum, image_response
        FROM holes 
        WHERE ${filterCondition} ${timeCondition}
        ORDER BY ${orderByCondition}
      `,
        [threshold]
      );
    } else {
      // 按热度排序时，需要传递filterMode参数
      result = await client.query(
        `
        SELECT pid, text, type, created_at, reply, likenum, image_response
        FROM holes 
        WHERE ${filterCondition} ${timeCondition}
        ORDER BY ${orderByCondition}
      `,
        [threshold, filterMode]
      );
    }

    client.release();

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to fetch hot holes" },
      { status: 500 }
    );
  }
}
