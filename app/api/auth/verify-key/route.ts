import { NextRequest, NextResponse } from "next/server";
import { verifyApiKey } from "@/lib/auth-middleware";

export async function POST(request: NextRequest) {
  try {
    const { key } = await request.json();

    if (!key) {
      return NextResponse.json(
        { error: "API Key is required" },
        { status: 400 }
      );
    }

    if (verifyApiKey(key)) {
      return NextResponse.json({
        success: true,
        message: "API Key verified successfully",
      });
    } else {
      return NextResponse.json(
        { error: "Invalid API Key" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("API Key verification error:", error);
    return NextResponse.json(
      { error: "API Key verification failed" },
      { status: 500 }
    );
  }
}