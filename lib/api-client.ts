// API 客户端工具函数，处理双重认证

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: any;
  headers?: Record<string, string>;
  requireAuth?: boolean;
}

// 获取认证 headers
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  // 添加 Casdoor token
  if (typeof window !== "undefined") {
    const casdoorToken = localStorage.getItem("casdoor_token");
    if (casdoorToken) {
      headers["Authorization"] = `Bearer ${casdoorToken}`;
    }
  }

  return headers;
}

// 获取存储的 API Key（仅在双重认证成功后临时存储）
function getStoredApiKey(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("api_key") || null;
  }
  return null;
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
    // 添加认证 headers
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
        // 如果需要 API key，添加到请求体中
        const apiKey = getStoredApiKey();
        if (apiKey && requireAuth) {
          requestOptions.body = JSON.stringify({ ...body, key: apiKey });
        } else {
          requestOptions.body = JSON.stringify(body);
        }
      } else {
        requestOptions.body = body;
      }
    }
  } else if (method === "GET" && requireAuth) {
    // 对于 GET 请求，将 API key 添加到 URL 参数中
    const apiKey = getStoredApiKey();
    if (apiKey) {
      const urlObj = new URL(url, window.location.origin);
      urlObj.searchParams.set("key", apiKey);
      url = urlObj.toString();
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

// 检查双重认证状态
export async function checkAuthStatus(): Promise<{
  isAuthenticated: boolean;
  user?: any;
  mode?: string;
}> {
  // 服务端直接返回未认证状态
  if (typeof window === "undefined") {
    return { isAuthenticated: false };
  }

  try {
    // 检查是否有必要的认证信息
    const casdoorToken = localStorage.getItem("casdoor_token");
    const apiKey = getStoredApiKey();

    if (!casdoorToken || !apiKey) {
      return { isAuthenticated: false };
    }

    const response = await authenticatedFetch("/api/auth", { method: "GET" });

    if (response.ok) {
      const data = await response.json();
      return {
        isAuthenticated: true,
        user: data.user,
        mode: data.mode,
      };
    } else {
      // 认证失败，清除本地存储的认证信息
      localStorage.removeItem("casdoor_token");
      localStorage.removeItem("api_key");
      localStorage.removeItem("auth_mode");
      localStorage.removeItem("user_info");
      return { isAuthenticated: false };
    }
  } catch (error) {
    console.error("Auth status check failed:", error);
    return { isAuthenticated: false };
  }
}

// 保存双重认证信息
export function saveAuthInfo(casdoorToken: string, apiKey: string, user: any) {
  if (typeof window !== "undefined") {
    localStorage.setItem("casdoor_token", casdoorToken);
    localStorage.setItem("api_key", apiKey);
    localStorage.setItem("auth_mode", "dual");
    localStorage.setItem("user_info", JSON.stringify(user));
  }
}

// 清除认证信息
export function clearAuthInfo() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("casdoor_token");
    localStorage.removeItem("api_key");
    localStorage.removeItem("auth_mode");
    localStorage.removeItem("user_info");
  }
}
