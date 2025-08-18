import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { verifyDualAuth, createAuthResponse } from "@/lib/auth-middleware";

export async function GET(request: NextRequest) {
  // 验证双重认证
  const authResult = await verifyDualAuth(request);
  if (!authResult.success) {
    return createAuthResponse(authResult);
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const pool = getDbPool();
    const client = await pool.connect();

    const result = await client.query(
      `
      SELECT pid, text, type, created_at, reply, likenum, image_response
      FROM holes 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `,
      [limit, offset]
    );

    client.release();

    return NextResponse.json({
      holes: result.rows,
      page,
      limit,
      hasMore: result.rows.length === limit,
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to fetch latest holes" },
      { status: 500 }
    );
  }
}
