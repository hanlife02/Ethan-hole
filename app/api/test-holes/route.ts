import { NextRequest, NextResponse } from "next/server";
import { verifyJWTAuth, createAuthResponse } from "@/lib/auth-middleware";
import { getDbPool } from "@/lib/db";

export async function GET(request: NextRequest) {
  // 验证JWT认证
  const authResult = await verifyJWTAuth(request);
  if (!authResult.success) {
    return createAuthResponse(authResult);
  }

  try {
    console.log('🔍 Testing direct holes query...');

    const pool = getDbPool();
    const client = await pool.connect();

    try {
      // 测试最简单的查询
      const result = await client.query(`
        SELECT pid, text, type, created_at, reply, likenum, image_response
        FROM holes
        ORDER BY pid DESC
        LIMIT 10
      `);

      console.log('✅ Direct query successful, found:', result.rows.length, 'holes');

      return NextResponse.json({
        success: true,
        holes: result.rows,
        message: `Found ${result.rows.length} holes using direct query`,
        queryType: 'direct'
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error("❌ Direct query failed:", error);
    return NextResponse.json(
      {
        error: "Direct query failed",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}