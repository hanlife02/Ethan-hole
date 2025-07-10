import { NextRequest, NextResponse } from "next/server";
import { verifyApiKey, getTokenFromRequest } from "@/lib/auth-middleware";
import { verifyCasdoorToken } from "@/lib/casdoor";

interface DebugInfo {
  steps: string[];
  apiKey: {
    provided: boolean;
    valid: boolean;
  };
  casdoorToken: {
    provided: boolean;
    valid: boolean;
    userData: any;
  };
  environment: {
    hasAccessKey: boolean;
    hasCasdoorEndpoint: boolean;
    hasCasdoorClientId: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { key, casdoorToken } = await request.json();

    const debugInfo: DebugInfo = {
      steps: [],
      apiKey: {
        provided: !!key,
        valid: false,
      },
      casdoorToken: {
        provided: !!casdoorToken,
        valid: false,
        userData: null,
      },
      environment: {
        hasAccessKey: !!process.env.ACCESS_KEY,
        hasCasdoorEndpoint: !!process.env.CASDOOR_ENDPOINT,
        hasCasdoorClientId: !!process.env.CASDOOR_CLIENT_ID,
      },
    };

    // 步骤1: 检查是否提供了所需参数
    debugInfo.steps.push("1. 检查参数提供情况");
    if (!key || !casdoorToken) {
      debugInfo.steps.push(
        `❌ 缺少必要参数: key=${!!key}, casdoorToken=${!!casdoorToken}`
      );
      return NextResponse.json(debugInfo);
    }
    debugInfo.steps.push("✅ 双重认证参数都已提供");

    // 步骤2: 验证 API Key
    debugInfo.steps.push("2. 验证 API Key");
    try {
      debugInfo.apiKey.valid = verifyApiKey(key);
      if (debugInfo.apiKey.valid) {
        debugInfo.steps.push("✅ API Key 验证成功");
      } else {
        debugInfo.steps.push("❌ API Key 验证失败");
      }
    } catch (error: any) {
      debugInfo.steps.push(`❌ API Key 验证异常: ${error.message}`);
    }

    // 步骤3: 验证 Casdoor Token
    debugInfo.steps.push("3. 验证 Casdoor Token");
    try {
      const userData = await verifyCasdoorToken(casdoorToken);
      debugInfo.casdoorToken.valid = !!userData;
      debugInfo.casdoorToken.userData = userData;

      if (userData) {
        debugInfo.steps.push("✅ Casdoor Token 验证成功");
        debugInfo.steps.push(`   用户信息: ${JSON.stringify(userData)}`);
      } else {
        debugInfo.steps.push("❌ Casdoor Token 验证失败");
      }
    } catch (error: any) {
      debugInfo.steps.push(`❌ Casdoor Token 验证异常: ${error.message}`);
    }

    // 步骤4: 双重认证结果
    debugInfo.steps.push("4. 双重认证结果");
    const dualAuthSuccess =
      debugInfo.apiKey.valid && debugInfo.casdoorToken.valid;
    if (dualAuthSuccess) {
      debugInfo.steps.push("✅ 双重认证成功");
    } else {
      debugInfo.steps.push("❌ 双重认证失败");
    }

    return NextResponse.json(debugInfo);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "调试过程失败",
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
