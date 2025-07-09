import { NextRequest, NextResponse } from "next/server";
import { verifyCasdoorToken } from "./casdoor";

export interface AuthResult {
  success: boolean;
  user?: any;
  error?: string;
}

// API Key 验证
export function verifyApiKey(key: string): boolean {
  return key === process.env.ACCESS_KEY;
}

// 从请求头获取 token
export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return null;
}

// 验证双重认证：API Key + Casdoor Token
export async function verifyDualAuth(
  request: NextRequest
): Promise<AuthResult> {
  try {
    // 从请求体或查询参数获取 API key
    let apiKey: string | null = null;

    if (request.method === "POST") {
      try {
        const body = await request.json();
        apiKey = body.key || body.apiKey;
      } catch (e) {
        // 如果解析 JSON 失败，从查询参数获取
        apiKey =
          request.nextUrl.searchParams.get("key") ||
          request.nextUrl.searchParams.get("apiKey");
      }
    } else {
      // GET 请求从查询参数获取
      apiKey =
        request.nextUrl.searchParams.get("key") ||
        request.nextUrl.searchParams.get("apiKey");
    }

    // 验证 API Key
    if (!apiKey || !verifyApiKey(apiKey)) {
      return {
        success: false,
        error: "Invalid API key",
      };
    }

    // 获取 Casdoor token
    const casdoorToken = getTokenFromRequest(request);
    if (!casdoorToken) {
      return {
        success: false,
        error: "Missing Casdoor token",
      };
    }

    // 验证 Casdoor token
    const userData = await verifyCasdoorToken(casdoorToken);
    if (!userData) {
      return {
        success: false,
        error: "Invalid Casdoor token",
      };
    }

    return {
      success: true,
      user: userData,
    };
  } catch (error) {
    console.error("Dual auth verification failed:", error);
    return {
      success: false,
      error: "Authentication failed",
    };
  }
}

// 创建认证响应
export function createAuthResponse(authResult: AuthResult): NextResponse {
  if (authResult.success) {
    return NextResponse.json({
      success: true,
      user: authResult.user,
    });
  } else {
    return NextResponse.json(
      { error: authResult.error || "Authentication failed" },
      { status: 401 }
    );
  }
}

// 用于保护 API 路由的中间件函数
export function withAuth(
  handler: (
    request: NextRequest,
    authResult: AuthResult
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const authResult = await verifyDualAuth(request);

    if (!authResult.success) {
      return createAuthResponse(authResult);
    }

    return handler(request, authResult);
  };
}
