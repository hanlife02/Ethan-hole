"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MessageCircle, Star, Search, TrendingUp, Clock, Eye } from "lucide-react"

interface Hole {
  pid: number
  text: string
  type: "text" | "image"
  created_at: string
  reply: number
  likeum: number
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
  const [error, setError] = useState("")
  const [expandedComments, setExpandedComments] = useState<{ [key: number]: number }>({})

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
        fetch("/api/holes/latest"),
        fetch("/api/holes/hot"),
        fetch("/api/stats"),
      ])

      if (latestRes.ok) setLatestHoles(await latestRes.json())
      if (hotRes.ok) setHotHoles(await hotRes.json())
      if (statsRes.ok) setStats(await statsRes.json())
    } catch (err) {
      setError("Failed to load data")
    }
    setLoading(false)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN")
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Ethan Hole</h1>
              <p className="text-gray-600">Enter access key to continue</p>
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
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">Ethan Hole</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
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
            <Button variant="outline" onClick={() => setIsAuthenticated(false)} className="text-sm">
              Logout
            </Button>
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
            <h2 className="text-lg font-semibold">Latest 20 Holes</h2>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="grid gap-4">
                {latestHoles.map((hole) => (
                  <HoleCard key={hole.pid} hole={hole} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="hot" className="space-y-4">
            <h2 className="text-lg font-semibold">Hot Holes (Replies + Stars ≥ 20)</h2>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="grid gap-4">
                {hotHoles.map((hole) => (
                  <HoleCard key={hole.pid} hole={hole} />
                ))}
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
                <HoleCard hole={searchResult.hole} />
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Comments ({searchResult.comments.length})
                    </h3>
                    <div className="space-y-3">
                      {searchResult.comments.slice(0, expandedComments[searchResult.hole.pid] || 10).map((comment) => (
                        <CommentCard key={comment.cid} comment={comment} />
                      ))}

                      {searchResult.comments.length > (expandedComments[searchResult.hole.pid] || 10) && (
                        <Button
                          variant="outline"
                          onClick={() => loadMoreComments(searchResult.hole.pid)}
                          className="w-full"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Load More Comments
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

function HoleCard({ hole }: { hole: Hole }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-3">
          <Badge variant="secondary">#{hole.pid}</Badge>
          <span className="text-sm text-gray-500">{new Date(hole.created_at).toLocaleString("zh-CN")}</span>
        </div>

        <p className="text-gray-800 mb-4 whitespace-pre-wrap">{hole.text}</p>

        {hole.type === "image" && hole.image_response && (
          <div className="mb-4">
            <img
              src={hole.image_response || "/placeholder.svg"}
              alt="Hole image"
              className="max-w-full h-auto rounded-lg border"
            />
          </div>
        )}

        <Separator className="my-3" />

        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              {hole.reply} replies
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4" />
              {hole.likeum} stars
            </span>
          </div>
          <Badge variant={hole.type === "image" ? "default" : "outline"}>{hole.type}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}

function CommentCard({ comment }: { comment: Comment }) {
  return (
    <div className="border-l-2 border-gray-200 pl-4 py-2">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">#{comment.cid}</span>
          <span className="text-sm text-gray-600">{comment.name}</span>
          {comment.replied_to_cid && (
            <Badge variant="outline" className="text-xs">
              Reply to #{comment.replied_to_cid}
            </Badge>
          )}
        </div>
        <span className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleString("zh-CN")}</span>
      </div>
      <p className="text-gray-800 text-sm whitespace-pre-wrap">{comment.text}</p>
    </div>
  )
}
