import { NextRequest, NextResponse } from "next/server";
import { verifyJWTToken, extractJWTFromRequest } from "@/lib/jwt";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const token = extractJWTFromRequest(authHeader);
    
    if (!token) {
      return NextResponse.json(
        { error: "JWT token is required" },
        { status: 401 }
      );
    }

    // 验证 JWT token
    const payload = await verifyJWTToken(token);
    
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired JWT token" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      payload: payload,
    });
  } catch (error) {
    console.error("JWT token verification error:", error);
    return NextResponse.json(
      { error: "Token verification failed" },
      { status: 500 }
    );
  }
}