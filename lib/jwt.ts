import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_ALGORITHM = 'HS256';

// 将字符串转换为 Uint8Array
function getJWTSecret(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET);
}

// JWT token 的 payload 接口
export interface JWTPayload {
  userId: string;
  email?: string;
  casdoorVerified: boolean;
  apiKeyVerified: boolean;
  iat: number;
  exp: number;
}

// 生成 JWT token
export async function generateJWTToken(payload: {
  userId: string;
  email?: string;
  casdoorVerified: boolean;
  apiKeyVerified: boolean;
}): Promise<string> {
  try {
    const secret = getJWTSecret();
    
    const jwt = await new SignJWT({
      userId: payload.userId,
      email: payload.email,
      casdoorVerified: payload.casdoorVerified,
      apiKeyVerified: payload.apiKeyVerified,
    })
      .setProtectedHeader({ alg: JWT_ALGORITHM })
      .setIssuedAt()
      .setExpirationTime('7d') // 7天过期
      .sign(secret);
    
    console.log('JWT token generated successfully');
    return jwt;
  } catch (error) {
    console.error('JWT token generation failed:', error);
    // 如果jose库有问题，抛出错误让调用者知道
    throw new Error('JWT generation failed: ' + error.message);
  }
}

// 验证 JWT token
export async function verifyJWTToken(token: string): Promise<JWTPayload | null> {
  try {
    const secret = getJWTSecret();
    const { payload } = await jwtVerify(token, secret);
    
    console.log('JWT token verified successfully');
    return payload as JWTPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

// 从请求头中提取 JWT token
export function extractJWTFromRequest(authHeader: string | null): string | null {
  if (!authHeader) return null;
  
  // 支持 "Bearer token" 格式
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // 支持直接的 token 格式
  return authHeader;
}

// 检查 JWT token 是否已完成双重认证
export function isFullyAuthenticated(payload: JWTPayload): boolean {
  return payload.casdoorVerified && payload.apiKeyVerified;
}