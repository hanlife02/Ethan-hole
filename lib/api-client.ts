// API 客户端工具函数，使用 JWT token 进行认证

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: any;
  headers?: Record<string, string>;
  requireAuth?: boolean;
}

// 获取JWT认证 headers
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  // 添加 JWT token
  if (typeof window !== "undefined") {
    const authToken = localStorage.getItem("auth_token");
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
  }

  return headers;
}

// 带认证的 fetch 函数
export async function authenticatedFetch(
  url: string,
  options: ApiOptions = {}
): Promise<Response> {
  const { method = "GET", body, headers = {}, requireAuth = true } = options;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (requireAuth) {
    // 添加JWT认证 headers
    const authHeaders = getAuthHeaders();
    Object.assign(requestHeaders, authHeaders);
  }

  const requestOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };

  // 处理请求体
  if (body) {
    if (method === "POST" || method === "PUT") {
      if (typeof body === "object") {
        requestOptions.body = JSON.stringify(body);
      } else {
        requestOptions.body = body;
      }
    }
  }

  return fetch(url, requestOptions);
}

// 便捷方法
export const apiClient = {
  get: (url: string, options?: Omit<ApiOptions, "method">) =>
    authenticatedFetch(url, { ...options, method: "GET" }),

  post: (
    url: string,
    body?: any,
    options?: Omit<ApiOptions, "method" | "body">
  ) => authenticatedFetch(url, { ...options, method: "POST", body }),

  put: (
    url: string,
    body?: any,
    options?: Omit<ApiOptions, "method" | "body">
  ) => authenticatedFetch(url, { ...options, method: "PUT", body }),

  delete: (url: string, options?: Omit<ApiOptions, "method">) =>
    authenticatedFetch(url, { ...options, method: "DELETE" }),
};

// 检查认证状态
export async function checkAuthStatus(): Promise<{
  isAuthenticated: boolean;
  user?: any;
}> {
  // 服务端直接返回未认证状态
  if (typeof window === "undefined") {
    return { isAuthenticated: false };
  }

  try {
    const authToken = localStorage.getItem("auth_token");

    console.log('Auth status check:', {
      hasAuthToken: !!authToken,
      authTokenLength: authToken?.length
    });

    if (!authToken) {
      console.log('Missing JWT auth token');
      return { isAuthenticated: false };
    }

    // 验证 JWT token 是否有效
    const response = await fetch("/api/auth/verify-token", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('JWT token verification successful:', data);
      
      // 检查是否完成双重认证
      if (data.payload && data.payload.casdoorVerified && data.payload.apiKeyVerified) {
        const userInfo = localStorage.getItem("user_info");
        return {
          isAuthenticated: true,
          user: userInfo ? JSON.parse(userInfo) : data.payload,
        };
      } else {
        console.log('Incomplete authentication');
        return { isAuthenticated: false };
      }
    } else {
      console.log('JWT token verification failed');
      // Token 无效，清理并要求重新认证
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_info");
      return { isAuthenticated: false };
    }
  } catch (error) {
    console.error("Auth status check failed:", error);
    return { isAuthenticated: false };
  }
}

// 清除认证信息
export function clearAuthInfo() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("casdoor_token");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_info");
  }
}
