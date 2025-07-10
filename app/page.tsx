"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  MessageCircle,
  Star,
  Search,
  TrendingUp,
  Clock,
  Eye,
  Settings,
  Sun,
  Moon,
  RefreshCw,
  ArrowUp,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { checkAuthStatus, apiClient, clearAuthInfo } from "@/lib/api-client";
import { useTheme } from "@/lib/theme-context";

interface Hole {
  pid: number;
  text: string;
  type: "text" | "image";
  created_at: string;
  reply: number;
  likenum: number;
  image_response?: string;
}

interface Comment {
  pid: number;
  cid: number;
  text: string;
  created_at: string;
  name: string;
  replied_to_cid?: number;
}

interface Stats {
  totalHoles: number;
  totalComments: number;
}

// 相对时间格式化函数
function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "刚刚";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}分钟前`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}小时前`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays}天前`;
  }

  // 更精确的月份计算
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();
  const dateYear = date.getFullYear();
  const dateMonth = date.getMonth();

  const yearDiff = nowYear - dateYear;
  const monthDiff = nowMonth - dateMonth + yearDiff * 12;

  if (monthDiff < 12) {
    return `${monthDiff}个月前`;
  }

  return `${yearDiff}年前`;
}

export default function EthanHole() {
  const { theme, toggleTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [latestHoles, setLatestHoles] = useState<Hole[]>([]);
  const [hotHoles, setHotHoles] = useState<Hole[]>([]);
  const [searchPid, setSearchPid] = useState("");
  const [searchResult, setSearchResult] = useState<{
    hole: Hole;
    comments: Comment[];
  } | null>(null);
  // 关键词搜索相关状态
  const [keywords, setKeywords] = useState("");
  const [keywordResults, setKeywordResults] = useState<Hole[]>([]);
  const [keywordLoading, setKeywordLoading] = useState(false);
  const [keywordPage, setKeywordPage] = useState(1);
  const [keywordHasMore, setKeywordHasMore] = useState(true);
  const [keywordTotal, setKeywordTotal] = useState(0);
  const [stats, setStats] = useState<Stats>({
    totalHoles: 0,
    totalComments: 0,
  });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [expandedComments, setExpandedComments] = useState<{
    [key: number]: number;
  }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullCurrentY, setPullCurrentY] = useState(0);
  const [showThemeToggle, setShowThemeToggle] = useState(false);
  const [hotTimeFilter, setHotTimeFilter] = useState("24h");
  const [hotThreshold, setHotThreshold] = useState(20); // 热点阈值
  const [hotFilterMode, setHotFilterMode] = useState<
    "combined" | "comments" | "likes"
  >("combined"); // 筛选模式
  const [hotCommentsThreshold, setHotCommentsThreshold] = useState(10); // 评论数阈值
  const [hotLikesThreshold, setHotLikesThreshold] = useState(10); // 收藏数阈值
  const [hotSortMode, setHotSortMode] = useState<"hot" | "time">("hot"); // 排序模式：hot=按热度排序，time=按时间排序
  const [customThresholdInput, setCustomThresholdInput] = useState(""); // 自定义阈值输入
  const [loadingHot, setLoadingHot] = useState(false);
  const [hotDisplayCount, setHotDisplayCount] = useState(20); // 热点树洞显示数量
  const [holeComments, setHoleComments] = useState<{
    [key: number]: Comment[];
  }>({});
  const [loadingComments, setLoadingComments] = useState<{
    [key: number]: boolean;
  }>({});

  // 移除旧的单独 API key 认证，改为重定向到双重认证页面
  const handleAuth = () => {
    window.location.href = "/login";
  };

  // 处理自定义阈值
  const handleCustomThreshold = () => {
    const value = parseInt(customThresholdInput);
    if (isNaN(value) || value < 0) {
      setError("请输入有效的数字");
      return;
    }

    if (hotFilterMode === "combined") {
      setHotThreshold(value);
    } else if (hotFilterMode === "comments") {
      setHotCommentsThreshold(value);
    } else {
      setHotLikesThreshold(value);
    }

    setCustomThresholdInput("");
    loadHotHoles(hotTimeFilter, value, hotFilterMode);
  };

  // 登出函数
  const handleLogout = () => {
    setIsAuthenticated(false);
    // 清除所有认证相关的本地存储
    if (typeof window !== "undefined") {
      localStorage.removeItem("casdoor_token");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_info");
    }
    // 跳转到登录页面
    window.location.href = "/login";
  };

  const loadInitialData = async () => {
    setLoading(true);

    // 确定当前阈值
    let currentThreshold;
    if (hotFilterMode === "combined") {
      currentThreshold = hotThreshold;
    } else if (hotFilterMode === "comments") {
      currentThreshold = hotCommentsThreshold;
    } else {
      currentThreshold = hotLikesThreshold;
    }

    try {
      const [latestRes, hotRes, statsRes] = await Promise.all([
        apiClient.get("/api/holes/latest?page=1&limit=20"),
        apiClient.get(
          `/api/holes/hot?time=${hotTimeFilter}&threshold=${currentThreshold}&filterMode=${hotFilterMode}&sortMode=${hotSortMode}`
        ),
        apiClient.get("/api/stats"),
      ]);

      if (latestRes.ok) {
        const latestData = await latestRes.json();
        setLatestHoles(latestData.holes || latestData);
        setHasMore(
          latestData.hasMore !== undefined ? latestData.hasMore : true
        );
        setCurrentPage(1);
      }
      if (hotRes.ok) setHotHoles(await hotRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      setError("Failed to load data");
    }
    setLoading(false);
  };

  const loadMoreHoles = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const response = await apiClient.get(
        `/api/holes/latest?page=${nextPage}&limit=20`
      );

      if (response.ok) {
        const data = await response.json();
        const newHoles = data.holes || data;

        if (newHoles.length > 0) {
          setLatestHoles((prev) => [...prev, ...newHoles]);
          setCurrentPage(nextPage);
          setHasMore(
            data.hasMore !== undefined ? data.hasMore : newHoles.length === 20
          );
        } else {
          setHasMore(false);
        }
      }
    } catch (err) {
      setError("Failed to load more holes");
    }
    setLoadingMore(false);
  };

  // 加载热点树洞
  const loadHotHoles = async (
    timeFilter: string,
    threshold?: number,
    filterMode?: "combined" | "comments" | "likes",
    sortMode?: "hot" | "time"
  ) => {
    setLoadingHot(true);

    const currentFilterMode = filterMode || hotFilterMode;
    const currentSortMode = sortMode || hotSortMode;
    let currentThreshold;

    if (threshold !== undefined) {
      currentThreshold = threshold;
    } else {
      if (currentFilterMode === "combined") {
        currentThreshold = hotThreshold;
      } else if (currentFilterMode === "comments") {
        currentThreshold = hotCommentsThreshold;
      } else {
        currentThreshold = hotLikesThreshold;
      }
    }

    try {
      const response = await apiClient.get(
        `/api/holes/hot?time=${timeFilter}&threshold=${currentThreshold}&filterMode=${currentFilterMode}&sortMode=${currentSortMode}`
      );
      if (response.ok) {
        const hotData = await response.json();
        setHotHoles(hotData);
        setHotDisplayCount(20); // 重置显示数量
        setHotTimeFilter(timeFilter);
        if (threshold !== undefined) {
          if (currentFilterMode === "combined") {
            setHotThreshold(threshold);
          } else if (currentFilterMode === "comments") {
            setHotCommentsThreshold(threshold);
          } else {
            setHotLikesThreshold(threshold);
          }
        }
        if (filterMode) {
          setHotFilterMode(filterMode);
        }
        if (sortMode) {
          setHotSortMode(sortMode);
        }
      }
    } catch (err) {
      setError("Failed to load hot holes");
    }
    setLoadingHot(false);
  };

  // 加载指定洞的评论
  const loadHoleComments = async (pid: number) => {
    if (loadingComments[pid] || holeComments[pid]) return;

    setLoadingComments((prev) => ({ ...prev, [pid]: true }));
    try {
      const response = await apiClient.get(`/api/holes/${pid}`);
      if (response.ok) {
        const data = await response.json();
        setHoleComments((prev) => ({ ...prev, [pid]: data.comments }));
        setExpandedComments((prev) => ({ ...prev, [pid]: 10 }));
      }
    } catch (err) {
      setError("Failed to load comments");
    }
    setLoadingComments((prev) => ({ ...prev, [pid]: false }));
  };

  // 折叠指定洞的评论
  const collapseHoleComments = (pid: number) => {
    setHoleComments((prev) => {
      const newComments = { ...prev };
      delete newComments[pid];
      return newComments;
    });
    setExpandedComments((prev) => {
      const newExpanded = { ...prev };
      delete newExpanded[pid];
      return newExpanded;
    });
  };

  const handleSearch = async () => {
    if (!searchPid) return;

    setLoading(true);
    try {
      // 处理PID输入，去除前面的#号
      const cleanPid = searchPid.startsWith("#")
        ? searchPid.slice(1)
        : searchPid;

      // 验证PID是否为有效数字
      if (!/^\d+$/.test(cleanPid)) {
        setError("请输入有效的PID");
        setSearchResult(null);
        setLoading(false);
        return;
      }

      const response = await apiClient.get(`/api/holes/${cleanPid}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResult(data);
        setExpandedComments({ [Number.parseInt(cleanPid)]: 10 });
        setError(""); // 清除之前的错误信息
      } else {
        setError("Hole not found");
        setSearchResult(null);
      }
    } catch (err) {
      setError("Search failed");
    }
    setLoading(false);
  };

  // 关键词搜索功能
  const handleKeywordSearch = async (page = 1, reset = true) => {
    if (!keywords.trim()) return;

    setKeywordLoading(true);
    if (reset) {
      setKeywordResults([]);
      setKeywordPage(1);
      setKeywordTotal(0);
    }

    try {
      const response = await apiClient.get(
        `/api/holes/search?q=${encodeURIComponent(
          keywords
        )}&page=${page}&limit=20`
      );
      if (response.ok) {
        const data = await response.json();
        if (reset) {
          setKeywordResults(data.holes);
        } else {
          setKeywordResults((prev) => [...prev, ...data.holes]);
        }
        setKeywordPage(data.page);
        setKeywordHasMore(data.hasMore);
        setKeywordTotal(data.total);
      } else {
        setError("Search failed");
      }
    } catch (err) {
      setError("搜索失败");
    }
    setKeywordLoading(false);
  };

  // 加载更多关键词搜索结果
  const loadMoreKeywordResults = () => {
    if (!keywordLoading && keywordHasMore) {
      handleKeywordSearch(keywordPage + 1, false);
    }
  };

  const loadMoreComments = (pid: number) => {
    setExpandedComments((prev) => ({
      ...prev,
      [pid]: (prev[pid] || 10) + 10,
    }));
  };

  // 刷新功能
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    setCurrentPage(1);
    setHasMore(true);

    // 确定当前阈值
    let currentThreshold;
    if (hotFilterMode === "combined") {
      currentThreshold = hotThreshold;
    } else if (hotFilterMode === "comments") {
      currentThreshold = hotCommentsThreshold;
    } else {
      currentThreshold = hotLikesThreshold;
    }

    try {
      const [latestRes, hotRes, statsRes] = await Promise.all([
        apiClient.get("/api/holes/latest?page=1&limit=20"),
        apiClient.get(
          `/api/holes/hot?time=${hotTimeFilter}&threshold=${currentThreshold}&filterMode=${hotFilterMode}&sortMode=${hotSortMode}`
        ),
        apiClient.get("/api/stats"),
      ]);

      if (latestRes.ok) {
        const latestData = await latestRes.json();
        setLatestHoles(latestData.holes || latestData);
        setHasMore(
          latestData.hasMore !== undefined ? latestData.hasMore : true
        );
      }
      if (hotRes.ok) setHotHoles(await hotRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      setError("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  }, [
    isRefreshing,
    hotTimeFilter,
    hotThreshold,
    hotFilterMode,
    hotCommentsThreshold,
    hotLikesThreshold,
    hotSortMode,
  ]);

  // 触摸事件处理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const scrollY = typeof window !== "undefined" ? window.scrollY : 0;
    if (scrollY === 0) {
      setPullStartY(e.touches[0].clientY);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const scrollY = typeof window !== "undefined" ? window.scrollY : 0;
      if (pullStartY > 0 && scrollY === 0) {
        const currentY = e.touches[0].clientY;
        setPullCurrentY(currentY);

        if (currentY - pullStartY > 100 && !isRefreshing) {
          e.preventDefault();
        }
      }
    },
    [pullStartY, isRefreshing]
  );

  const handleTouchEnd = useCallback(() => {
    const scrollY = typeof window !== "undefined" ? window.scrollY : 0;
    if (pullCurrentY - pullStartY > 100 && scrollY === 0 && !isRefreshing) {
      handleRefresh();
    }
    setPullStartY(0);
    setPullCurrentY(0);
  }, [pullCurrentY, pullStartY, isRefreshing, handleRefresh]);

  // 主题切换功能 - 使用 useTheme hook

  // 检查认证状态 - 基于 JWT token 的单一认证检查
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 检查是否有 JWT token
        const authToken = localStorage.getItem("auth_token");
        
        console.log('Main page auth check:', {
          hasAuthToken: !!authToken,
          authTokenLength: authToken?.length,
          tokenStart: authToken?.substring(0, 20)
        });
        
        if (!authToken) {
          console.log('Missing JWT auth token, redirecting to login');
          setIsAuthenticated(false);
          setAuthChecking(false);
          return;
        }

        // 验证 JWT token 是否有效
        try {
          const response = await fetch("/api/auth/verify-token", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${authToken}`
            },
          });

          if (response.ok) {
            const data = await response.json();
            console.log('JWT token verification successful:', data);
            
            // 检查是否完成双重认证
            if (data.payload && data.payload.casdoorVerified && data.payload.apiKeyVerified) {
              console.log('Dual authentication verified, allowing access');
              setIsAuthenticated(true);
            } else {
              console.log('Incomplete authentication, redirecting to login');
              setIsAuthenticated(false);
              // 清除无效的 token
              localStorage.removeItem("auth_token");
              localStorage.removeItem("user_info");
            }
          } else {
            console.log('JWT token verification failed');
            setIsAuthenticated(false);
            // 清除无效的 token
            localStorage.removeItem("auth_token");
            localStorage.removeItem("user_info");
          }
        } catch (tokenError) {
          console.error('JWT token verification error:', tokenError);
          setIsAuthenticated(false);
          // 清除无效的 token
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user_info");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsAuthenticated(false);
      } finally {
        setAuthChecking(false);
      }
    };

    checkAuth();
  }, []);

  // 认证后自动加载数据
  useEffect(() => {
    if (isAuthenticated) {
      loadInitialData();
    }
  }, [isAuthenticated]);

  // 在认证检查期间显示加载状态
  if (authChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">正在检查认证状态...</p>
        </div>
        <div className="absolute top-4 right-4">
          <Button variant="outline" size="icon" onClick={toggleTheme}>
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            <span className="sr-only">切换主题</span>
          </Button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Ethan Hole
              </h1>
              <p className="text-muted-foreground">请登录以继续访问</p>
            </div>
            <div className="space-y-4">
              <Button
                onClick={() => (window.location.href = "/login")}
                className="w-full"
              >
                双重认证登录
              </Button>

              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  需要通过 Casdoor 认证 + API Key 完成双重认证
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="absolute top-4 right-4">
          <Button variant="outline" size="icon" onClick={toggleTheme}>
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            <span className="sr-only">切换主题</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background transition-colors"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 下拉刷新指示器 */}
      {pullCurrentY - pullStartY > 0 &&
        typeof window !== "undefined" &&
        window.scrollY === 0 && (
          <div
            className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground text-center py-3 transition-transform duration-200 shadow-lg"
            style={{
              transform: `translateY(${Math.min(
                pullCurrentY - pullStartY - 50,
                0
              )}px)`,
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <ArrowUp
                className={`w-4 h-4 transition-transform duration-200 ${
                  pullCurrentY - pullStartY > 100 ? "rotate-180" : ""
                }`}
              />
              <span className="font-medium">
                {pullCurrentY - pullStartY > 100 ? "释放以刷新" : "下拉刷新"}
              </span>
            </div>
          </div>
        )}

      {/* 刷新加载指示器 */}
      {isRefreshing && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground text-center py-3 shadow-lg">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="font-medium">正在刷新...</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile Layout */}
          <div className="sm:hidden">
            {/* First row: Title and action buttons */}
            <div className="flex justify-between items-center h-14">
              <h1 className="text-lg font-bold text-foreground">Ethan Hole</h1>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="relative h-8 w-8"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${
                      isRefreshing ? "animate-spin" : ""
                    }`}
                  />
                  <span className="sr-only">刷新数据</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleTheme}
                  className="relative h-8 w-8"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-3.5 w-3.5" />
                  ) : (
                    <Moon className="h-3.5 w-3.5" />
                  )}
                  <span className="sr-only">切换主题</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="text-xs px-2 py-1 h-8"
                >
                  退出
                </Button>
              </div>
            </div>
            {/* Second row: Statistics */}
            <div className="flex items-center justify-center space-x-3 pb-3">
              <Badge
                variant="outline"
                className="flex items-center gap-1 text-xs"
              >
                <MessageCircle className="w-3 h-3" />
                {stats.totalHoles} holes
              </Badge>
              <Badge
                variant="outline"
                className="flex items-center gap-1 text-xs"
              >
                <Star className="w-3 h-3" />
                {stats.totalComments} comments
              </Badge>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-foreground">Ethan Hole</h1>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <Badge variant="outline" className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  {stats.totalHoles} holes
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  {stats.totalComments} comments
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="relative"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
                <span className="sr-only">刷新数据</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                className="relative"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                <span className="sr-only">切换主题</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="text-sm"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <Tabs defaultValue="latest" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger
              value="latest"
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Latest</span>
              <span className="sm:hidden">Latest</span>
            </TabsTrigger>
            <TabsTrigger
              value="hot"
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Hot</span>
              <span className="sm:hidden">Hot</span>
            </TabsTrigger>
            <TabsTrigger
              value="keyword"
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              <Search className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Keywords</span>
              <span className="sm:hidden">Words</span>
            </TabsTrigger>
            <TabsTrigger
              value="search"
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">PID</span>
              <span className="sm:hidden">PID</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="latest" className="space-y-4">
            <h2 className="text-lg font-semibold">Latest Holes</h2>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <>
                <div className="grid gap-4">
                  {latestHoles.map((hole) => (
                    <HoleCard
                      key={hole.pid}
                      hole={hole}
                      showComments={!!holeComments[hole.pid]}
                      comments={holeComments[hole.pid] || []}
                      expandedCount={expandedComments[hole.pid] || 10}
                      onLoadMore={() => loadMoreComments(hole.pid)}
                      onLoadComments={() => loadHoleComments(hole.pid)}
                      onCollapseComments={() => collapseHoleComments(hole.pid)}
                      loadingComments={loadingComments[hole.pid] || false}
                    />
                  ))}
                </div>

                {hasMore && (
                  <div className="text-center mt-6">
                    <Button
                      onClick={loadMoreHoles}
                      disabled={loadingMore}
                      variant="outline"
                      className="px-8"
                    >
                      {loadingMore ? "Loading..." : "Load More Holes"}
                    </Button>
                  </div>
                )}

                {!hasMore && latestHoles.length > 0 && (
                  <div className="text-center mt-6 text-muted-foreground">
                    No more holes to load
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="hot" className="space-y-4">
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">
                热点树洞 (
                {hotFilterMode === "combined"
                  ? `评论数 + 收藏数 ≥ ${hotThreshold}`
                  : hotFilterMode === "comments"
                  ? `评论数 ≥ ${hotCommentsThreshold}`
                  : `收藏数 ≥ ${hotLikesThreshold}`}
                {hotHoles.length > 0 && hotHoles.length > 20
                  ? ` · 显示 ${Math.min(hotDisplayCount, hotHoles.length)}/${
                      hotHoles.length
                    }`
                  : hotHoles.length > 0
                  ? ` · 共 ${hotHoles.length} 条`
                  : ""}
                )
              </h2>

              {/* 筛选器容器 - 垂直布局 */}
              <div className="flex flex-col gap-6">
                {/* 时间筛选器 */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    时间范围
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    <Button
                      variant={hotTimeFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => loadHotHoles("all")}
                      disabled={loadingHot}
                      className="text-xs sm:text-sm"
                    >
                      全部时间
                    </Button>
                    <Button
                      variant={hotTimeFilter === "1h" ? "default" : "outline"}
                      size="sm"
                      onClick={() => loadHotHoles("1h")}
                      disabled={loadingHot}
                      className="text-xs sm:text-sm"
                    >
                      1小时
                    </Button>
                    <Button
                      variant={hotTimeFilter === "6h" ? "default" : "outline"}
                      size="sm"
                      onClick={() => loadHotHoles("6h")}
                      disabled={loadingHot}
                      className="text-xs sm:text-sm"
                    >
                      6小时
                    </Button>
                    <Button
                      variant={hotTimeFilter === "24h" ? "default" : "outline"}
                      size="sm"
                      onClick={() => loadHotHoles("24h")}
                      disabled={loadingHot}
                      className="text-xs sm:text-sm"
                    >
                      24小时
                    </Button>
                    <Button
                      variant={hotTimeFilter === "7d" ? "default" : "outline"}
                      size="sm"
                      onClick={() => loadHotHoles("7d")}
                      disabled={loadingHot}
                      className="text-xs sm:text-sm"
                    >
                      7天
                    </Button>
                  </div>
                </div>

                {/* 热度筛选器 */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    热度筛选
                  </h3>

                  {/* 筛选模式选择器 */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-muted-foreground">
                      筛选模式
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant={
                          hotFilterMode === "combined" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => {
                          setHotFilterMode("combined");
                          loadHotHoles(hotTimeFilter, undefined, "combined");
                        }}
                        disabled={loadingHot}
                        className="text-xs"
                      >
                        评论+收藏
                      </Button>
                      <Button
                        variant={
                          hotFilterMode === "comments" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => {
                          setHotFilterMode("comments");
                          loadHotHoles(hotTimeFilter, undefined, "comments");
                        }}
                        disabled={loadingHot}
                        className="text-xs"
                      >
                        仅评论数
                      </Button>
                      <Button
                        variant={
                          hotFilterMode === "likes" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => {
                          setHotFilterMode("likes");
                          loadHotHoles(hotTimeFilter, undefined, "likes");
                        }}
                        disabled={loadingHot}
                        className="text-xs"
                      >
                        仅收藏数
                      </Button>
                    </div>
                  </div>

                  {/* 阈值选择器 */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-muted-foreground">
                      {hotFilterMode === "combined"
                        ? "评论+收藏"
                        : hotFilterMode === "comments"
                        ? "评论数"
                        : "收藏数"}
                      阈值
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      <Button
                        variant={
                          (hotFilterMode === "combined" &&
                            hotThreshold === 10) ||
                          (hotFilterMode === "comments" &&
                            hotCommentsThreshold === 10) ||
                          (hotFilterMode === "likes" &&
                            hotLikesThreshold === 10)
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => loadHotHoles(hotTimeFilter, 10)}
                        disabled={loadingHot}
                        className="text-xs"
                      >
                        ≥ 10
                      </Button>
                      <Button
                        variant={
                          (hotFilterMode === "combined" &&
                            hotThreshold === 20) ||
                          (hotFilterMode === "comments" &&
                            hotCommentsThreshold === 20) ||
                          (hotFilterMode === "likes" &&
                            hotLikesThreshold === 20)
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => loadHotHoles(hotTimeFilter, 20)}
                        disabled={loadingHot}
                        className="text-xs"
                      >
                        ≥ 20
                      </Button>
                      <Button
                        variant={
                          (hotFilterMode === "combined" &&
                            hotThreshold === 50) ||
                          (hotFilterMode === "comments" &&
                            hotCommentsThreshold === 50) ||
                          (hotFilterMode === "likes" &&
                            hotLikesThreshold === 50)
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => loadHotHoles(hotTimeFilter, 50)}
                        disabled={loadingHot}
                        className="text-xs"
                      >
                        ≥ 50
                      </Button>
                      <Button
                        variant={
                          (hotFilterMode === "combined" &&
                            hotThreshold === 100) ||
                          (hotFilterMode === "comments" &&
                            hotCommentsThreshold === 100) ||
                          (hotFilterMode === "likes" &&
                            hotLikesThreshold === 100)
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => loadHotHoles(hotTimeFilter, 100)}
                        disabled={loadingHot}
                        className="text-xs"
                      >
                        ≥ 100
                      </Button>
                    </div>
                  </div>

                  {/* 自定义阈值输入 */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-muted-foreground">
                      自定义阈值
                    </span>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="输入数字..."
                        value={customThresholdInput}
                        onChange={(e) =>
                          setCustomThresholdInput(e.target.value)
                        }
                        onKeyPress={(e) =>
                          e.key === "Enter" && handleCustomThreshold()
                        }
                        className="flex-1 text-sm"
                        min="0"
                      />
                      <Button
                        onClick={handleCustomThreshold}
                        disabled={loadingHot || !customThresholdInput.trim()}
                        size="sm"
                        className="text-xs"
                      >
                        应用
                      </Button>
                    </div>
                  </div>

                  {/* 排序方式选择器 */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-muted-foreground">
                      排序方式
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={hotSortMode === "hot" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setHotSortMode("hot");
                          loadHotHoles(
                            hotTimeFilter,
                            undefined,
                            hotFilterMode,
                            "hot"
                          );
                        }}
                        disabled={loadingHot}
                        className="text-xs"
                      >
                        按热度排序
                      </Button>
                      <Button
                        variant={hotSortMode === "time" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setHotSortMode("time");
                          loadHotHoles(
                            hotTimeFilter,
                            undefined,
                            hotFilterMode,
                            "time"
                          );
                        }}
                        disabled={loadingHot}
                        className="text-xs"
                      >
                        按时间排序
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {loading || loadingHot ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="grid gap-4">
                {hotHoles.slice(0, hotDisplayCount).map((hole) => (
                  <HoleCard
                    key={hole.pid}
                    hole={hole}
                    showComments={!!holeComments[hole.pid]}
                    comments={holeComments[hole.pid] || []}
                    expandedCount={expandedComments[hole.pid] || 10}
                    onLoadMore={() => loadMoreComments(hole.pid)}
                    onLoadComments={() => loadHoleComments(hole.pid)}
                    onCollapseComments={() => collapseHoleComments(hole.pid)}
                    loadingComments={loadingComments[hole.pid] || false}
                  />
                ))}

                {/* 加载更多按钮 */}
                {hotHoles.length > hotDisplayCount && (
                  <div className="text-center py-4 border-t border-border/50">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setHotDisplayCount((prev) =>
                          Math.min(prev + 20, hotHoles.length)
                        )
                      }
                      className="flex items-center gap-2 hover:bg-primary/5 transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                      加载更多 ({hotDisplayCount}/{hotHoles.length})
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      点击加载接下来的{" "}
                      {Math.min(20, hotHoles.length - hotDisplayCount)} 条树洞
                    </p>
                  </div>
                )}

                {/* 折叠按钮 */}
                {hotDisplayCount > 20 && hotHoles.length > 20 && (
                  <div className="text-center py-2 border-t border-border/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setHotDisplayCount(20);
                        // 滚动到热点树洞顶部
                        document
                          .querySelector('[value="hot"]')
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                      折叠到前20条
                    </Button>
                  </div>
                )}

                {hotHoles.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无热点树洞
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="keyword" className="space-y-4">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">关键词搜索</h2>

              {/* 搜索输入区域 */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="输入关键词 (空格=或，+号=与)..."
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && handleKeywordSearch()
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    提示：使用空格分隔关键词表示"或"查询，使用+号分隔表示"与"查询
                  </p>
                </div>
                <Button
                  onClick={() => handleKeywordSearch()}
                  disabled={keywordLoading || !keywords.trim()}
                  className="w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  {keywordLoading ? "搜索中..." : "搜索"}
                </Button>
              </div>

              {/* 搜索结果统计 */}
              {keywordTotal > 0 && (
                <div className="text-sm text-muted-foreground">
                  找到 {keywordTotal} 个相关树洞
                </div>
              )}

              {/* 搜索结果列表 */}
              {keywordResults.length > 0 ? (
                <div className="grid gap-4">
                  {keywordResults.map((hole) => (
                    <HoleCard
                      key={hole.pid}
                      hole={hole}
                      showComments={false}
                      comments={holeComments[hole.pid] || []}
                      expandedCount={expandedComments[hole.pid] || 10}
                      onLoadMore={() => loadMoreComments(hole.pid)}
                      onLoadComments={() => loadHoleComments(hole.pid)}
                      onCollapseComments={() => collapseHoleComments(hole.pid)}
                    />
                  ))}

                  {/* 加载更多按钮 */}
                  {keywordHasMore && (
                    <div className="text-center py-4">
                      <Button
                        variant="outline"
                        onClick={loadMoreKeywordResults}
                        disabled={keywordLoading}
                        className="w-full sm:w-auto"
                      >
                        {keywordLoading ? "加载中..." : "加载更多"}
                      </Button>
                    </div>
                  )}

                  {/* 已到底部提示 */}
                  {!keywordHasMore && keywordResults.length > 0 && (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      已显示全部结果
                    </div>
                  )}
                </div>
              ) : keywords && !keywordLoading && keywordTotal === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>未找到相关树洞</p>
                  <p className="text-sm mt-2">试试调整关键词或搜索条件</p>
                </div>
              ) : !keywords ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>输入关键词开始搜索</p>
                </div>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="search" className="space-y-4">
            <h2 className="text-lg font-semibold">PID 搜索</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="输入树洞 PID (如: 123 或 #123)..."
                value={searchPid}
                onChange={(e) => setSearchPid(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button
                onClick={handleSearch}
                disabled={loading}
                className="w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                <span className="sm:hidden">搜索</span>
              </Button>
            </div>

            {/* 显示错误信息 */}
            {error && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                {error}
              </div>
            )}

            {searchResult && (
              <div className="space-y-4">
                <HoleCard
                  hole={searchResult.hole}
                  showComments={true}
                  comments={searchResult.comments}
                  expandedCount={expandedComments[searchResult.hole.pid] || 10}
                  onLoadMore={() => loadMoreComments(searchResult.hole.pid)}
                  onCollapseComments={() => {
                    // 对于搜索结果，折叠评论就是清空搜索结果
                    setSearchResult(null);
                    setSearchPid("");
                  }}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function HoleCard({
  hole,
  showComments = false,
  comments = [],
  expandedCount = 10,
  onLoadMore,
  onLoadComments,
  onCollapseComments,
  loadingComments = false,
}: {
  hole: Hole;
  showComments?: boolean;
  comments?: Comment[];
  expandedCount?: number;
  onLoadMore?: () => void;
  onLoadComments?: () => void;
  onCollapseComments?: () => void;
  loadingComments?: boolean;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-3">
          <Badge variant="secondary">#{hole.pid}</Badge>
          <span
            className="text-sm text-muted-foreground cursor-help"
            title={new Date(hole.created_at).toLocaleString("zh-CN")}
          >
            {formatRelativeTime(hole.created_at)}
          </span>
        </div>

        <p className="text-foreground mb-4 whitespace-pre-wrap">{hole.text}</p>

        {hole.type === "image" && hole.image_response && (
          <div className="mb-4 flex justify-center">
            <img
              src={hole.image_response || "/placeholder.svg"}
              alt="Hole image"
              className="hole-image"
              onClick={(e) => {
                // 点击图片放大查看
                const img = e.target as HTMLImageElement;
                const modal = document.createElement("div");
                modal.className = "hole-image-modal";

                // 添加关闭按钮
                const closeBtn = document.createElement("button");
                closeBtn.innerHTML = "✕";
                closeBtn.className = "hole-image-close";
                closeBtn.onclick = (e) => {
                  e.stopPropagation();
                  modal.remove();
                };

                const modalImg = document.createElement("img");
                modalImg.src = img.src;
                modalImg.style.cursor = "zoom-out";

                modal.appendChild(closeBtn);
                modal.appendChild(modalImg);

                // 点击模态框背景关闭
                modal.onclick = (e) => {
                  if (e.target === modal) {
                    modal.remove();
                  }
                };

                // ESC键关闭
                const handleEsc = (e: KeyboardEvent) => {
                  if (e.key === "Escape") {
                    modal.remove();
                    document.removeEventListener("keydown", handleEsc);
                  }
                };
                document.addEventListener("keydown", handleEsc);

                document.body.appendChild(modal);
              }}
            />
          </div>
        )}

        <Separator className="my-3" />

        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <button
              className={`flex items-center gap-1 transition-colors ${
                hole.reply > 0 && !showComments
                  ? "hover:text-foreground cursor-pointer hover:bg-muted rounded px-2 py-1 -mx-2 -my-1"
                  : "cursor-default"
              }`}
              onClick={() => {
                if (!showComments && hole.reply > 0 && onLoadComments) {
                  onLoadComments();
                }
              }}
              disabled={loadingComments}
              title={hole.reply > 0 && !showComments ? "点击查看评论" : ""}
            >
              <MessageCircle className="w-4 h-4" />
              {hole.reply} replies
              {loadingComments && (
                <span className="text-xs ml-1">(加载中...)</span>
              )}
            </button>
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4" />
              {hole.likenum} stars
            </span>
          </div>
          <Badge variant={hole.type === "image" ? "default" : "outline"}>
            {hole.type}
          </Badge>
        </div>

        {showComments && comments && comments.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="space-y-3">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                评论 ({comments.length})
              </h4>
              {comments.slice(0, expandedCount).map((comment) => (
                <CommentCard key={comment.cid} comment={comment} />
              ))}

              {comments.length > expandedCount && onLoadMore && (
                <Button
                  variant="outline"
                  onClick={onLoadMore}
                  className="w-full"
                  size="sm"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  加载更多评论 ({comments.length - expandedCount} 条未显示)
                </Button>
              )}

              {onCollapseComments && (
                <Button
                  variant="ghost"
                  onClick={onCollapseComments}
                  className="w-full"
                  size="sm"
                >
                  <ArrowUp className="w-4 h-4 mr-2" />
                  折叠评论
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CommentCard({ comment }: { comment: Comment }) {
  return (
    <div className="border-l-2 border-border pl-4 py-2">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-foreground">
            #{comment.cid}
          </span>
          <span className="text-sm text-muted-foreground">{comment.name}</span>
          {comment.replied_to_cid && (
            <Badge variant="outline" className="text-xs">
              Reply to #{comment.replied_to_cid}
            </Badge>
          )}
        </div>
        <span
          className="text-xs text-muted-foreground cursor-help"
          title={new Date(comment.created_at).toLocaleString("zh-CN")}
        >
          {formatRelativeTime(comment.created_at)}
        </span>
      </div>
      <p className="text-foreground text-sm whitespace-pre-wrap">
        {comment.text}
      </p>
    </div>
  );
}
