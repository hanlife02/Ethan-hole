import { NextRequest, NextResponse } from "next/server";
import { casdoorSdk } from "@/lib/casdoor";

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: "Missing authorization code" },
        { status: 400 }
      );
    }

    // 使用 casdoor SDK 获取 token
    const token = await casdoorSdk.getOAuthToken(code);

    if (!token) {
      return NextResponse.json(
        { error: "Failed to get token from Casdoor" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      token: token,
    });
  } catch (error) {
    console.error("Casdoor callback error:", error);
    return NextResponse.json(
      { error: "Callback processing failed" },
      { status: 500 }
    );
  }
}
