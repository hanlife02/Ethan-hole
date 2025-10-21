import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const pool = getDbPool();
    const client = await pool.connect();

    // 测试连接
    console.log("Testing database connection...");

    // 检查表结构
    const tableInfo = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'holes'
      ORDER BY ordinal_position
    `);

    // 检查数据总数
    const countResult = await client.query('SELECT COUNT(*) as total FROM holes');

    // 获取最新的几条记录
    const sampleData = await client.query(`
      SELECT pid, text, type, created_at, reply, likenum, image_response
      FROM holes
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // 检查热点数据（简单筛选）
    const hotData = await client.query(`
      SELECT pid, text, reply, likenum, created_at
      FROM holes
      WHERE created_at > NOW() - INTERVAL '24 hours'
      AND (reply + likenum) > 0
      ORDER BY (reply + likenum) DESC
      LIMIT 5
    `);

    client.release();

    return NextResponse.json({
      success: true,
      tableStructure: tableInfo.rows,
      totalCount: countResult.rows[0].total,
      sampleData: sampleData.rows,
      hotData: hotData.rows,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Debug API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}