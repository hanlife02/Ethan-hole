import { NextResponse } from "next/server"
import { Pool } from "pg"

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number.parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
})

export async function GET() {
  try {
    const client = await pool.connect()

    const [holesResult, commentsResult] = await Promise.all([
      client.query("SELECT COUNT(*) as count FROM holes"),
      client.query("SELECT COUNT(*) as count FROM comments"),
    ])

    client.release()

    return NextResponse.json({
      totalHoles: Number.parseInt(holesResult.rows[0].count),
      totalComments: Number.parseInt(commentsResult.rows[0].count),
    })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
