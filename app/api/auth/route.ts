import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { key } = await request.json()

    if (key === process.env.ACCESS_KEY) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: "Invalid key" }, { status: 401 })
    }
  } catch (error) {
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}
