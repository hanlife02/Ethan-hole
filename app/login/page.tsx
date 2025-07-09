"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Shield, Key } from "lucide-react";
import { getSigninUrl, getSignupUrl } from "@/lib/casdoor";

export default function LoginPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [casdoorToken, setCasdoorToken] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // 检查是否已经通过 casdoor 认证
  useEffect(() => {
    const token = localStorage.getItem("casdoor_token");
    if (token) {
      setCasdoorToken(token);
      setShowApiKeyInput(true);
    }
  }, []);

  const handleCasdoorLogin = () => {
    try {
      const loginUrl = getSigninUrl();
      window.location.href = loginUrl;
    } catch (error) {
      setError("无法跳转到 Casdoor 登录页面");
    }
  };

  const handleCasdoorRegister = () => {
    try {
      const registerUrl = getSignupUrl();
      window.location.href = registerUrl;
    } catch (error) {
      setError("无法跳转到 Casdoor 注册页面");
    }
  };

  const handleDualAuth = async () => {
    if (!apiKey.trim()) {
      setError("请输入 API Key");
      return;
    }

    if (!casdoorToken) {
      setError("Casdoor 认证信息缺失，请重新登录");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: apiKey,
          casdoorToken: casdoorToken,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 双重认证成功，跳转到主页
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
    localStorage.removeItem("casdoor_token");
    setCasdoorToken("");
    setShowApiKeyInput(false);
    setApiKey("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Ethan Hole
            </h1>
            <p className="text-muted-foreground">双重认证登录</p>
          </div>

          {!showApiKeyInput ? (
            // 第一步：Casdoor 认证
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Shield className="h-5 w-5" />
                第一步：Casdoor 统一认证
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                请先完成 Casdoor 认证，然后输入 API Key 完成双重认证
              </p>
              <div className="space-y-2">
                <Button
                  onClick={handleCasdoorLogin}
                  className="w-full"
                  variant="default"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Casdoor 登录
                </Button>
                <Button
                  onClick={handleCasdoorRegister}
                  className="w-full"
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Casdoor 注册
                </Button>
              </div>
            </div>
          ) : (
            // 第二步：API Key 认证
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-green-800 text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Casdoor 认证已完成
                </p>
              </div>

              <h3 className="text-lg font-medium flex items-center gap-2">
                <Key className="h-5 w-5" />
                第二步：API Key 认证
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                请输入您的 API Key 完成双重认证
              </p>
              <div className="space-y-4">
                <Input
                  type="password"
                  placeholder="输入 API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleDualAuth()}
                />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Button
                  onClick={handleDualAuth}
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "验证中..." : "完成双重认证"}
                </Button>
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
              第一步：Casdoor 统一认证 → 第二步：API Key 认证
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
