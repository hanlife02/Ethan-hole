import { type NextRequest, NextResponse } from "next/server"
import { Pool } from "pg"

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number.parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
})

export async function GET(request: NextRequest, { params }: { params: { pid: string } }) {
  try {
    const client = await pool.connect()

    // Get hole details
    const holeResult = await client.query(
      `
      SELECT pid, text, type, created_at, reply, likeum, image_response
      FROM holes 
      WHERE pid = $1
    `,
      [params.pid],
    )

    if (holeResult.rows.length === 0) {
      client.release()
      return NextResponse.json({ error: "Hole not found" }, { status: 404 })
    }

    // Get comments for this hole
    const commentsResult = await client.query(
      `
      SELECT pid, cid, text, created_at, name, replied_to_cid
      FROM comments 
      WHERE pid = $1
      ORDER BY created_at ASC
    `,
      [params.pid],
    )

    client.release()

    return NextResponse.json({
      hole: holeResult.rows[0],
      comments: commentsResult.rows,
    })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to fetch hole details" }, { status: 500 })
  }
}
