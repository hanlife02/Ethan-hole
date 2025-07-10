import { NextRequest, NextResponse } from "next/server";
import { verifyJWTToken, extractJWTFromRequest, isFullyAuthenticated } from "@/lib/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 允许访问的页面（不需要认证）
  const publicPaths = ['/login', '/callback', '/api/auth', '/api/casdoor-config'];
  
  // 检查是否是公开路径或 API 路径
  const isPublicPath = publicPaths.some(path => 
    pathname.startsWith(path) || pathname === path
  );

  // 如果是公开路径、API 路径或静态资源，直接放行
  if (isPublicPath || pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return;
  }

  // 对于受保护的路径，检查JWT认证状态
  const authHeader = request.headers.get("Authorization");
  const jwtToken = extractJWTFromRequest(authHeader);
  
  if (!jwtToken) {
    // 没有JWT token，重定向到登录页
    console.log('Middleware: No JWT token found, redirecting to login');
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // 验证JWT token
    const payload = await verifyJWTToken(jwtToken);
    
    if (!payload) {
      console.log('Middleware: Invalid JWT token, redirecting to login');
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // 检查是否完成双重认证
    if (!isFullyAuthenticated(payload)) {
      console.log('Middleware: Incomplete authentication, redirecting to login');
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // 认证通过，允许访问
    console.log('Middleware: Authentication verified, allowing access');
    return;
  } catch (error) {
    console.error('Middleware: JWT verification failed:', error);
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
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