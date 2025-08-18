'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Heart, MessageCircle, MoreHorizontal, Search, Settings, Plus, Flag, Eye, Clock, TrendingUp, Users, FileText } from 'lucide-react';
import Image from 'next/image';
import { Hole, DStats, InitialData } from '@/lib/data';

interface ClientDashboardProps {
  initialData: InitialData;
}

export default function ClientDashboard({ initialData }: ClientDashboardProps) {
  const [holes, setHoles] = useState<Hole[]>(initialData.latestHoles);
  const [hotHoles, setHotHoles] = useState<Hole[]>(initialData.hotHoles);
  const [stats, setStats] = useState<DStats>(initialData.stats);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [timeframe, setTimeframe] = useState('24h');
  const [viewMode, setViewMode] = useState('latest');
  
  // Post creation states
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [newPostTag, setNewPostTag] = useState('');
  const [newPostType, setNewPostType] = useState<'text' | 'image'>('text');
  const [newPostUrl, setNewPostUrl] = useState('');

  const loadMoreHoles = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    
    try {
      const nextPage = page + 1;
      const response = await fetch(`/api/holes/latest?page=${nextPage}&limit=20`);
      const data = await response.json();
      
      if (data.holes) {
        setHoles(prev => [...prev, ...data.holes]);
        setPage(nextPage);
      }
    } catch (error) {
      console.error('Error loading more holes:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, page]);

  const loadHotHoles = useCallback(async (newTimeframe: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/holes/hot?timeframe=${newTimeframe}&limit=20`);
      const data = await response.json();
      
      if (data.holes) {
        setHotHoles(data.holes);
      }
    } catch (error) {
      console.error('Error loading hot holes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchHoles = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      setHoles(initialData.latestHoles);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`/api/holes/search?keyword=${encodeURIComponent(keyword)}&limit=20`);
      const data = await response.json();
      
      if (data.holes) {
        setHoles(data.holes);
      }
    } catch (error) {
      console.error('Error searching holes:', error);
    } finally {
      setLoading(false);
    }
  }, [initialData.latestHoles]);

  const handleLike = useCallback(async (pid: number) => {
    try {
      const response = await fetch(`/api/holes/${pid}/like`, { method: 'POST' });
      if (response.ok) {
        const updateHolesList = (holes: Hole[]) => 
          holes.map(hole => 
            hole.pid === pid ? { ...hole, likenum: hole.likenum + 1 } : hole
          );
        
        setHoles(updateHolesList);
        setHotHoles(updateHolesList);
      }
    } catch (error) {
      console.error('Error liking hole:', error);
    }
  }, []);

  const handleReport = useCallback(async (pid: number) => {
    try {
      const response = await fetch(`/api/holes/${pid}/report`, { method: 'POST' });
      if (response.ok) {
        const updateHolesList = (holes: Hole[]) => 
          holes.map(hole => 
            hole.pid === pid ? { ...hole, reportnum: hole.reportnum + 1 } : hole
          );
        
        setHoles(updateHolesList);
        setHotHoles(updateHolesList);
      }
    } catch (error) {
      console.error('Error reporting hole:', error);
    }
  }, []);

  const handleSubmitPost = useCallback(async () => {
    if (!newPostText.trim()) return;
    
    try {
      const response = await fetch('/api/holes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newPostText,
          type: newPostType,
          tag: newPostTag,
          url: newPostType === 'image' ? newPostUrl : undefined
        })
      });
      
      if (response.ok) {
        setShowPostDialog(false);
        setNewPostText('');
        setNewPostTag('');
        setNewPostUrl('');
        // Refresh holes
        window.location.reload();
      }
    } catch (error) {
      console.error('Error submitting post:', error);
    }
  }, [newPostText, newPostType, newPostTag, newPostUrl]);

  const formatTime = (timestamp: Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
  };

  const displayHoles = viewMode === 'hot' ? hotHoles : holes;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 space-y-4 md:space-y-0">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">树洞广场</h1>
            <p className="text-gray-600">分享你的想法，倾听他人的声音</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  发布树洞
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>发布新树洞</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="post-type">类型</Label>
                    <Select value={newPostType} onValueChange={(value: 'text' | 'image') => setNewPostType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">文字</SelectItem>
                        <SelectItem value="image">图片</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="post-text">内容</Label>
                    <Textarea
                      id="post-text"
                      value={newPostText}
                      onChange={(e) => setNewPostText(e.target.value)}
                      placeholder="写下你想说的话..."
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="post-tag">标签</Label>
                    <Input
                      id="post-tag"
                      value={newPostTag}
                      onChange={(e) => setNewPostTag(e.target.value)}
                      placeholder="添加标签（可选）"
                    />
                  </div>
                  
                  {newPostType === 'image' && (
                    <div>
                      <Label htmlFor="post-url">图片链接</Label>
                      <Input
                        id="post-url"
                        value={newPostUrl}
                        onChange={(e) => setNewPostUrl(e.target.value)}
                        placeholder="输入图片URL"
                      />
                    </div>
                  )}
                  
                  <Button onClick={handleSubmitPost} className="w-full">
                    发布
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" size="icon">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">总树洞数</p>
                  <p className="text-3xl font-bold">{stats.hole_num.toLocaleString()}</p>
                </div>
                <FileText className="w-12 h-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100">七日新增</p>
                  <p className="text-3xl font-bold">{stats.seven_day_num.toLocaleString()}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-green-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">今日新增</p>
                  <p className="text-3xl font-bold">{stats.today_num.toLocaleString()}</p>
                </div>
                <Users className="w-12 h-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="搜索树洞内容..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchHoles(searchTerm)}
                  className="pl-10"
                />
              </div>
              
              <Button onClick={() => searchHoles(searchTerm)} className="bg-blue-600 hover:bg-blue-700">
                搜索
              </Button>
              
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="选择标签" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有标签</SelectItem>
                  <SelectItem value="生活">生活</SelectItem>
                  <SelectItem value="学习">学习</SelectItem>
                  <SelectItem value="情感">情感</SelectItem>
                  <SelectItem value="随想">随想</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs value={viewMode} onValueChange={setViewMode} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-white shadow-lg rounded-lg border-0">
            <TabsTrigger value="latest" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Clock className="w-4 h-4 mr-2" />
              最新
            </TabsTrigger>
            <TabsTrigger value="hot" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <TrendingUp className="w-4 h-4 mr-2" />
              热门
            </TabsTrigger>
          </TabsList>

          <TabsContent value="latest" className="space-y-6">
            <div className="grid gap-6">
              {displayHoles.map((hole) => (
                <Card key={hole.pid} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <Avatar>
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                          {hole.pid.toString().slice(-2)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-500">#{hole.pid}</span>
                            {hole.tag && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                {hole.tag}
                              </Badge>
                            )}
                            <span className="text-xs text-gray-400 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatTime(hole.timestamp)}
                            </span>
                          </div>
                          
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="text-gray-800">
                          {hole.type === 'image' && hole.url ? (
                            <div className="space-y-3">
                              <p>{hole.text}</p>
                              <div className="relative w-full max-w-md">
                                <Image
                                  src={hole.url}
                                  alt="Hole image"
                                  width={400}
                                  height={300}
                                  className="rounded-lg object-cover"
                                />
                              </div>
                            </div>
                          ) : (
                            <p className="leading-relaxed">{hole.text}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="flex items-center space-x-6">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLike(hole.pid)}
                              className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Heart className="w-4 h-4 mr-2" />
                              {hole.likenum}
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                            >
                              <MessageCircle className="w-4 h-4 mr-2" />
                              {hole.reply || 0}
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-500 hover:text-gray-600 hover:bg-gray-50"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              {hole.attention}
                            </Button>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReport(hole.pid)}
                            className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Flag className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {viewMode === 'latest' && (
              <div className="text-center">
                <Button
                  onClick={loadMoreHoles}
                  disabled={loading}
                  variant="outline"
                  className="bg-white hover:bg-gray-50"
                >
                  {loading ? '加载中...' : '加载更多'}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="hot" className="space-y-6">
            <div className="flex items-center space-x-4 mb-6">
              <Select value={timeframe} onValueChange={(value) => {
                setTimeframe(value);
                loadHotHoles(value);
              }}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6h">6小时</SelectItem>
                  <SelectItem value="24h">24小时</SelectItem>
                  <SelectItem value="3d">3天</SelectItem>
                  <SelectItem value="7d">7天</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-6">
              {hotHoles.map((hole, index) => (
                <Card key={hole.pid} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-orange-400 to-red-500 text-white rounded-full text-sm font-bold">
                        {index + 1}
                      </div>
                      
                      <Avatar>
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                          {hole.pid.toString().slice(-2)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-500">#{hole.pid}</span>
                            {hole.tag && (
                              <Badge variant="secondary" className="bg-red-100 text-red-800">
                                {hole.tag}
                              </Badge>
                            )}
                            <span className="text-xs text-gray-400 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatTime(hole.timestamp)}
                            </span>
                          </div>
                          
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="text-gray-800">
                          {hole.type === 'image' && hole.url ? (
                            <div className="space-y-3">
                              <p>{hole.text}</p>
                              <div className="relative w-full max-w-md">
                                <Image
                                  src={hole.url}
                                  alt="Hole image"
                                  width={400}
                                  height={300}
                                  className="rounded-lg object-cover"
                                />
                              </div>
                            </div>
                          ) : (
                            <p className="leading-relaxed">{hole.text}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="flex items-center space-x-6">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLike(hole.pid)}
                              className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Heart className="w-4 h-4 mr-2" />
                              {hole.likenum}
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                            >
                              <MessageCircle className="w-4 h-4 mr-2" />
                              {hole.reply || 0}
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-500 hover:text-gray-600 hover:bg-gray-50"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              {hole.attention}
                            </Button>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReport(hole.pid)}
                            className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Flag className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}