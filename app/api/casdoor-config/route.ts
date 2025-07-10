import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // 返回客户端需要的 Casdoor 配置（不包含敏感信息）
    const config = {
      serverUrl: process.env.CASDOOR_ENDPOINT || "https://demo.casdoor.com",
      clientId: process.env.CASDOOR_CLIENT_ID || "",
      appName: process.env.CASDOOR_APP_NAME || "ethan-hole",
      organizationName: process.env.CASDOOR_ORGANIZATION_NAME || "Ethan Club",
      redirectPath: "/api/auth/callback",
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error("Failed to get Casdoor config:", error);
    return NextResponse.json(
      { error: "Failed to get config" },
      { status: 500 }
    );
  }
}
