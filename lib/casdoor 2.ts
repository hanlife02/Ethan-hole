/*
 * @Author: Ethan && ethan@hanlife02.com
 * @Date: 2025-07-10 00:30:09
 * @LastEditors: Ethan && ethan@hanlife02.com
 * @LastEditTime: 2025-07-10 01:12:32
 * @FilePath: /Ethan-hole/lib/casdoor.ts
 * @Description:
 *
 * Copyright (c) 2025 by Ethan, All Rights Reserved.
 */
import Sdk from "casdoor-js-sdk";
import jwt from "jsonwebtoken";

// Casdoor 配置
export const casdoorConfig = {
  serverUrl: process.env.CASDOOR_ENDPOINT || "https://demo.casdoor.com",
  clientId: process.env.CASDOOR_CLIENT_ID || "",
  clientSecret: process.env.CASDOOR_CLIENT_SECRET || "",
  appName: process.env.CASDOOR_APP_NAME || "ethan-hole",
  organizationName: process.env.CASDOOR_ORGANIZATION_NAME || "Ethan Club",
  redirectPath: "/api/auth/callback",
};

// 延迟创建 Casdoor SDK 实例，只在客户端创建
let casdoorSdk: Sdk | null = null;

// 客户端配置缓存
let clientConfig: any = null;

// 获取客户端配置
async function getClientConfig() {
  if (typeof window === "undefined") {
    // 服务端直接使用环境变量
    return casdoorConfig;
  }

  if (clientConfig) {
    return clientConfig;
  }

  try {
    const response = await fetch("/api/casdoor-config");
    if (response.ok) {
      clientConfig = await response.json();
      return clientConfig;
    } else {
      throw new Error("Failed to fetch config");
    }
  } catch (error) {
    console.error("Failed to get client config:", error);
    // 降级到默认配置
    return {
      serverUrl: "https://demo.casdoor.com",
      clientId: "",
      appName: "ethan-hole",
      organizationName: "Ethan Club",
      redirectPath: "/api/auth/callback",
    };
  }
}

function getCasdoorSdk(): Sdk {
  if (typeof window === "undefined") {
    throw new Error("Casdoor SDK can only be used in browser environment");
  }

  if (!casdoorSdk) {
    casdoorSdk = new Sdk(casdoorConfig);
  }

  return casdoorSdk;
}

// 手动构建 Casdoor URL
async function buildCasdoorUrl(type: "signin" | "signup"): Promise<string> {
  const config = await getClientConfig();
  const { serverUrl, clientId, organizationName, appName, redirectPath } =
    config;

  // 获取当前域名 - 优先使用 window.location.origin，然后是环境变量，最后动态检测
  let baseUrl: string;
  if (typeof window !== "undefined") {
    baseUrl = window.location.origin;
  } else {
    // 服务端：优先使用环境变量，否则需要在实际请求中动态获取
    baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : "http://localhost:5632";
  }

  const redirectUri = encodeURIComponent(`${baseUrl}${redirectPath}`);
  const state = Math.random().toString(36).substring(7);

  if (type === "signup") {
    return `${serverUrl}/signup/${organizationName}/${appName}?redirect_uri=${redirectUri}&state=${state}`;
  } else {
    return `${serverUrl}/login/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=profile&state=${state}`;
  }
}

// 验证 JWT token
export function verifyJwtToken(token: string): any {
  try {
    // 这里应该使用 Casdoor 的公钥来验证 JWT
    // 如果没有公钥，可以通过调用 Casdoor API 验证
    const decoded = jwt.decode(token);

    if (!decoded) {
      throw new Error("Invalid token");
    }

    return decoded;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

// 通过 Casdoor API 验证 token
export async function verifyCasdoorToken(token: string): Promise<any> {
  try {
    const response = await fetch(`${casdoorConfig.serverUrl}/api/get-account`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Token verification failed");
    }

    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error("Casdoor token verification failed:", error);
    return null;
  }
}

// 生成登录 URL
export async function getSigninUrl(): Promise<string> {
  try {
    // 客户端优先使用手动构建（确保使用正确的配置）
    return await buildCasdoorUrl("signin");
  } catch (error) {
    console.error("Failed to get signin URL:", error);
    // 降级到手动构建
    return await buildCasdoorUrl("signin");
  }
}

// 从 URL 获取 token
export function getTokenFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get("code") || urlObj.searchParams.get("token");
  } catch (error) {
    console.error("Failed to parse URL:", error);
    return null;
  }
}
