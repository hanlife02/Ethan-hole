import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number.parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeFilter = searchParams.get('time') || '24h'; // 默认24小时
    
    let timeCondition = '';
    switch (timeFilter) {
      case '1h':
        timeCondition = "AND created_at >= NOW() - INTERVAL '1 hour'";
        break;
      case '6h':
        timeCondition = "AND created_at >= NOW() - INTERVAL '6 hours'";
        break;
      case '24h':
        timeCondition = "AND created_at >= NOW() - INTERVAL '24 hours'";
        break;
      case '7d':
        timeCondition = "AND created_at >= NOW() - INTERVAL '7 days'";
        break;
      default:
        timeCondition = "AND created_at >= NOW() - INTERVAL '24 hours'";
    }

    const client = await pool.connect();

    const result = await client.query(`
      SELECT pid, text, type, created_at, reply, likenum, image_response
      FROM holes 
      WHERE (reply + likenum) >= 20 ${timeCondition}
      ORDER BY pid DESC
    `);

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
