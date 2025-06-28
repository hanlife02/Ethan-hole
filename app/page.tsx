"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MessageCircle, Star, Search, TrendingUp, Clock, Eye, Settings, Sun, Moon } from "lucide-react"

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

export default function EthanHole() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [keyInput, setKeyInput] = useState("")
  const [latestHoles, setLatestHoles] = useState<Hole[]>([])
  const [hotHoles, setHotHoles] = useState<Hole[]>([])
  const [searchPid, setSearchPid] = useState("")
  const [searchResult, setSearchResult] = useState<{ hole: Hole; comments: Comment[] } | null>(null)
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
        loadInitialData()
      } else {
        setError("Invalid key")
      }
    } catch (err) {
      setError("Authentication failed")
    }
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

  const handleSearch = async () => {
    if (!searchPid) return

    setLoading(true)
    try {
      const response = await fetch(`/api/holes/${searchPid}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResult(data)
        setExpandedComments({ [Number.parseInt(searchPid)]: 10 })
      } else {
        setError("Hole not found")
        setSearchResult(null)
      }
    } catch (err) {
      setError("Search failed")
    }
    setLoading(false)
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
    } else {
      html.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    }
  }

  // 初始化主题
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  // 认证后自动加载数据
  useEffect(() => {
    if (isAuthenticated) {
      loadInitialData()
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Ethan Hole</h1>
              <p className="text-gray-600 dark:text-gray-300">Enter access key to continue</p>
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
            <Settings className="h-4 w-4" />
            <span className="sr-only">切换主题</span>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 下拉刷新指示器 */}
      {(pullCurrentY - pullStartY > 0 && (typeof window !== 'undefined' && window.scrollY === 0)) && (
        <div 
          className="fixed top-0 left-0 right-0 z-50 bg-blue-500 text-white text-center py-2 transition-transform duration-200"
          style={{
            transform: `translateY(${Math.min(pullCurrentY - pullStartY - 50, 0)}px)`
          }}
        >
          {pullCurrentY - pullStartY > 100 ? '释放以刷新' : '下拉刷新'}
        </div>
      )}
      
      {/* 刷新加载指示器 */}
      {isRefreshing && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-500 text-white text-center py-2">
          正在刷新...
        </div>
      )}

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Ethan Hole</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
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
                onClick={toggleTheme}
                className="relative"
              >
                <Settings className="h-4 w-4" />
                <span className="sr-only">切换主题</span>
              </Button>
              <Button variant="outline" onClick={() => setIsAuthenticated(false)} className="text-sm">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="latest" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="latest" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Latest Holes
            </TabsTrigger>
            <TabsTrigger value="hot" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Hot Holes
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search
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
              <div className="flex gap-2">
                <Button
                  variant={hotTimeFilter === '1h' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => loadHotHoles('1h')}
                  disabled={loadingHot}
                >
                  近1小时
                </Button>
                <Button
                  variant={hotTimeFilter === '6h' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => loadHotHoles('6h')}
                  disabled={loadingHot}
                >
                  近6小时
                </Button>
                <Button
                  variant={hotTimeFilter === '24h' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => loadHotHoles('24h')}
                  disabled={loadingHot}
                >
                  近24小时
                </Button>
                <Button
                  variant={hotTimeFilter === '7d' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => loadHotHoles('7d')}
                  disabled={loadingHot}
                >
                  近7天
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

          <TabsContent value="search" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter hole PID to search..."
                value={searchPid}
                onChange={(e) => setSearchPid(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="w-4 h-4" />
              </Button>
            </div>

            {searchResult && (
              <div className="space-y-4">
                <HoleCard 
                  hole={searchResult.hole} 
                  showComments={true}
                  comments={searchResult.comments}
                  expandedCount={expandedComments[searchResult.hole.pid] || 10}
                  onLoadMore={() => loadMoreComments(searchResult.hole.pid)}
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
  loadingComments = false 
}: { 
  hole: Hole; 
  showComments?: boolean;
  comments?: Comment[];
  expandedCount?: number;
  onLoadMore?: () => void;
  onLoadComments?: () => void;
  loadingComments?: boolean;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-3">
          <Badge variant="secondary">#{hole.pid}</Badge>
          <span className="text-sm text-gray-500 dark:text-gray-400">{new Date(hole.created_at).toLocaleString("zh-CN")}</span>
        </div>

        <p className="text-gray-800 dark:text-gray-200 mb-4 whitespace-pre-wrap">{hole.text}</p>

        {hole.type === "image" && hole.image_response && (
          <div className="mb-4">
            <img
              src={hole.image_response || "/placeholder.svg"}
              alt="Hole image"
              className="max-w-full h-auto rounded-lg border dark:border-gray-600"
            />
          </div>
        )}

        <Separator className="my-3" />

        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              {hole.reply} replies
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4" />
              {hole.likenum} stars
            </span>
            {!showComments && hole.reply > 0 && onLoadComments && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLoadComments}
                disabled={loadingComments}
                className="text-xs"
              >
                {loadingComments ? "加载中..." : "查看评论"}
              </Button>
            )}
          </div>
          <Badge variant={hole.type === "image" ? "default" : "outline"}>{hole.type}</Badge>
        </div>

        {showComments && comments && comments.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
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
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function CommentCard({ comment }: { comment: Comment }) {
  return (
    <div className="border-l-2 border-gray-200 dark:border-gray-600 pl-4 py-2">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">#{comment.cid}</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">{comment.name}</span>
          {comment.replied_to_cid && (
            <Badge variant="outline" className="text-xs">
              Reply to #{comment.replied_to_cid}
            </Badge>
          )}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(comment.created_at).toLocaleString("zh-CN")}</span>
      </div>
      <p className="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap">{comment.text}</p>
    </div>
  )
}
