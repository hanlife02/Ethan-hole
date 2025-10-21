-- 数据库性能优化脚本
-- 针对 holes 表的索引优化，解决 Gateway Timeout 问题

-- 1. 检查当前表结构和索引
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'holes';

-- 2. 检查表统计信息
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE tablename = 'holes';

-- 3. 核心索引优化（如果不存在则创建）

-- 3.1 最重要：created_at 字段索引（最新树洞查询）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_holes_created_at
ON holes (created_at DESC);

-- 3.2 热度查询相关的复合索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_holes_hot_combined
ON holes (created_at, reply, likenum)
WHERE created_at > NOW() - INTERVAL '90 days';

-- 3.3 文本搜索索引（关键词搜索）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_holes_text_search
ON holes USING gin (to_tsvector('english', text));

-- 3.4 PID 主键索引（通常自动创建，但确保存在）
-- 这个通常不需要手动创建，PostgreSQL 会自动为主键创建

-- 4. 针对特定查询的索引

-- 4.1 最新树洞查询优化（30天内数据）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_holes_recent_latest
ON holes (created_at DESC)
WHERE created_at > NOW() - INTERVAL '30 days';

-- 4.2 热点树洞查询优化（按评论+收藏数）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_holes_hot_score
ON holes ((reply + likenum) DESC, created_at DESC)
WHERE created_at > NOW() - INTERVAL '90 days'
AND (reply + likenum) >= 10;

-- 4.3 仅评论数热点查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_holes_hot_replies
ON holes (reply DESC, created_at DESC)
WHERE created_at > NOW() - INTERVAL '90 days'
AND reply >= 10;

-- 4.4 仅收藏数热点查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_holes_hot_likes
ON holes (likenum DESC, created_at DESC)
WHERE created_at > NOW() - INTERVAL '90 days'
AND likenum >= 10;

-- 5. 表维护和统计信息更新
ANALYZE holes;

-- 6. 检查查询计划（这些查询应该在应用中测试）
/*
EXPLAIN ANALYZE
SELECT pid, text, type, created_at, reply, likenum, image_response
FROM holes
WHERE created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 20;

EXPLAIN ANALYZE
SELECT pid, text, type, created_at, reply, likenum, image_response
FROM holes
WHERE (reply + likenum) >= 20
AND created_at > NOW() - INTERVAL '24 hours'
AND created_at > NOW() - INTERVAL '90 days'
ORDER BY (reply + likenum) DESC, created_at DESC
LIMIT 200;
*/

-- 7. 清理过期数据（可选，谨慎使用）
-- 如果数据量确实很大，可以考虑归档或删除很老的数据
/*
-- 示例：删除1年前的数据（请根据实际需求调整）
-- DELETE FROM holes WHERE created_at < NOW() - INTERVAL '1 year';
*/

-- 8. 检查索引创建结果
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_indexes
JOIN pg_stat_user_indexes USING (schemaname, tablename, indexname)
WHERE tablename = 'holes'
ORDER BY pg_relation_size(indexrelid) DESC;