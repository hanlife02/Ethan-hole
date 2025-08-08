/*
 * @Author: Ethan yanghan0911@gmail.com
 * @Date: 2025-06-29 03:19:02
 * @LastEditors: Ethan yanghan0911@gmail.com
 * @LastEditTime: 2025-07-16 22:49:35
 * @FilePath: /Ethan-hole/app/api/auth/route.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { type NextRequest, NextResponse } from "next/server";
import { verifyApiKey, getTokenFromRequest } from "@/lib/auth-middleware";
import { verifyCasdoorToken } from "@/lib/casdoor";

export async function POST(request: NextRequest) {
  try {
    const { key, casdoorToken } = await request.json();

    // 只支持双重认证：必须同时提供 API key 和 Casdoor token
    if (!key || !casdoorToken) {
      return NextResponse.json(
        { error: "双重认证失败：需要同时提供 API Key 和 Casdoor Token" },
        { status: 401 }
      );
    }

    // 验证 API Key
    if (!verifyApiKey(key)) {
      return NextResponse.json(
        { error: "双重认证失败：API Key 无效" },
        { status: 401 }
      );
    }

    // 验证 Casdoor token
    const userData = await verifyCasdoorToken(casdoorToken);
    if (!userData) {
      return NextResponse.json(
        { error: "双重认证失败：Casdoor Token 无效" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      mode: "dual",
      user: { ...userData, role: "verified_user" },
    });
  } catch (error) {
    console.error("Dual authentication error:", error);
    return NextResponse.json({ error: "双重认证失败" }, { status: 500 });
  }
}

// 支持 GET 请求进行认证验证，也需要双重认证
export async function GET(request: NextRequest) {
  try {
    // 从 Authorization header 获取 Casdoor token
    const casdoorToken = getTokenFromRequest(request);

    // 从查询参数获取 API key
    const apiKey = request.nextUrl.searchParams.get("key");

    // 必须同时提供两种认证信息
    if (!apiKey || !casdoorToken) {
      return NextResponse.json(
        { error: "双重认证失败：需要同时提供 API Key 和 Casdoor Token" },
        { status: 401 }
      );
    }

    // 验证 API Key
    if (!verifyApiKey(apiKey)) {
      return NextResponse.json(
        { error: "双重认证失败：API Key 无效" },
        { status: 401 }
      );
    }

    // 验证 Casdoor token
    const userData = await verifyCasdoorToken(casdoorToken);
    if (!userData) {
      return NextResponse.json(
        { error: "双重认证失败：Casdoor Token 无效" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      mode: "dual",
      user: { ...userData, role: "verified_user" },
    });
  } catch (error) {
    console.error("Dual authentication verification error:", error);
    return NextResponse.json({ error: "双重认证验证失败" }, { status: 500 });
  }
}
