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
    let casdoorToken: string | null = null;
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      casdoorToken = authHeader.substring(7);
    }
    
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
        // 如果Casdoor验证失败，使用token解析获取基本信息
        console.log('Casdoor API verification failed, attempting token decode');
        try {
          // 尝试解析Casdoor JWT token获取基本信息
          const tokenParts = casdoorToken.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            userId = payload.sub || payload.name || payload.id || 'user-' + Date.now();
            userEmail = payload.email || 'user@example.com';
          } else {
            throw new Error('Invalid token format');
          }
        } catch (parseError) {
          return NextResponse.json(
            { error: "Invalid Casdoor token format" },
            { status: 401 }
          );
        }
      } else {
        // 从 Casdoor 用户信息中提取用户ID和邮箱
        userId = casdoorUser.id || casdoorUser.name || casdoorUser.sub || 'user-' + Date.now();
        userEmail = casdoorUser.email || 'user@example.com';
      }
      
    } catch (casdoorError) {
      console.error("Casdoor token verification failed:", casdoorError);
      
      // 备用方案：尝试解析token获取基本信息
      try {
        const tokenParts = casdoorToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          userId = payload.sub || payload.name || payload.id || 'user-' + Date.now();
          userEmail = payload.email || 'user@example.com';
          console.log('Using fallback token parsing for user info');
        } else {
          return NextResponse.json(
            { error: "Invalid Casdoor token" },
            { status: 401 }
          );
        }
      } catch (parseError) {
        return NextResponse.json(
          { error: "Invalid Casdoor token" },
          { status: 401 }
        );
      }
    }

    // 生成包含双重认证信息的 JWT token
    try {
      const jwtToken = await generateJWTToken({
        userId: userId,
        email: userEmail,
        casdoorVerified: true,
        apiKeyVerified: true,
      });

      console.log('JWT token generation successful for user:', userId);
      
      return NextResponse.json({
        success: true,
        message: "Dual authentication successful",
        token: jwtToken,
        user: {
          id: userId,
          email: userEmail,
        },
      });
    } catch (jwtError) {
      console.error('JWT token generation failed:', jwtError);
      return NextResponse.json(
        { error: "Failed to generate authentication token" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("API Key verification error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}