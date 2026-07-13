import React, { useMemo, useState } from 'react'
import { Hash, Search, X, Tag as TagIcon } from 'lucide-react'
import { motion } from 'framer-motion'

// 我的标签：展示当前用户所有标签（不再只截前 5 个），
// 支持搜索、按词频/字母排序，点击任意标签即回到灵感主页并按该标签筛选。
const TagsView = ({ knowledgeItems = [], selectedTag, onTagClick }) => {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('count') // 'count' | 'name'

  // 统计所有标签的出现次数
  const tagStats = useMemo(() => {
    const map = {}
    knowledgeItems.forEach(item => {
      if (Array.isArray(item.tags)) {
        item.tags.forEach(tag => {
          if (tag) map[tag] = (map[tag] || 0) + 1
        })
      }
    })

    let list = Object.entries(map).map(([name, count]) => ({ name, count }))

    // 搜索过滤
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(t => t.name.toLowerCase().includes(q))
    }

    // 排序
    list.sort((a, b) => {
      if (sortBy === 'count') {
        if (b.count !== a.count) return b.count - a.count
        return a.name.localeCompare(b.name)
      }
      return a.name.localeCompare(b.name)
    })

    return list
  }, [knowledgeItems, search, sortBy])

  const totalTags = useMemo(() => {
    const s = new Set()
    knowledgeItems.forEach(item => {
      if (Array.isArray(item.tags)) item.tags.forEach(t => t && s.add(t))
    })
    return s.size
  }, [knowledgeItems])

  // 根据词频给标签一个字号，制造标签云的层次感
  const getTagScale = (count) => {
    if (count >= 8) return 'text-base px-4 py-2'
    if (count >= 4) return 'text-sm px-3.5 py-1.5'
    return 'text-xs px-3 py-1.5'
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 标题与工具栏 */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-amber-900 mb-1.5">我的标签</h2>
              <p className="text-gray-600 text-sm">
                共 {totalTags} 个标签，点击任意标签查看相关笔记
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* 搜索标签 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="搜索标签..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm w-56"
                />
              </div>

              {/* 排序 */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
              >
                <option value="count">按使用次数</option>
                <option value="name">按名称</option>
              </select>
            </div>
          </div>
        </div>

        {/* 当前选中标签提示 */}
        {selectedTag && (
          <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-amber-700 font-medium">当前筛选:</span>
              <span className="px-3 py-1 bg-amber-100 text-amber-900 text-sm font-medium rounded-full">
                #{selectedTag}
              </span>
            </div>
            <button
              onClick={() => onTagClick(null)}
              className="flex items-center space-x-1 text-sm text-amber-700 hover:text-amber-900 transition-colors"
            >
              <X className="w-4 h-4" />
              <span>清除</span>
            </button>
          </div>
        )}

        {/* 标签云 */}
        {tagStats.length > 0 ? (
          <div className="flex flex-wrap gap-2.5">
            {tagStats.map((tag) => (
              <motion.button
                key={tag.name}
                onClick={() => onTagClick(tag.name)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`inline-flex items-center space-x-1.5 rounded-full font-medium transition-colors ${getTagScale(tag.count)} ${
                  selectedTag === tag.name
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                }`}
              >
                <Hash className="w-3.5 h-3.5 opacity-70" />
                <span>{tag.name}</span>
                <span className={`ml-1 px-1.5 rounded-full text-xs ${
                  selectedTag === tag.name ? 'bg-white/25 text-white' : 'bg-white/70 text-amber-700'
                }`}>
                  {tag.count}
                </span>
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <TagIcon className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">
              {search ? '未找到匹配的标签' : '还没有任何标签'}
            </h3>
            <p className="text-gray-500">
              {search ? `没有与"${search}"匹配的标签` : '记笔记时添加标签，它们会自动出现在这里'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TagsView