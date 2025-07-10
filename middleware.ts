import { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 允许访问的页面（不需要认证）
  const publicPaths = ['/login', '/callback', '/api/auth', '/api/casdoor-config'];
  
  // 检查是否是公开路径或 API 路径
  const isPublicPath = publicPaths.some(path => 
    pathname.startsWith(path) || pathname === path
  );

  // 如果是公开路径或 API 路径，直接放行
  if (isPublicPath || pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return;
  }

  // 对于受保护的路径，检查认证状态
  const authHeader = request.headers.get("Authorization");
  const apiKey = request.nextUrl.searchParams.get("key");
  
  // 简单检查是否有认证信息（更详细的验证在 API 层面进行）
  if (!authHeader && !apiKey) {
    // 未认证，重定向到登录页
    const loginUrl = new URL('/login', request.url);
    return Response.redirect(loginUrl);
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