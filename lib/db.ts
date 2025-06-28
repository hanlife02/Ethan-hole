import { Pool } from "pg"

// 创建数据库连接池的单例
let pool: Pool | null = null

export function getDbPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: Number.parseInt(process.env.DB_PORT || "5432"),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
      max: 20, // 最大连接数
      idleTimeoutMillis: 30000, // 空闲连接超时时间
      connectionTimeoutMillis: 2000, // 连接超时时间
    })
  }
  return pool
}

// 测试数据库连接
export async function testDbConnection() {
  try {
    const pool = getDbPool()
    const client = await pool.connect()
    await client.query("SELECT 1")
    client.release()
    console.log("✅ Database connection successful")
    return true
  } catch (error) {
    console.error("❌ Database connection failed:", error)
    return false
  }
}
