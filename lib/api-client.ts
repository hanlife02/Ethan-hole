// API 客户端工具函数，自动处理认证

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
  const casdoorToken = localStorage.getItem("casdoor_token");
  if (casdoorToken) {
    headers["Authorization"] = `Bearer ${casdoorToken}`;
  }

  return headers;
}

// 获取 API Key（如果有的话）
function getApiKey(): string | null {
  // 检查是否是管理员模式
  const authMode = localStorage.getItem("auth_mode");
  if (authMode === "admin") {
    // 这里可以从环境变量或其他地方获取 API key
    // 但为了安全起见，不建议在前端存储 API key
    // 在实际应用中，管理员应该每次都输入 API key
    return null;
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
        const apiKey = getApiKey();
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
    const apiKey = getApiKey();
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

// 检查认证状态
export async function checkAuthStatus(): Promise<{
  isAuthenticated: boolean;
  user?: any;
  mode?: string;
}> {
  try {
    const response = await authenticatedFetch("/api/auth", { method: "GET" });

    if (response.ok) {
      const data = await response.json();
      return {
        isAuthenticated: true,
        user: data.user,
        mode: data.mode,
      };
    } else {
      return { isAuthenticated: false };
    }
  } catch (error) {
    console.error("Auth status check failed:", error);
    return { isAuthenticated: false };
  }
}
