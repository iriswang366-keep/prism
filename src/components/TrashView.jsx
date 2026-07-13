import React, { useMemo, useState } from 'react'
import { Trash2, RotateCcw, Clock, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// 移除 HTML 标签，取纯文本摘要
const extractPlainText = (htmlContent) => {
  if (!htmlContent) return ''
  let plainText = htmlContent.replace(/<[^>]*>/g, '')
  const textarea = document.createElement('textarea')
  textarea.innerHTML = plainText
  plainText = textarea.value
  return plainText.replace(/\s+/g, ' ').trim()
}

// 计算距离永久删除还剩多少天（保留 30 天）
const getDaysLeft = (deletedAt) => {
  if (!deletedAt) return 30
  const deleted = new Date(deletedAt).getTime()
  const expire = deleted + 30 * 24 * 60 * 60 * 1000
  const left = Math.ceil((expire - Date.now()) / (24 * 60 * 60 * 1000))
  return Math.max(left, 0)
}

// 回收站：展示已删除笔记，可恢复或彻底删除；笔记默认保留 30 天。
const TrashView = ({ trashedItems = [], onRestore, onPermanentDelete }) => {
  // 待彻底删除确认的笔记
  const [pendingDelete, setPendingDelete] = useState(null)

  const items = useMemo(() => {
    // 按删除时间倒序（最近删的在前）
    return [...trashedItems].sort(
      (a, b) => new Date(b.deleted_at || 0) - new Date(a.deleted_at || 0)
    )
  }, [trashedItems])

  const confirmPermanentDelete = async () => {
    if (!pendingDelete) return
    try {
      await onPermanentDelete?.(pendingDelete)
    } finally {
      setPendingDelete(null)
    }
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-amber-900 mb-1.5">回收站</h2>
          <p className="text-gray-600 text-sm">
            删除的笔记会在这里保留 30 天，到期后自动清除
          </p>
        </div>

        {items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((item) => {
              const daysLeft = getDaysLeft(item.deleted_at)
              const plainSummary = extractPlainText(item.summary)
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl border border-amber-900/20 p-5 shadow-lg flex flex-col"
                >
                  <h3 className="text-base font-bold text-gray-700 mb-2 leading-snug line-clamp-2">
                    {item.title || '无标题'}
                  </h3>

                  <p
                    className="text-gray-500 text-sm leading-relaxed mb-3 flex-1"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {plainSummary || '（空笔记）'}
                  </p>

                  {/* 剩余天数提示 */}
                  <div
                    className={`flex items-center text-xs mb-3.5 ${
                      daysLeft <= 3 ? 'text-red-500' : 'text-gray-400'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    <span>{daysLeft > 0 ? `${daysLeft} 天后永久删除` : '即将永久删除'}</span>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => onRestore?.(item)}
                      className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-amber-100 text-amber-900 text-sm font-medium rounded-lg hover:bg-amber-200 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>恢复</span>
                    </button>
                    <button
                      onClick={() => setPendingDelete(item)}
                      className="flex items-center justify-center space-x-1.5 px-3 py-2 text-red-500 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>彻底删除</span>
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <Trash2 className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">回收站是空的</h3>
            <p className="text-gray-500">删除的笔记会先放到这里，30 天内都可以恢复</p>
          </div>
        )}
      </div>

      {/* 彻底删除确认对话框 */}
      <AnimatePresence>
        {pendingDelete && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setPendingDelete(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="flex items-start space-x-3 mb-4">
                <div className="w-10 h-10 shrink-0 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">彻底删除</h3>
                  <p className="text-gray-600 mt-1 text-sm">
                    「{pendingDelete.title || '无标题'}」将被永久删除，此操作无法撤销。
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setPendingDelete(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={confirmPermanentDelete}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  永久删除
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default TrashView