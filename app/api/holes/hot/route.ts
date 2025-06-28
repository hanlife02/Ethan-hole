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

    const result = await client.query(`
      SELECT pid, text, type, created_at, reply, likeum, image_response
      FROM holes 
      WHERE (reply + likeum) >= 20
      ORDER BY (reply + likeum) DESC, created_at DESC
    `)

    client.release()

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to fetch hot holes" }, { status: 500 })
  }
}
