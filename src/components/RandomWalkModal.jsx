import React, { useState, useEffect } from 'react'
import { X, Clock, Shuffle, ExternalLink } from 'lucide-react'

const RandomWalkModal = ({ isOpen, onClose, notes = [], onViewOriginal }) => {
  const [currentNote, setCurrentNote] = useState(null)

  // 随机抽取笔记函数
  const getRandomNote = () => {
    if (!notes || notes.length === 0) return null
    
    const randomIndex = Math.floor(Math.random() * notes.length)
    return notes[randomIndex]
  }

  // 初始化时随机抽取一条笔记
  useEffect(() => {
    if (isOpen) {
      setCurrentNote(getRandomNote())
    }
  }, [isOpen, notes])

  // 换一篇功能
  const handleShuffle = () => {
    setCurrentNote(getRandomNote())
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 半透明背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 浮窗内容 */}
      <div className="relative bg-white rounded-2xl border border-amber-900/20 p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[80vh] flex flex-col">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-amber-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 滚动内容区域 */}
        <div className="pr-8 overflow-y-auto flex-1">
          {currentNote ? (
            <>
              {/* 标题 */}
              <h3 className="text-xl font-bold text-amber-900 mb-4 leading-snug">
                {currentNote.title}
              </h3>
              
              {/* 摘要/正文 - 使用 dangerouslySetInnerHTML 渲染富文本 */}
              <div 
                className="text-gray-600 text-base leading-relaxed mb-6 prose prose-amber max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: currentNote.summary || '<p>暂无内容</p>' 
                }}
              />
              
              {/* 标签 */}
              <div className="flex flex-wrap gap-2 mb-4">
                {currentNote.tags && currentNote.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-amber-100 text-amber-900 text-sm font-medium rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              
              {/* 日期 */}
              <div className="flex items-center text-gray-500 text-sm">
                <Clock className="w-4 h-4 mr-1.5" />
                <span>{new Date(currentNote.date).toLocaleDateString('zh-CN')}</span>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">暂无可显示的笔记</p>
            </div>
          )}
        </div>

        {/* 底部操作按钮 */}
        {currentNote && (
          <div className="mt-6 pt-4 border-t border-gray-200 flex justify-center gap-3">
            <button
              onClick={handleShuffle}
              className="flex items-center space-x-2 px-6 py-3 bg-amber-100 text-amber-900 rounded-lg hover:bg-amber-200 transition-colors font-medium"
            >
              <Shuffle className="w-5 h-5" />
              <span>🎲 换一篇</span>
            </button>
            {onViewOriginal && (
              <button
                onClick={() => onViewOriginal(currentNote)}
                className="flex items-center space-x-2 px-6 py-3 bg-white text-amber-900 border border-amber-900/30 rounded-lg hover:bg-amber-50 transition-colors font-medium"
              >
                <ExternalLink className="w-5 h-5" />
                <span>查看原文</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default RandomWalkModal
