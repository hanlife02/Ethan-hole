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
    const pool = getDbPool();
    const client = await pool.connect();

    const [holesResult, commentsResult] = await Promise.all([
      client.query("SELECT COUNT(*) as count FROM holes"),
      client.query("SELECT COUNT(*) as count FROM comments"),
    ]);

    client.release();

    return NextResponse.json({
      totalHoles: Number.parseInt(holesResult.rows[0].count),
      totalComments: Number.parseInt(commentsResult.rows[0].count),
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
