import { NextRequest, NextResponse } from "next/server";
import { verifyApiKey } from "@/lib/auth-middleware";
import { generateJWTToken, verifyJWTToken, extractJWTFromRequest } from "@/lib/jwt";

export async function POST(request: NextRequest) {
  try {
    const { key } = await request.json();

    if (!key) {
      return NextResponse.json(
        { error: "API Key is required" },
        { status: 400 }
      );
    }

    // 验证 API Key
    if (!verifyApiKey(key)) {
      return NextResponse.json(
        { error: "Invalid API Key" },
        { status: 401 }
      );
    }

    // 验证 Casdoor token
    const authHeader = request.headers.get("Authorization");
    const casdoorToken = extractJWTFromRequest(authHeader);
    
    if (!casdoorToken) {
      return NextResponse.json(
        { error: "Casdoor token is required for complete authentication" },
        { status: 401 }
      );
    }

    // 验证 Casdoor token
    let userId: string;
    let userEmail: string;
    
    try {
      // 使用现有的 Casdoor 验证函数
      const { verifyCasdoorToken } = await import("@/lib/casdoor");
      const casdoorUser = await verifyCasdoorToken(casdoorToken);
      
      if (!casdoorUser) {
        return NextResponse.json(
          { error: "Invalid Casdoor token" },
          { status: 401 }
        );
      }
      
      // 从 Casdoor 用户信息中提取用户ID和邮箱
      userId = casdoorUser.id || casdoorUser.name || 'user-' + Date.now();
      userEmail = casdoorUser.email || 'user@example.com';
      
    } catch (casdoorError) {
      console.error("Casdoor token verification failed:", casdoorError);
      return NextResponse.json(
        { error: "Invalid Casdoor token" },
        { status: 401 }
      );
    }

    // 生成包含双重认证信息的 JWT token
    const jwtToken = await generateJWTToken({
      userId: userId,
      email: userEmail,
      casdoorVerified: true,
      apiKeyVerified: true,
    });

    return NextResponse.json({
      success: true,
      message: "Dual authentication successful",
      token: jwtToken,
      user: {
        id: userId,
        email: userEmail,
      },
    });
  } catch (error) {
    console.error("API Key verification error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}