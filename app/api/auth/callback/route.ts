import { NextRequest, NextResponse } from "next/server";
import { casdoorConfig } from "@/lib/casdoor";

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: "Missing authorization code" },
        { status: 400 }
      );
    }

    // 手动调用 Casdoor API 获取 token
    const tokenUrl = `${casdoorConfig.serverUrl}/api/login/oauth/access_token`;
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: casdoorConfig.clientId,
      client_secret: casdoorConfig.clientSecret,
      code: code,
      redirect_uri: `${process.env.NEXTAUTH_URL || "http://localhost:5632"}${
        casdoorConfig.redirectPath
      }`,
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", await tokenResponse.text());
      return NextResponse.json(
        { error: "Failed to exchange code for token" },
        { status: 401 }
      );
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return NextResponse.json(
        { error: "No access token received" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      token: tokenData.access_token,
    });
  } catch (error) {
    console.error("Casdoor callback error:", error);
    return NextResponse.json(
      { error: "Callback processing failed" },
      { status: 500 }
    );
  }
}
