import React, { useEffect, useRef } from 'react'
import { Clock, Heart } from 'lucide-react'
import { motion } from 'framer-motion'

// 提取纯文本的辅助函数 - 移除所有 HTML 标签
const extractPlainText = (htmlContent) => {
  if (!htmlContent) return ''

  // 首先移除 HTML 标签
  let plainText = htmlContent.replace(/<[^>]*>/g, '')

  // 解码 HTML 实体
  const textarea = document.createElement('textarea')
  textarea.innerHTML = plainText
  plainText = textarea.value

  // 移除多余空白
  plainText = plainText.replace(/\s+/g, ' ').trim()

  return plainText
}

// 转义正则特殊字符，避免用户搜索 "(" ")" "[" 等字符时正则崩溃
const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// 把时间戳格式化为「2026/7/7 19:55」，精确到分钟
const formatDateTime = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const KnowledgeCard = ({ id, title, summary, tags, date, favorite, isNew, onClick, onTagClick, onToggleFavorite, highlightTerm }) => {
  const cardRef = useRef(null)

  useEffect(() => {
    if (isNew && cardRef.current) {
      cardRef.current.style.opacity = '0'
      cardRef.current.style.transform = 'translateY(10px)'

      cardRef.current.getBoundingClientRect()

      cardRef.current.style.transition = 'opacity 300ms ease-out, transform 300ms ease-out'
      cardRef.current.style.opacity = '1'
      cardRef.current.style.transform = 'translateY(0)'
    }
  }, [isNew])

  const handleCardClick = () => {
    if (onClick) {
      onClick({ id, title, summary, tags, date, favorite })
    }
  }

  const handleTagClick = (e, tag) => {
    e.stopPropagation()
    if (onTagClick) {
      onTagClick(tag)
    }
  }

  // 点击爱心：切换收藏，阻止冒泡以免误触打开详情
  const handleFavoriteClick = (e) => {
    e.stopPropagation()
    if (onToggleFavorite) {
      onToggleFavorite({ id, title, summary, tags, date, favorite })
    }
  }

  const getTimeColor = (dateStr) => {
    // 判断是否为今天
    const today = new Date()
    const noteDate = new Date(dateStr)
    const isToday = today.toDateString() === noteDate.toDateString()

    if (isToday) return 'text-green-600'
    return 'text-gray-500'
  }

  const highlightText = (text, term) => {
    if (!term || !text) return text

    const escaped = escapeRegExp(term)
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
    const lower = term.toLowerCase()

    return parts.map((part, index) =>
      part.toLowerCase() === lower ? (
        <span key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </span>
      ) : (
        part
      )
    )
  }

  const highlightTag = (tag, term) => {
    if (!term) return `#${tag}`

    const escaped = escapeRegExp(term)
    const parts = tag.split(new RegExp(`(${escaped})`, 'gi'))
    const lower = term.toLowerCase()

    return parts.map((part, index) =>
      part.toLowerCase() === lower ? (
        <span key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </span>
      ) : (
        part
      )
    )
  }

  // 提取纯文本摘要用于显示
  const plainSummary = extractPlainText(summary)

  return (
    <motion.div
      ref={cardRef}
      onClick={handleCardClick}
      className="bg-white rounded-2xl border border-amber-900/20 p-5 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer group shadow-xl relative overflow-hidden"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 新卡片标识 */}
      {isNew && (
        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 transform rotate-45 translate-x-8 -translate-y-8">
          <div className="absolute bottom-0 left-0 text-white text-xs font-bold transform -rotate-45 translate-x-1 translate-y-1">
            NEW
          </div>
        </div>
      )}

      {/* 标题 */}
      <h3 className="text-base font-bold text-amber-900 mb-2.5 group-hover:text-amber-800 transition-colors leading-snug pr-8">
        {highlightText(title, highlightTerm)}
      </h3>

            {/* 摘要 - 纯文本。用行内 style 做 6 行截断（不依赖 line-clamp 插件/版本）：
          短笔记保持短、长笔记更高，从而制造瀑布流高度差 */}
      <p
        className="text-gray-600 text-sm leading-relaxed mb-3.5"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}
      >
        {highlightText(plainSummary, highlightTerm)}
      </p>

      {/* 标签 */}
      <div className="flex flex-wrap gap-1.5 mb-3.5">
        {tags.map((tag, index) => (
          <motion.span
            key={index}
            onClick={(e) => handleTagClick(e, tag)}
            className="px-2.5 py-1 bg-amber-100 text-amber-900 text-xs font-medium rounded-full hover:bg-amber-200 transition-colors cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {highlightTag(tag, highlightTerm)}
          </motion.span>
        ))}
      </div>

      {/* 底部信息：创建时间（精确到分钟） + 收藏爱心 */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center ${getTimeColor(date)} text-xs`}>
          <Clock className="w-3.5 h-3.5 mr-1" />
          <span>{formatDateTime(date)}</span>
        </div>

        <button
          onClick={handleFavoriteClick}
          className="p-1 rounded-full hover:bg-red-50 transition-colors"
          title={favorite ? '取消收藏' : '收藏'}
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              favorite ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-500'
            }`}
          />
        </button>
      </div>
    </motion.div>
  )
}

export default KnowledgeCard
