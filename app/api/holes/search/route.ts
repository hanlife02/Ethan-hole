import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { verifyDualAuth, createAuthResponse } from "@/lib/auth-middleware";

// 数据库查询函数
async function searchHoles(
  keywords: string[],
  mode: "or" | "and",
  page: number = 1,
  limit: number = 20
) {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    let whereClause = "";
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (mode === "or") {
      // 或查询：包含任意一个关键词即可
      const conditions = keywords.map(() => `text ILIKE $${paramIndex++}`);
      whereClause = conditions.join(" OR ");
      queryParams = keywords.map((keyword) => `%${keyword}%`);
    } else {
      // 与查询：必须包含所有关键词
      const conditions = keywords.map(() => `text ILIKE $${paramIndex++}`);
      whereClause = conditions.join(" AND ");
      queryParams = keywords.map((keyword) => `%${keyword}%`);
    }

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM holes 
      WHERE ${whereClause}
    `;
    const countResult = await client.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // 分页查询数据
    const offset = (page - 1) * limit;
    const dataQuery = `
      SELECT pid, text, type, created_at, reply, likenum, image_response
      FROM holes 
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataResult = await client.query(dataQuery, [
      ...queryParams,
      limit,
      offset,
    ]);

    return {
      holes: dataResult.rows,
      total,
      hasMore: offset + limit < total,
      page,
      limit,
    };
  } finally {
    client.release();
  }
}

export async function GET(request: NextRequest) {
  // 验证双重认证
  const authResult = await verifyDualAuth(request);
  if (!authResult.success) {
    return createAuthResponse(authResult);
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!query || query.trim() === "") {
      return NextResponse.json({
        holes: [],
        total: 0,
        hasMore: false,
        page,
        limit,
        message: "请输入搜索关键词",
      });
    }

    // 解析查询模式和关键词
    let keywords: string[];
    let mode: "or" | "and";

    if (query.includes("+")) {
      // 与查询：用+分隔
      keywords = query
        .split("+")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
      mode = "and";
    } else {
      // 或查询：用空格分隔
      keywords = query.split(/\s+/).filter((k) => k.length > 0);
      mode = "or";
    }

    if (keywords.length === 0) {
      return NextResponse.json({
        holes: [],
        total: 0,
        hasMore: false,
        page,
        limit,
        message: "请输入有效的搜索关键词",
      });
    }

    const result = await searchHoles(keywords, mode, page, limit);

    return NextResponse.json({
      ...result,
      query,
      keywords,
      mode,
      message: `使用${
        mode === "or" ? "或" : "与"
      }查询模式，关键词：${keywords.join(mode === "or" ? " | " : " + ")}`,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "搜索失败" }, { status: 500 });
  }
}
