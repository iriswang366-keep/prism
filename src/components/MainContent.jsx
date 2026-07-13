import React, { useState, useMemo, useEffect } from 'react'
import KnowledgeCard from './KnowledgeCard'
import { Search, Filter, X, Grid, List, FileX, Heart } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const MainContent = ({ knowledgeItems, selectedCard, onCardClick, selectedTag, onTagClick, onToggleFavorite, globalSearchTerm, favoritesOnly = false }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [sortBy, setSortBy] = useState('created') // 'created' | 'updated' | 'title'

  // 响应式列数：<768 → 1 列，<1024 → 2 列，否则 3 列
  const [columnCount, setColumnCount] = useState(3)
  useEffect(() => {
    const computeColumns = () => {
      const w = window.innerWidth
      if (w < 768) setColumnCount(1)
      else if (w < 1024) setColumnCount(2)
      else setColumnCount(3)
    }
    computeColumns()
    window.addEventListener('resize', computeColumns)
    return () => window.removeEventListener('resize', computeColumns)
  }, [])

  // 筛选和排序逻辑
  const filteredAndSortedItems = useMemo(() => {
    let filtered = knowledgeItems

    // 收藏页：只保留已收藏的笔记
    if (favoritesOnly) {
      filtered = filtered.filter(item => item.favorite)
    }

    // 标签筛选
    if (selectedTag) {
      filtered = filtered.filter(item => item.tags.includes(selectedTag))
    }

    // 搜索筛选（本地搜索 + 全局搜索）
    const activeSearchTerm = globalSearchTerm || searchTerm
    if (activeSearchTerm) {
      const searchLower = activeSearchTerm.toLowerCase()
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchLower) ||
        item.summary.toLowerCase().includes(searchLower) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }

    // 排序（复制一份再排，避免原地修改缓存数组）
    return [...filtered].sort((a, b) => {
      if (sortBy === 'created') {
        return new Date(b.created_at || b.date) - new Date(a.created_at || a.date)
      } else if (sortBy === 'updated') {
        return new Date(b.updated_at || b.date) - new Date(a.updated_at || a.date)
      } else {
        return a.title.localeCompare(b.title)
      }
    })
  }, [knowledgeItems, favoritesOnly, selectedTag, searchTerm, globalSearchTerm, sortBy])

  // 纯文本长度估算，用于给每张卡片估个高度
  const estimatePlainLen = (html) => {
    if (!html) return 0
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().length
  }

    // 按顺序轮流分列：第 1 张→左、第 2 张→中、第 3 张→右、第 4 张→回到左…
  // 顺序完全可预测，不再依赖高度猜测；每列卡片各自按内容自然长高，天然错落。
  const columns = useMemo(() => {
    const cols = Array.from({ length: columnCount }, () => [])
    filteredAndSortedItems.forEach((item, index) => {
      cols[index % columnCount].push(item)
    })
    return cols
  }, [filteredAndSortedItems, columnCount])
  const clearAllFilters = () => {
    setSearchTerm('')
    onTagClick(null)
  }

  const hasActiveFilters = selectedTag || searchTerm || globalSearchTerm
  const activeSearchTerm = globalSearchTerm || searchTerm

  const renderEmptyState = () => (
    <motion.div
      key="empty"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="text-center py-16"
    >
      <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
        {favoritesOnly ? (
          <Heart className="w-12 h-12 text-gray-400" />
        ) : (
          <FileX className="w-12 h-12 text-gray-400" />
        )}
      </div>
      <h3 className="text-xl font-bold text-gray-700 mb-2">
        {favoritesOnly ? '还没有收藏的笔记' : '未找到相关笔记'}
      </h3>
      <p className="text-gray-500 mb-6">
        {favoritesOnly
          ? '点击卡片右下角的爱心，把喜欢的笔记收藏起来吧'
          : activeSearchTerm
            ? `未找到与"${activeSearchTerm}"相关的笔记`
            : '开始记录你的第一个灵感吧！'
        }
      </p>
      {hasActiveFilters && (
        <button
          onClick={clearAllFilters}
          className="px-6 py-3 bg-amber-100 text-amber-900 rounded-lg hover:bg-amber-200 transition-colors font-medium"
        >
          清除所有筛选条件
        </button>
      )}
    </motion.div>
  )

  return (
    <div className="flex-1 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题和工具栏 */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-amber-900 mb-1.5">
                {favoritesOnly ? '我的收藏' : '灵感主页'}
              </h2>
              <p className="text-gray-600 text-sm">
                {favoritesOnly ? '你收藏的笔记都在这里' : '收集、整理、连接你的知识碎片'}
              </p>
            </div>

            {/* 工具栏 */}
            <div className="flex items-center space-x-3">
              {/* 搜索框 - 仅在无全局搜索时显示 */}
              {!globalSearchTerm && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="搜索笔记..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm w-64"
                  />
                </div>
              )}

              {/* 视图切换 */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'} transition-colors`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'} transition-colors`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* 排序选择 */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
              >
                <option value="created">按创建时间排序</option>
                <option value="updated">按修改时间排序</option>
                <option value="title">按标题排序</option>
              </select>
            </div>
          </div>
        </div>

        {/* 筛选状态显示 */}
        {hasActiveFilters && (
          <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-amber-700" />
                  <span className="text-sm text-amber-700 font-medium">当前筛选:</span>
                </div>

                <div className="flex items-center space-x-2">
                  {selectedTag && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-900 text-sm font-medium rounded-full">
                      #{selectedTag}
                    </span>
                  )}
                  {activeSearchTerm && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-900 text-sm font-medium rounded-full">
                      搜索: “{activeSearchTerm}”
                    </span>
                  )}
                </div>

                <span className="text-sm text-amber-700">
                  找到 {filteredAndSortedItems.length} 条结果
                </span>
              </div>

              <button
                onClick={clearAllFilters}
                className="flex items-center space-x-1 text-sm text-amber-700 hover:text-amber-900 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>清除筛选</span>
              </button>
            </div>
          </div>
        )}

        {/* 知识卡片展示 */}
        <AnimatePresence mode="wait">
          {filteredAndSortedItems.length > 0 ? (
            viewMode === 'grid' ? (
              // 瀑布流：按估算高度贪心分列，每列自上而下堆叠，天然错落
              <motion.div
                key="cards-grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex gap-5 items-start"
              >
                {columns.map((col, colIndex) => (
                  <div key={colIndex} className="flex-1 min-w-0 space-y-5">
                    {col.map((item, index) => (
                      <div key={`${item.id}-${index}`}>
                        <KnowledgeCard
                          id={item.id}
                          title={item.title}
                          summary={item.summary}
                          tags={item.tags}
                          date={item.created_at || item.date}
                          favorite={item.favorite}
                          isNew={new Date(item.created_at || item.date) > new Date(Date.now() - 24 * 60 * 60 * 1000)}
                          onClick={onCardClick}
                          onTagClick={onTagClick}
                          onToggleFavorite={onToggleFavorite}
                          highlightTerm={activeSearchTerm}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </motion.div>
            ) : (
              // 列表视图：单列，保留逐项淡入动画
              <motion.div
                key="cards-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {filteredAndSortedItems.map((item, index) => (
                  <motion.div
                    key={`${item.id}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.05, 0.4) }}
                  >
                    <KnowledgeCard
                      id={item.id}
                      title={item.title}
                      summary={item.summary}
                      tags={item.tags}
                      date={item.created_at || item.date}
                      favorite={item.favorite}
                      isNew={new Date(item.created_at || item.date) > new Date(Date.now() - 24 * 60 * 60 * 1000)}
                      onClick={onCardClick}
                      onTagClick={onTagClick}
                      onToggleFavorite={onToggleFavorite}
                      highlightTerm={activeSearchTerm}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )
          ) : (
            renderEmptyState()
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default MainContent