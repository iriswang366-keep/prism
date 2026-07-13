import React, { useState } from 'react'
import { Zap, Loader2, CheckCircle, AlertCircle, Sparkles, Link2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { marked } from 'marked'
marked.setOptions({ gfm: true, breaks: false })

const KEYWORD_MAP = {
  '知识管理': ['知识', '笔记', '卡片', 'zettelkasten', 'obsidian', 'notion', '管理', '组织', '整理'],
  '产品设计': ['产品', '设计', '用户体验', 'ux', 'ui', '原型', '需求', '调研', '竞品'],
  'AI前沿': ['ai', '人工智能', '大模型', 'chatgpt', '机器学习', '深度学习', '算法', 'llm', 'prompt'],
  '读书笔记': ['读书', '书籍', '阅读', '作者', '书评', '摘录', 'quote', '金句'],
  '效率工具': ['效率', '工具', '自动化', '工作流', 'workflow', '快捷键', '番茄钟'],
  '编程开发': ['代码', '编程', '开发', 'javascript', 'react', 'vue', 'api', 'bug', 'debug'],
  '创业商业': ['创业', '商业', '商业模式', '增长', '运营', '市场', '融资', '营收'],
}

const extractTags = (content) => {
  const contentLower = content.toLowerCase()
  const matchedTags = []
  for (const [tag, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some(kw => contentLower.includes(kw))) {
      matchedTags.push(tag)
      if (matchedTags.length >= 4) break
    }
  }
  return matchedTags.length > 0 ? matchedTags : ['未分类']
}

const extractTitle = (content) => {
  const text = content.trim()
  const match = text.match(/^[\s\S]*?[。！？!?\n]/)
  let firstSentence = match ? match[0] : text
  firstSentence = firstSentence.replace(/[。！？!?\s]+$/, '').trim()
  if (!firstSentence) firstSentence = text
  return firstSentence.length > 50 ? firstSentence.substring(0, 50) + '...' : firstSentence
}

const URL_REGEX = /^https?:\/\/[^\s]+$/i
const isSingleUrl = (text) => URL_REGEX.test(text.trim())

const QuickCapture = ({ onAddCard }) => {
  const [inputValue, setInputValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [extractedTags, setExtractedTags] = useState([])
  const [isExtractingTags, setIsExtractingTags] = useState(false)

  const inputIsUrl = isSingleUrl(inputValue)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitStatus(null)
    setErrorMessage('')

    if (!inputValue.trim()) {
      setSubmitStatus('error')
      setErrorMessage('请输入内容后再点击存入')
      setTimeout(() => setSubmitStatus(null), 3000)
      return
    }

    const trimmed = inputValue.trim()

    // 分支 A：输入是网页链接 → 调 AI 摘要函数
    if (isSingleUrl(trimmed)) {
      setIsExtractingTags(true)
      setExtractedTags([])
      try {
        const { data, error } = await supabase.functions.invoke('summarize-url', {
          body: { url: trimmed },
        })
        if (error) throw new Error(error.message || 'AI 服务调用失败')
        if (data?.error) throw new Error(data.error)
        if (!data?.summary) throw new Error('AI 未能生成摘要，请稍后重试')

        const tags = Array.isArray(data.tags) && data.tags.length > 0 ? data.tags : ['未分类']
        setExtractedTags(tags)

        const summaryWithLink = `${data.summary}<p>🔗 原文链接：<a href="${trimmed}" target="_blank" rel="noopener noreferrer">${trimmed}</a></p>`

        setIsSubmitting(true)
        const newCard = {
          title: data.title || '未命名笔记',
          summary: summaryWithLink,
          tags,
          date: new Date().toISOString(),
        }
        await onAddCard(newCard)

        setInputValue('')
        setExtractedTags([])
        setSubmitStatus('success')
        setTimeout(() => setSubmitStatus(null), 2000)

      } catch (err) {
        // AI 抓取失败（淘宝/京东等需登录或强反爬的页面）→ 优雅降级：存一条纯链接笔记
        try {
          let host = trimmed
          try { host = new URL(trimmed).hostname.replace(/^www\./, '') } catch (_) {}
          const fallbackCard = {
            title: `🔗 ${host}`,
            summary: `<p>该网页需要登录或有反爬限制，AI 未能自动提取正文，已为你保存原始链接：</p><p>🔗 原文链接：<a href="${trimmed}" target="_blank" rel="noopener noreferrer">${trimmed}</a></p>`,
            tags: ['未分类'],
            date: new Date().toISOString(),
          }
          await onAddCard(fallbackCard)
          setInputValue('')
          setExtractedTags([])
          setSubmitStatus('success')
          setTimeout(() => setSubmitStatus(null), 2000)
        } catch (saveErr) {
          setSubmitStatus('error')
          setErrorMessage('保存失败: ' + (saveErr.message || '请稍后重试'))
          setTimeout(() => setSubmitStatus(null), 5000)
        }
      } finally {
        setIsExtractingTags(false)
        setIsSubmitting(false)
      }
      return
    }

    // 分支 B：普通文本 → 本地关键词标签
    if (trimmed.length < 5) {
      setSubmitStatus('error')
      setErrorMessage(`内容太短了，至少需要5个字符（当前${trimmed.length}个）`)
      setTimeout(() => setSubmitStatus(null), 3000)
      return
    }

    setIsSubmitting(true)
    try {
      const tags = extractTags(inputValue)
      setExtractedTags(tags)
      const newCard = {
        title: extractTitle(inputValue),
        summary: marked.parse(inputValue.replace(/\r\n/g, '\n').replace(/\n+/g, '\n\n')),
        tags: tags,
        date: new Date().toISOString()
      }
      await onAddCard(newCard)
      setInputValue('')
      setExtractedTags([])
      setSubmitStatus('success')
      setTimeout(() => setSubmitStatus(null), 2000)
    } catch (error) {
      setSubmitStatus('error')
      setErrorMessage('提交失败: ' + (error.message || '请检查网络连接后重试'))
      setTimeout(() => setSubmitStatus(null), 5000)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getButtonContent = () => {
    if (isExtractingTags) {
      return (<><Loader2 className="w-4 h-4 animate-spin" /><span>AI分析中...</span></>)
    }
    if (isSubmitting) {
      return (<><Loader2 className="w-4 h-4 animate-spin" /><span>处理中...</span></>)
    }
    if (submitStatus === 'success') {
      return (<><CheckCircle className="w-4 h-4" /><span>已保存</span></>)
    }
    return (<><Zap className="w-4 h-4" /><span>闪电存入</span></>)
  }

  const getButtonClass = () => {
    if (submitStatus === 'success') {
      return 'px-5 py-3.5 bg-green-100 hover:bg-green-200 text-green-700 font-medium rounded-xl transition-colors flex items-center space-x-2 shadow-sm border border-green-200'
    }
    if (submitStatus === 'error') {
      return 'px-5 py-3.5 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-xl transition-colors flex items-center space-x-2 shadow-sm border border-red-200'
    }
    return 'px-5 py-3.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium rounded-xl transition-colors flex items-center space-x-2 shadow-sm border border-amber-200 disabled:opacity-50 disabled:cursor-not-allowed'
  }

  return (
    <div className="bg-white/80 backdrop-blur-md border-b border-amber-900/20 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-6 py-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <textarea
                rows={1}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="记录灵感、粘贴长文或 Markdown，或贴一个网页链接让 AI 自动生成笔记..."
                className="w-full px-5 py-3.5 bg-white border border-amber-900/30 rounded-xl focus:ring-2 focus:ring-amber-900/50 focus:border-amber-900 outline-none text-amber-900 placeholder-amber-900/50 shadow-sm transition-all resize-none max-h-40 overflow-auto"
                disabled={isSubmitting || isExtractingTags}
              />

              {inputValue && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                  {inputValue.length}/500
                </div>
              )}
            </div>
            <button
              type="submit"
              className={getButtonClass()}
              disabled={isSubmitting || isExtractingTags || !inputValue.trim()}
            >
              {getButtonContent()}
            </button>
          </div>

          {inputIsUrl && !isExtractingTags && submitStatus !== 'success' && (
            <div className="flex items-center space-x-2 text-sm text-amber-600">
              <Link2 className="w-4 h-4" />
              <span>检测到网页链接，点击「闪电存入」后将由 AI 自动概括并生成笔记</span>
            </div>
          )}

          {/* AI 阅读网页中 - 骨架屏 */}
          {isExtractingTags ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
              <div className="flex items-center space-x-2 text-sm text-amber-700 font-medium">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span>AI 正在阅读网页...</span>
              </div>
              {/* 摘要占位行 */}
              <div className="space-y-2">
                <div className="h-3 rounded bg-amber-200/70 animate-pulse w-full" />
                <div className="h-3 rounded bg-amber-200/70 animate-pulse w-11/12" />
                <div className="h-3 rounded bg-amber-200/70 animate-pulse w-4/5" />
              </div>
              {/* 分点占位行 */}
              <div className="space-y-2 pl-3">
                <div className="h-3 rounded bg-amber-200/50 animate-pulse w-3/4" />
                <div className="h-3 rounded bg-amber-200/50 animate-pulse w-2/3" />
              </div>
              {/* 标签占位 */}
              <div className="flex items-center space-x-2 pt-1">
                <div className="h-5 w-14 rounded-full bg-amber-200/70 animate-pulse" />
                <div className="h-5 w-12 rounded-full bg-amber-200/70 animate-pulse" />
                <div className="h-5 w-16 rounded-full bg-amber-200/70 animate-pulse" />
              </div>
            </div>
          ) : (
            extractedTags.length > 0 && (
              <div className="flex items-center space-x-2 text-sm">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-gray-600">自动标签:</span>
                <div className="flex items-center space-x-2">
                  {extractedTags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 bg-amber-100 text-amber-900 text-xs font-medium rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )
          )}

          {submitStatus === 'error' && (
            <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-2 rounded-lg border border-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {submitStatus === 'success' && (
            <div className="flex items-center space-x-2 text-green-600 text-sm bg-green-50 p-2 rounded-lg border border-green-200">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>笔记已成功保存！</span>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default QuickCapture