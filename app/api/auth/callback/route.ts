import { NextRequest, NextResponse } from "next/server";
import { casdoorConfig } from "@/lib/casdoor";

// Handle OAuth callback from Casdoor (GET request)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) {
      return NextResponse.redirect(
        new URL("/login?error=missing_code", request.url)
      );
    }

    // 获取真实的 baseUrl - 优先使用环境变量
    let baseUrl: string;
    
    if (process.env.NEXTAUTH_URL) {
      baseUrl = process.env.NEXTAUTH_URL;
    } else if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else {
      // 临时硬编码生产域名 - 请替换为你的实际域名
      baseUrl = "https://your-actual-domain.com";
      
      // 或者从请求头获取（如果上面不行的话）
      // const requestUrl = new URL(request.url);
      // const forwardedHost = request.headers.get('x-forwarded-host');
      // const forwardedProto = request.headers.get('x-forwarded-proto');
      // const host = forwardedHost || request.headers.get('host') || requestUrl.host;
      // const protocol = forwardedProto || requestUrl.protocol.replace(':', '');
      // baseUrl = `${protocol}://${host}`;
    }

    console.log('Callback request details:', {
      originalUrl: request.url,
      baseUrl,
      envNextAuthUrl: process.env.NEXTAUTH_URL,
      envVercelUrl: process.env.VERCEL_URL,
      forwardedHost: request.headers.get('x-forwarded-host'),
      forwardedProto: request.headers.get('x-forwarded-proto'),
      host: request.headers.get('host')
    });

    // 手动调用 Casdoor API 获取 token
    const tokenUrl = `${casdoorConfig.serverUrl}/api/login/oauth/access_token`;
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: casdoorConfig.clientId,
      client_secret: casdoorConfig.clientSecret,
      code: code,
      redirect_uri: `${baseUrl}${casdoorConfig.redirectPath}`,
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
      return NextResponse.redirect(
        new URL("/login?error=token_exchange_failed", request.url)
      );
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return NextResponse.redirect(
        new URL("/login?error=no_access_token", request.url)
      );
    }

    // 使用真实的 baseUrl 进行重定向
    const callbackUrl = `${baseUrl}/callback?token=${tokenData.access_token}`;
    console.log('Redirecting to:', callbackUrl);
    
    return NextResponse.redirect(callbackUrl);
  } catch (error) {
    console.error("Casdoor callback error:", error);
    return NextResponse.redirect(
      new URL("/login?error=callback_failed", request.url)
    );
  }
}

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
