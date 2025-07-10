import { NextRequest, NextResponse } from "next/server";
import { verifyJWTToken, extractJWTFromRequest, isFullyAuthenticated } from "@/lib/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 允许访问的页面（不需要认证）
  const publicPaths = ['/login', '/callback', '/api/auth', '/api/casdoor-config'];
  
  // 需要JWT认证的API路径
  const protectedApiPaths = ['/api/holes', '/api/stats'];
  
  // 检查是否是公开路径
  const isPublicPath = publicPaths.some(path => 
    pathname.startsWith(path) || pathname === path
  );

  // 如果是公开路径或静态资源，直接放行
  if (isPublicPath || pathname.startsWith('/_next/') || pathname.includes('.')) {
    return;
  }

  // 只对特定的API路径进行JWT认证
  const isProtectedApi = protectedApiPaths.some(path => 
    pathname.startsWith(path)
  );
  
  if (isProtectedApi) {
    const authHeader = request.headers.get("Authorization");
    const jwtToken = extractJWTFromRequest(authHeader);
    
    if (!jwtToken) {
      console.log('Middleware: API request missing JWT token');
      return NextResponse.json(
        { error: "JWT token is required" },
        { status: 401 }
      );
    }

    try {
      // 验证JWT token
      const payload = await verifyJWTToken(jwtToken);
      
      if (!payload) {
        console.log('Middleware: Invalid JWT token for API request');
        return NextResponse.json(
          { error: "Invalid or expired JWT token" },
          { status: 401 }
        );
      }

      // 检查是否完成双重认证
      if (!isFullyAuthenticated(payload)) {
        console.log('Middleware: Incomplete authentication for API request');
        return NextResponse.json(
          { error: "Incomplete authentication" },
          { status: 401 }
        );
      }

      // API认证通过，继续处理
      console.log('Middleware: API authentication verified');
      return;
    } catch (error) {
      console.error('Middleware: API JWT verification failed:', error);
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
    }
  }

  // 对于页面路径，不在中间件层进行认证检查
  // 让客户端JavaScript处理页面级别的认证
  console.log('Middleware: Allowing page access, authentication will be checked by client');
  return;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}