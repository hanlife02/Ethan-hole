"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Shield, Key, Sun, Moon } from "lucide-react";
import { getSigninUrl } from "@/lib/casdoor";
import { saveAuthInfo } from "@/lib/api-client";
import { useTheme } from "@/lib/theme-context";

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [step, setStep] = useState<'apikey' | 'casdoor'>('apikey');
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [casdoorToken, setCasdoorToken] = useState("");

  // 检查已有认证状态
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const existingApiKey = localStorage.getItem("api_key");
    const existingCasdoorToken = localStorage.getItem("casdoor_token");
    
    if (existingApiKey && existingCasdoorToken) {
      // 双重认证都已完成，直接跳转
      router.push("/");
      return;
    }
    
    if (existingCasdoorToken) {
      setCasdoorToken(existingCasdoorToken);
      setStep('apikey');
    }
  }, [router]);

  const handleApiKeySubmit = async () => {
    if (!apiKey.trim()) {
      setError("请输入 API Key");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 验证 API Key
      const response = await fetch("/api/auth/verify-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: apiKey }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // API Key 验证成功，保存并进入第二步
        if (typeof window !== "undefined") {
          localStorage.setItem("temp_api_key", apiKey);
        }
        setStep('casdoor');
      } else {
        setError(data.error || "API Key 验证失败");
      }
    } catch (err) {
      setError("API Key 验证请求失败");
    } finally {
      setLoading(false);
    }
  };

  const handleCasdoorLogin = async () => {
    try {
      const loginUrl = await getSigninUrl();
      window.location.href = loginUrl;
    } catch (error) {
      setError("无法跳转到 Casdoor 登录页面");
    }
  };

  const handleCompleteDualAuth = async () => {
    if (!casdoorToken) {
      setError("Casdoor 认证信息缺失，请重新登录");
      return;
    }

    const tempApiKey = typeof window !== "undefined" ? localStorage.getItem("temp_api_key") : null;
    if (!tempApiKey) {
      setError("API Key 信息丢失，请重新开始认证");
      setStep('apikey');
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: tempApiKey,
          casdoorToken: casdoorToken,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 双重认证成功，保存认证信息并跳转到主页
        saveAuthInfo(casdoorToken, tempApiKey, data.user);
        if (typeof window !== "undefined") {
          localStorage.removeItem("temp_api_key");
        }
        router.push("/");
      } else {
        setError(data.error || "双重认证失败");
      }
    } catch (err) {
      setError("认证请求失败");
    } finally {
      setLoading(false);
    }
  };

  const handleResetAuth = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("casdoor_token");
      localStorage.removeItem("temp_api_key");
    }
    setCasdoorToken("");
    setApiKey("");
    setError("");
    setStep('apikey');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Ethan Hole
            </h1>
            <p className="text-muted-foreground">双重认证登录</p>
          </div>

          {step === 'apikey' ? (
            // 第一步：API Key 认证
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Key className="h-5 w-5" />
                第一步：API Key 认证
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                请先输入您的 API Key
              </p>
              <div className="space-y-4">
                <Input
                  type="password"
                  placeholder="输入 API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleApiKeySubmit()}
                />
                {error && (
                  <div className="text-red-500 text-sm border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 p-3 rounded">
                    {error}
                  </div>
                )}
                <Button
                  onClick={handleApiKeySubmit}
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "验证中..." : "下一步"}
                </Button>
              </div>
            </div>
          ) : (
            // 第二步：Casdoor 认证
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
                <p className="text-green-800 dark:text-green-200 text-sm flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  API Key 认证已完成
                </p>
              </div>

              <h3 className="text-lg font-medium flex items-center gap-2">
                <Shield className="h-5 w-5" />
                第二步：Casdoor 统一认证
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                请完成 Casdoor 认证以完成双重认证
              </p>
              <div className="space-y-4">
                {casdoorToken ? (
                  <>
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                      <p className="text-green-800 dark:text-green-200 text-sm flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Casdoor 认证已完成
                      </p>
                    </div>
                    <Button
                      onClick={handleCompleteDualAuth}
                      className="w-full"
                      disabled={loading}
                    >
                      {loading ? "验证中..." : "完成双重认证"}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleCasdoorLogin}
                    className="w-full"
                    variant="default"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Casdoor 登录
                  </Button>
                )}
                {error && (
                  <div className="text-red-500 text-sm border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 p-3 rounded">
                    {error}
                  </div>
                )}
                <Button
                  onClick={handleResetAuth}
                  className="w-full"
                  variant="outline"
                >
                  重新开始认证
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              所有用户都需要通过双重认证才能访问系统
              <br />
              第一步：API Key 认证 → 第二步：Casdoor 统一认证
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
