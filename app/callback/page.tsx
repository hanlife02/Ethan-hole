"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [error, setError] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 从 URL 参数获取 code 或 token
        const code = searchParams.get("code");
        const token = searchParams.get("token");

        if (!code && !token) {
          setStatus("error");
          setError("未收到认证代码或令牌");
          return;
        }

        // 如果有 token，直接保存
        if (token) {
          localStorage.setItem("casdoor_token", token);
          setStatus("success");
          setTimeout(() => {
            router.push("/");
          }, 2000);
          return;
        }

        // 如果有 code，需要换取 token
        if (code) {
          const response = await fetch("/api/auth/callback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.token) {
              localStorage.setItem("casdoor_token", data.token);
              setStatus("success");
              setTimeout(() => {
                router.push("/");
              }, 2000);
            } else {
              setStatus("error");
              setError("未收到有效的令牌");
            }
          } else {
            const errorData = await response.json();
            setStatus("error");
            setError(errorData.error || "认证失败");
          }
        }
      } catch (err) {
        console.error("Callback processing failed:", err);
        setStatus("error");
        setError("处理认证回调时发生错误");
      }
    };

    handleCallback();
  }, [searchParams, router]);

  const handleRetry = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="text-center">
            {status === "loading" && (
              <>
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-500" />
                <h2 className="text-xl font-semibold mb-2">处理认证中...</h2>
                <p className="text-muted-foreground">
                  请稍候，正在完成登录流程
                </p>
              </>
            )}

            {status === "success" && (
              <>
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h2 className="text-xl font-semibold mb-2">认证成功！</h2>
                <p className="text-muted-foreground">正在跳转到主页面...</p>
              </>
            )}

            {status === "error" && (
              <>
                <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                <h2 className="text-xl font-semibold mb-2">认证失败</h2>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={handleRetry} className="w-full">
                  返回登录
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
