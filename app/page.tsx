"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MessageCircle, Star, Search, TrendingUp, Clock, Eye, Settings, Sun, Moon, RefreshCw, ArrowUp } from "lucide-react"

interface Hole {
  pid: number
  text: string
  type: "text" | "image"
  created_at: string
  reply: number
  likenum: number
  image_response?: string
}

interface Comment {
  pid: number
  cid: number
  text: string
  created_at: string
  name: string
  replied_to_cid?: number
}

interface Stats {
  totalHoles: number
  totalComments: number
}

// 相对时间格式化函数
function formatRelativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return "刚刚"
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}分钟前`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}小时前`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) {
    return `${diffInDays}天前`
  }

  // 更精确的月份计算
  const nowYear = now.getFullYear()
  const nowMonth = now.getMonth()
  const dateYear = date.getFullYear()
  const dateMonth = date.getMonth()
  
  const yearDiff = nowYear - dateYear
  const monthDiff = nowMonth - dateMonth + (yearDiff * 12)
  
  if (monthDiff < 12) {
    return `${monthDiff}个月前`
  }

  return `${yearDiff}年前`
}

export default function EthanHole() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authChecking, setAuthChecking] = useState(true) // 添加认证检查状态
  const [keyInput, setKeyInput] = useState("")
  const [latestHoles, setLatestHoles] = useState<Hole[]>([])
  const [hotHoles, setHotHoles] = useState<Hole[]>([])
  const [searchPid, setSearchPid] = useState("")
  const [searchResult, setSearchResult] = useState<{ hole: Hole; comments: Comment[] } | null>(null)
  // 关键词搜索相关状态
  const [keywords, setKeywords] = useState("")
  const [keywordResults, setKeywordResults] = useState<Hole[]>([])
  const [keywordLoading, setKeywordLoading] = useState(false)
  const [keywordPage, setKeywordPage] = useState(1)
  const [keywordHasMore, setKeywordHasMore] = useState(true)
  const [keywordTotal, setKeywordTotal] = useState(0)
  const [stats, setStats] = useState<Stats>({ totalHoles: 0, totalComments: 0 })
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState("")
  const [expandedComments, setExpandedComments] = useState<{ [key: number]: number }>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullStartY, setPullStartY] = useState(0)
  const [pullCurrentY, setPullCurrentY] = useState(0)
  const [showThemeToggle, setShowThemeToggle] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [hotTimeFilter, setHotTimeFilter] = useState('24h')
  const [loadingHot, setLoadingHot] = useState(false)
  const [holeComments, setHoleComments] = useState<{ [key: number]: Comment[] }>({})
  const [loadingComments, setLoadingComments] = useState<{ [key: number]: boolean }>({})

  const handleAuth = async () => {
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyInput }),
      })

      if (response.ok) {
        setIsAuthenticated(true)
        setError("")
        // 不再保存到localStorage，只在当前会话中保持认证状态
        loadInitialData()
      } else {
        setError("Invalid key")
      }
    } catch (err) {
      setError("Authentication failed")
    }
  }

  // 登出函数
  const handleLogout = () => {
    setIsAuthenticated(false)
    // 不再需要清除localStorage，因为我们不再使用它存储认证状态
  }

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const [latestRes, hotRes, statsRes] = await Promise.all([
        fetch("/api/holes/latest?page=1&limit=20"),
        fetch(`/api/holes/hot?time=${hotTimeFilter}`),
        fetch("/api/stats"),
      ])

      if (latestRes.ok) {
        const latestData = await latestRes.json()
        setLatestHoles(latestData.holes || latestData)
        setHasMore(latestData.hasMore !== undefined ? latestData.hasMore : true)
        setCurrentPage(1)
      }
      if (hotRes.ok) setHotHoles(await hotRes.json())
      if (statsRes.ok) setStats(await statsRes.json())
    } catch (err) {
      setError("Failed to load data")
    }
    setLoading(false)
  }

  const loadMoreHoles = async () => {
    if (loadingMore || !hasMore) return
    
    setLoadingMore(true)
    try {
      const nextPage = currentPage + 1
      const response = await fetch(`/api/holes/latest?page=${nextPage}&limit=20`)
      
      if (response.ok) {
        const data = await response.json()
        const newHoles = data.holes || data
        
        if (newHoles.length > 0) {
          setLatestHoles(prev => [...prev, ...newHoles])
          setCurrentPage(nextPage)
          setHasMore(data.hasMore !== undefined ? data.hasMore : newHoles.length === 20)
        } else {
          setHasMore(false)
        }
      }
    } catch (err) {
      setError("Failed to load more holes")
    }
    setLoadingMore(false)
  }

  // 加载热点树洞
  const loadHotHoles = async (timeFilter: string) => {
    setLoadingHot(true)
    try {
      const response = await fetch(`/api/holes/hot?time=${timeFilter}`)
      if (response.ok) {
        const hotData = await response.json()
        setHotHoles(hotData)
        setHotTimeFilter(timeFilter)
      }
    } catch (err) {
      setError("Failed to load hot holes")
    }
    setLoadingHot(false)
  }

  // 加载指定洞的评论
  const loadHoleComments = async (pid: number) => {
    if (loadingComments[pid] || holeComments[pid]) return
    
    setLoadingComments(prev => ({ ...prev, [pid]: true }))
    try {
      const response = await fetch(`/api/holes/${pid}`)
      if (response.ok) {
        const data = await response.json()
        setHoleComments(prev => ({ ...prev, [pid]: data.comments }))
        setExpandedComments(prev => ({ ...prev, [pid]: 10 }))
      }
    } catch (err) {
      setError("Failed to load comments")
    }
    setLoadingComments(prev => ({ ...prev, [pid]: false }))
  }

  // 折叠指定洞的评论
  const collapseHoleComments = (pid: number) => {
    setHoleComments(prev => {
      const newComments = { ...prev }
      delete newComments[pid]
      return newComments
    })
    setExpandedComments(prev => {
      const newExpanded = { ...prev }
      delete newExpanded[pid]
      return newExpanded
    })
  }

  const handleSearch = async () => {
    if (!searchPid) return

    setLoading(true)
    try {
      // 处理PID输入，去除前面的#号
      const cleanPid = searchPid.startsWith('#') ? searchPid.slice(1) : searchPid
      
      // 验证PID是否为有效数字
      if (!/^\d+$/.test(cleanPid)) {
        setError("请输入有效的PID")
        setSearchResult(null)
        setLoading(false)
        return
      }

      const response = await fetch(`/api/holes/${cleanPid}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResult(data)
        setExpandedComments({ [Number.parseInt(cleanPid)]: 10 })
        setError("") // 清除之前的错误信息
      } else {
        setError("Hole not found")
        setSearchResult(null)
      }
    } catch (err) {
      setError("Search failed")
    }
    setLoading(false)
  }

  // 关键词搜索功能
  const handleKeywordSearch = async (page = 1, reset = true) => {
    if (!keywords.trim()) return

    setKeywordLoading(true)
    if (reset) {
      setKeywordResults([])
      setKeywordPage(1)
      setKeywordTotal(0)
    }

    try {
      const response = await fetch(`/api/holes/search?q=${encodeURIComponent(keywords)}&page=${page}&limit=20`)
      if (response.ok) {
        const data = await response.json()
        if (reset) {
          setKeywordResults(data.holes)
        } else {
          setKeywordResults(prev => [...prev, ...data.holes])
        }
        setKeywordPage(data.page)
        setKeywordHasMore(data.hasMore)
        setKeywordTotal(data.total)
      } else {
        setError("Search failed")
      }
    } catch (err) {
      setError("搜索失败")
    }
    setKeywordLoading(false)
  }

  // 加载更多关键词搜索结果
  const loadMoreKeywordResults = () => {
    if (!keywordLoading && keywordHasMore) {
      handleKeywordSearch(keywordPage + 1, false)
    }
  }

  const loadMoreComments = (pid: number) => {
    setExpandedComments((prev) => ({
      ...prev,
      [pid]: (prev[pid] || 10) + 10,
    }))
  }

  // 刷新功能
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return
    
    setIsRefreshing(true)
    setCurrentPage(1)
    setHasMore(true)
    
    try {
      const [latestRes, hotRes, statsRes] = await Promise.all([
        fetch("/api/holes/latest?page=1&limit=20"),
        fetch(`/api/holes/hot?time=${hotTimeFilter}`),
        fetch("/api/stats"),
      ])

      if (latestRes.ok) {
        const latestData = await latestRes.json()
        setLatestHoles(latestData.holes || latestData)
        setHasMore(latestData.hasMore !== undefined ? latestData.hasMore : true)
      }
      if (hotRes.ok) setHotHoles(await hotRes.json())
      if (statsRes.ok) setStats(await statsRes.json())
    } catch (err) {
      setError("Failed to refresh data")
    } finally {
      setIsRefreshing(false)
    }
  }, [isRefreshing, hotTimeFilter])

  // 触摸事件处理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0
    if (scrollY === 0) {
      setPullStartY(e.touches[0].clientY)
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0
    if (pullStartY > 0 && scrollY === 0) {
      const currentY = e.touches[0].clientY
      setPullCurrentY(currentY)
      
      if (currentY - pullStartY > 100 && !isRefreshing) {
        e.preventDefault()
      }
    }
  }, [pullStartY, isRefreshing])

  const handleTouchEnd = useCallback(() => {
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0
    if (pullCurrentY - pullStartY > 100 && scrollY === 0 && !isRefreshing) {
      handleRefresh()
    }
    setPullStartY(0)
    setPullCurrentY(0)
  }, [pullCurrentY, pullStartY, isRefreshing, handleRefresh])

  // 主题切换功能
  const toggleTheme = () => {
    const html = document.documentElement
    if (html.classList.contains('dark')) {
      html.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setIsDarkMode(false)
    } else {
      html.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setIsDarkMode(true)
    }
  }

  // 初始化主题
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark')
      setIsDarkMode(true)
    } else {
      setIsDarkMode(false)
    }
  }, [])

  // 检查认证状态 - 页面刷新时不保持认证状态
  useEffect(() => {
    // 页面刷新时，默认为未认证状态
    setIsAuthenticated(false)
    setAuthChecking(false) // 认证检查完成
  }, [])

  // 认证后自动加载数据
  useEffect(() => {
    if (isAuthenticated) {
      loadInitialData()
    }
  }, [isAuthenticated])

  // 在认证检查期间显示加载状态
  if (authChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">正在检查认证状态...</p>
        </div>
        <div className="absolute top-4 right-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={toggleTheme}
          >
            {isDarkMode ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            <span className="sr-only">切换主题</span>
          </Button>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground mb-2">Ethan Hole</h1>
              <p className="text-muted-foreground">Enter access key to continue</p>
            </div>
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="Access Key"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAuth()}
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button onClick={handleAuth} className="w-full">
                Access
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="absolute top-4 right-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={toggleTheme}
          >
            {isDarkMode ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            <span className="sr-only">切换主题</span>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen bg-background transition-colors"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 下拉刷新指示器 */}
      {(pullCurrentY - pullStartY > 0 && (typeof window !== 'undefined' && window.scrollY === 0)) && (
        <div 
          className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground text-center py-3 transition-transform duration-200 shadow-lg"
          style={{
            transform: `translateY(${Math.min(pullCurrentY - pullStartY - 50, 0)}px)`
          }}
        >
          <div className="flex items-center justify-center gap-2">
            <ArrowUp className={`w-4 h-4 transition-transform duration-200 ${pullCurrentY - pullStartY > 100 ? 'rotate-180' : ''}`} />
            <span className="font-medium">
              {pullCurrentY - pullStartY > 100 ? '释放以刷新' : '下拉刷新'}
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
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="sr-only">刷新数据</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={toggleTheme}
                  className="relative h-8 w-8"
                >
                  {isDarkMode ? (
                    <Moon className="h-3.5 w-3.5" />
                  ) : (
                    <Sun className="h-3.5 w-3.5" />
                  )}
                  <span className="sr-only">切换主题</span>
                </Button>
                <Button variant="outline" onClick={handleLogout} className="text-xs px-2 py-1 h-8">
                  退出
                </Button>
              </div>
            </div>
            {/* Second row: Statistics */}
            <div className="flex items-center justify-center space-x-3 pb-3">
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <MessageCircle className="w-3 h-3" />
                {stats.totalHoles} holes
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
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
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="sr-only">刷新数据</span>
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={toggleTheme}
                className="relative"
              >
                {isDarkMode ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
                <span className="sr-only">切换主题</span>
              </Button>
              <Button variant="outline" onClick={handleLogout} className="text-sm">
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
            <TabsTrigger value="latest" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Latest</span>
              <span className="sm:hidden">Latest</span>
            </TabsTrigger>
            <TabsTrigger value="hot" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Hot</span>
              <span className="sm:hidden">Hot</span>
            </TabsTrigger>
            <TabsTrigger value="keyword" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Search className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Keywords</span>
              <span className="sm:hidden">Words</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-semibold">Hot Holes (Replies + Stars ≥ 20)</h2>
              <div className="grid grid-cols-2 sm:flex gap-2">
                <Button
                  variant={hotTimeFilter === '1h' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => loadHotHoles('1h')}
                  disabled={loadingHot}
                  className="text-xs sm:text-sm"
                >
                  1小时
                </Button>
                <Button
                  variant={hotTimeFilter === '6h' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => loadHotHoles('6h')}
                  disabled={loadingHot}
                  className="text-xs sm:text-sm"
                >
                  6小时
                </Button>
                <Button
                  variant={hotTimeFilter === '24h' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => loadHotHoles('24h')}
                  disabled={loadingHot}
                  className="text-xs sm:text-sm"
                >
                  24小时
                </Button>
                <Button
                  variant={hotTimeFilter === '7d' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => loadHotHoles('7d')}
                  disabled={loadingHot}
                  className="text-xs sm:text-sm"
                >
                  7天
                </Button>
              </div>
            </div>
            {loading || loadingHot ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="grid gap-4">
                {hotHoles.map((hole) => (
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
                    onKeyPress={(e) => e.key === "Enter" && handleKeywordSearch()}
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
                    setSearchResult(null)
                    setSearchPid("")
                  }}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

function HoleCard({ 
  hole, 
  showComments = false, 
  comments = [], 
  expandedCount = 10, 
  onLoadMore,
  onLoadComments,
  onCollapseComments,
  loadingComments = false 
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
                const modal = document.createElement('div');
                modal.className = 'hole-image-modal';
                
                // 添加关闭按钮
                const closeBtn = document.createElement('button');
                closeBtn.innerHTML = '✕';
                closeBtn.className = 'hole-image-close';
                closeBtn.onclick = (e) => {
                  e.stopPropagation();
                  modal.remove();
                };
                
                const modalImg = document.createElement('img');
                modalImg.src = img.src;
                modalImg.style.cursor = 'zoom-out';
                
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
                  if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', handleEsc);
                  }
                };
                document.addEventListener('keydown', handleEsc);
                
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
                  ? 'hover:text-foreground cursor-pointer hover:bg-muted rounded px-2 py-1 -mx-2 -my-1' 
                  : 'cursor-default'
              }`}
              onClick={() => {
                if (!showComments && hole.reply > 0 && onLoadComments) {
                  onLoadComments()
                }
              }}
              disabled={loadingComments}
              title={hole.reply > 0 && !showComments ? "点击查看评论" : ""}
            >
              <MessageCircle className="w-4 h-4" />
              {hole.reply} replies
              {loadingComments && <span className="text-xs ml-1">(加载中...)</span>}
            </button>
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4" />
              {hole.likenum} stars
            </span>
          </div>
          <Badge variant={hole.type === "image" ? "default" : "outline"}>{hole.type}</Badge>
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
  )
}

function CommentCard({ comment }: { comment: Comment }) {
  return (
    <div className="border-l-2 border-border pl-4 py-2">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-foreground">#{comment.cid}</span>
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
      <p className="text-foreground text-sm whitespace-pre-wrap">{comment.text}</p>
    </div>
  )
}
