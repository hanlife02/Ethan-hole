import Sdk from "casdoor-js-sdk";
import jwt from "jsonwebtoken";

// Casdoor 配置
export const casdoorConfig = {
  serverUrl: process.env.CASDOOR_ENDPOINT || "https://demo.casdoor.com",
  clientId: process.env.CASDOOR_CLIENT_ID || "",
  clientSecret: process.env.CASDOOR_CLIENT_SECRET || "",
  appName: process.env.CASDOOR_APP_NAME || "ethan-hole",
  organizationName: process.env.CASDOOR_ORGANIZATION_NAME || "Ethan Club",
  redirectPath: "/callback",
};

// 创建 Casdoor SDK 实例
export const casdoorSdk = new Sdk(casdoorConfig);

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
export function getSigninUrl(): string {
  return casdoorSdk.getSigninUrl();
}

// 生成注册 URL
export function getSignupUrl(): string {
  return casdoorSdk.getSignupUrl();
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
