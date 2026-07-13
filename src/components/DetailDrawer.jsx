import { motion, AnimatePresence } from 'framer-motion'
import { TableKit } from '@tiptap/extension-table'
import { useEditor, EditorContent } from '@tiptap/react'
import { X, Maximize2, Trash2, Tag, Clock, Save, Plus, ExternalLink } from 'lucide-react'
import React, { useCallback, useEffect, useState, useRef } from 'react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'

// 从 summary（HTML 字符串）里提取所有链接地址，用于在编辑器下方渲染成原生可点击链接
const extractLinks = (html) => {
  if (!html) return []
  const urls = new Set()
  // 1) 优先抓 <a href="..."> 里的地址
  const hrefRegex = /href=["']([^"']+)["']/gi
  let m
  while ((m = hrefRegex.exec(html)) !== null) {
    if (/^https?:\/\//i.test(m[1])) urls.add(m[1])
  }
  // 2) 兜底：抓纯文本里裸露的 http(s) 链接
  const bareRegex = /(https?:\/\/[^\s<>"']+)/gi
  while ((m = bareRegex.exec(html.replace(/<[^>]+>/g, ' '))) !== null) {
    urls.add(m[1])
  }
  return Array.from(urls)
}

// 匹配摘要末尾那段「🔗 原文链接：<a>...</a>」
const SOURCE_LINK_RE = /\s*<p>🔗\s*原文链接：[\s\S]*?<\/p>\s*$/i
// 去掉这段链接，只留正文
const stripSourceLink = (html) => (html || '').replace(SOURCE_LINK_RE, '')

const DetailDrawer = ({ isOpen, onClose, card, onDelete, onUpdate }) => {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [title, setTitle] = useState(card?.title || '')
  const [tags, setTags] = useState(card?.tags || [])
  const [saveStatus, setSaveStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [newTagInput, setNewTagInput] = useState('')

  // 图片上传的隐藏文件输入
  const imageInputRef = useRef(null)
  // 表格行列选择器：是否展开、当前 hover 的行列数
  const [showTableGrid, setShowTableGrid] = useState(false)
  const [tableGrid, setTableGrid] = useState({ rows: 0, cols: 0 })

  // 标志位：用于区分初始加载和用户编辑
  const isInitialLoad = useRef(true)
  const initialContent = useRef('')
  const initialTitle = useRef('')
  const initialTags = useRef([])
  const sourceLinkRef = useRef('')   // 缓存被剥离的「原文链接」片段，保存时拼回

  const editor = useEditor({
        extensions: [
      StarterKit,
      Image,
      TableKit.configure({
        table: { resizable: true },
      }),
    ],
    content: card?.summary || '',
    editorProps: {
      attributes: {
        class: 'note-prose prose prose-amber max-w-none focus:outline-none min-h-[200px]',
      },
    },
    onCreate: () => {
      setIsLoading(false)
    },
  })

  // 初始化数据 - 设置初始值并标记初始加载完成
  useEffect(() => {
    if (card && editor) {
      // 重置初始加载标志
      isInitialLoad.current = true
    
      // 剥离末尾的「原文链接」段，正文进编辑器，链接留给底部卡片
      const rawSummary = card.summary || ''
      const linkMatch = rawSummary.match(SOURCE_LINK_RE)
      sourceLinkRef.current = linkMatch ? linkMatch[0] : ''
      const body = stripSourceLink(rawSummary)
      editor.commands.setContent(body)
      initialContent.current = body

      // 设置标题
      setTitle(card.title || '')
      initialTitle.current = card.title || ''
      
      // 设置标签
      const cardTags = card.tags || []
      setTags(cardTags)
      initialTags.current = [...cardTags]
      
      // 重置状态
      setHasUnsavedChanges(false)
      setNewTagInput('')
      setSaveStatus('idle')
      
      // 延迟关闭初始加载标志，确保所有事件处理完成
      setTimeout(() => {
        isInitialLoad.current = false
      }, 100)
    }
  }, [card, editor])

  // 监听编辑器内容变化 - 仅当用户实际修改时标记为脏
  useEffect(() => {
    if (!editor || !card) return

    const handleUpdate = ({ editor }) => {
      // 跳过初始加载阶段
      if (isInitialLoad.current) return
      
      const currentContent = editor.getHTML()
      // 只有当内容与初始内容不同时才标记为脏
      if (currentContent !== initialContent.current) {
        setHasUnsavedChanges(true)
      }
    }

    editor.on('update', handleUpdate)
    return () => {
      editor.off('update', handleUpdate)
    }
  }, [editor, card])

  // 监听标题变化 - 仅当用户实际修改时标记为脏
  useEffect(() => {
    if (!card || isInitialLoad.current) return
    
    if (title !== initialTitle.current) {
      setHasUnsavedChanges(true)
    }
  }, [title, card])

  // 监听标签变化 - 立即自动保存（但跳过初始加载）
  useEffect(() => {
    if (!card || isInitialLoad.current) return
    
    // 比较当前标签与初始标签
    const tagsChanged = JSON.stringify(tags) !== JSON.stringify(initialTags.current)
    
    if (tagsChanged) {
      setHasUnsavedChanges(true)
      // 标签变化时立即自动保存
      handleAutoSave()
    }
  }, [tags, card])

  // 自动保存函数
  const handleAutoSave = useCallback(async () => {
    if (!card || isInitialLoad.current) return
    
    // 检查是否有实质性变化
    const currentContent = stripSourceLink(editor?.getHTML() || card.summary) + sourceLinkRef.current
    const hasContentChanged = currentContent !== initialContent.current
    const hasTitleChanged = title !== initialTitle.current
    const hasTagsChanged = JSON.stringify(tags) !== JSON.stringify(initialTags.current)
    
    // 如果没有变化，跳过保存
    if (!hasContentChanged && !hasTitleChanged && !hasTagsChanged) {
      return
    }
    
    setSaveStatus('saving')
    
    try {
      const updatedNote = {
        ...card,
        title,
        tags,
        summary: currentContent
      }
      
      if (onUpdate) {
        await onUpdate(updatedNote)
      }
      
      // 更新初始值为当前值
      initialContent.current = currentContent
      initialTitle.current = title
      initialTags.current = [...tags]
      
      setSaveStatus('saved')
      setHasUnsavedChanges(false)
      
      setTimeout(() => {
        setSaveStatus('idle')
      }, 2000)
    } catch (error) {
      console.error('自动保存失败:', error)
      setSaveStatus('error')
      
      setTimeout(() => {
        setSaveStatus('idle')
      }, 3000)
    }
  }, [card, title, tags, editor, onUpdate])

  // 手动保存函数
  const handleSave = useCallback(async () => {
    if (!card) return
    
    setSaveStatus('saving')
    
    try {
      const currentContent = stripSourceLink(editor?.getHTML() || card.summary) + sourceLinkRef.current
      const updatedNote = {
        ...card,
        title,
        tags,
        summary: currentContent
      }
      
      if (onUpdate) {
        await onUpdate(updatedNote)
      }
      
      // 更新初始值为当前值
      initialContent.current = currentContent
      initialTitle.current = title
      initialTags.current = [...tags]
      
      setSaveStatus('saved')
      setHasUnsavedChanges(false)
      
      setTimeout(() => {
        setSaveStatus('idle')
      }, 2000)
    } catch (error) {
      console.error('保存失败:', error)
      setSaveStatus('error')
      
      setTimeout(() => {
        setSaveStatus('idle')
      }, 3000)
    }
  }, [card, title, tags, editor, onUpdate])

  // 抽屉关闭时如果有未保存的更改，提示用户
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges && saveStatus !== 'saved') {
      const confirmClose = window.confirm('您有未保存的更改，确定要关闭吗？')
      if (!confirmClose) return
    }
    // 立即调用 onClose，不要有延迟
    onClose()
  }, [hasUnsavedChanges, saveStatus, onClose])

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    try {
      await onDelete(card)
      setShowDeleteConfirm(false)
      onClose()
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
  }

  // 删除标签
  const handleRemoveTag = (tagToRemove) => {
    setTags(prevTags => prevTags.filter(tag => tag !== tagToRemove))
  }

  // 添加新标签
  const handleAddTag = (e) => {
    if (e.key === 'Enter' && newTagInput.trim()) {
      e.preventDefault()
      const newTag = newTagInput.trim()
      
      // 检查标签是否已存在
      if (!tags.includes(newTag)) {
        setTags(prevTags => [...prevTags, newTag])
      }
      
      setNewTagInput('')
    }
  }

  // 处理本地图片上传：读成 base64 内嵌进编辑器
  const handleImageFileChange = useCallback((e) => {
    const file = e.target.files?.[0]
    // 清空 value，保证同一张图片连续选择也能触发 onChange
    e.target.value = ''
    if (!file || !editor) return
    if (!file.type.startsWith('image/')) {
      window.alert('请选择图片文件')
      return
    }
    // 限制 5MB，避免超大图片撑爆笔记内容
    if (file.size > 5 * 1024 * 1024) {
      window.alert('图片太大了，请选择 5MB 以内的图片')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      editor.chain().focus().setImage({ src: reader.result }).run()
    }
    reader.readAsDataURL(file)
  }, [editor])

  // 工具栏按钮组件
  const MenuBar = ({ editor }) => {
    if (!editor) {
      return null
    }
    return (
     <div className="border-b border-gray-200 p-2 flex flex-wrap items-center gap-1 [&_button]:flex [&_button]:items-center [&_button]:justify-center [&_svg]:block">
         {[1, 2, 3, 4].map((lvl) => (
          <button
            key={lvl}
            onClick={() => editor.chain().focus().toggleHeading({ level: lvl }).run()}
            className={`p-2 rounded ${editor.isActive('heading', { level: lvl }) ? 'bg-amber-100 text-amber-900' : 'hover:bg-gray-100'}`}
            title={`H${lvl} 标题`}
          >
            <span className="font-bold text-sm">H{lvl}</span>
          </button>
        ))}

        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded ${editor.isActive('bold') ? 'bg-amber-100 text-amber-900' : 'hover:bg-gray-100'}`}
          title="加粗"
        >
          <span className="font-bold">B</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded ${editor.isActive('italic') ? 'bg-amber-100 text-amber-900' : 'hover:bg-gray-100'}`}
          title="斜体"
        >
          <span className="italic">I</span>
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded ${editor.isActive('bulletList') ? 'bg-amber-100 text-amber-900' : 'hover:bg-gray-100'}`}
          title="无序列表"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded ${editor.isActive('orderedList') ? 'bg-amber-100 text-amber-900' : 'hover:bg-gray-100'}`}
          title="有序列表"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="10" y1="6" x2="21" y2="6"></line>
            <line x1="10" y1="12" x2="21" y2="12"></line>
            <line x1="10" y1="18" x2="21" y2="18"></line>
            <path d="M4 6h1v4"></path>
            <path d="M4 10h2"></path>
            <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
          </svg>
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button
          onClick={() => imageInputRef.current?.click()}
          className="p-2 rounded hover:bg-gray-100"
          title="插入图片（上传本地图片）"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21,15 16,10 5,21"></polyline>
          </svg>
        </button>

        {/* 表格：点击展开行列选择网格 */}
        <div className="relative">
          <button
            onClick={() => {
              setShowTableGrid((v) => !v)
              setTableGrid({ rows: 0, cols: 0 })
            }}
            className={`p-2 rounded ${showTableGrid ? 'bg-amber-100 text-amber-900' : 'hover:bg-gray-100'}`}
            title="插入表格"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"></path>
            </svg>
          </button>
          {showTableGrid && (
            <div className="absolute z-20 top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg">
              <div className="grid grid-cols-6 gap-1">
                {Array.from({ length: 36 }).map((_, i) => {
                  const r = Math.floor(i / 6) + 1
                  const c = (i % 6) + 1
                  const active = r <= tableGrid.rows && c <= tableGrid.cols
                  return (
                    <div
                      key={i}
                      onMouseEnter={() => setTableGrid({ rows: r, cols: c })}
                      onClick={() => {
                        editor.chain().focus().insertTable({ rows: r, cols: c, withHeaderRow: true }).run()
                        setShowTableGrid(false)
                      }}
                      className={`w-4 h-4 border rounded-sm cursor-pointer ${active ? 'bg-amber-400 border-amber-500' : 'bg-gray-50 border-gray-200'}`}
                    />
                  )
                })}
              </div>
              <div className="mt-1.5 text-xs text-gray-500 text-center">
                {tableGrid.rows > 0 ? `${tableGrid.rows} × ${tableGrid.cols}` : '选择行 × 列'}
              </div>
            </div>
          )}
        </div>

        {/* 表格操作：仅当光标在表格内时显示，用于删表/增删行列 */}
        {editor.isActive('table') && (
          <>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <button
              onClick={() => editor.chain().focus().addRowAfter().run()}
              className="p-2 rounded hover:bg-gray-100 text-xs"
              title="在下方插入行"
            >
              +行
            </button>
            <button
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              className="p-2 rounded hover:bg-gray-100 text-xs"
              title="在右侧插入列"
            >
              +列
            </button>
            <button
              onClick={() => editor.chain().focus().deleteRow().run()}
              className="p-2 rounded hover:bg-gray-100 text-xs"
              title="删除当前行"
            >
              -行
            </button>
            <button
              onClick={() => editor.chain().focus().deleteColumn().run()}
              className="p-2 rounded hover:bg-gray-100 text-xs"
              title="删除当前列"
            >
              -列
            </button>
            <button
              onClick={() => editor.chain().focus().deleteTable().run()}
              className="p-2 rounded hover:bg-red-50 text-red-500 text-xs"
              title="删除整个表格"
            >
              删表格
            </button>
          </>
        )}
      </div>
    )
  }

  // 保存状态提示文本
  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saving':
        return '正在保存...'
      case 'saved':
        return '已保存 ✓'
      case 'error':
        return '保存失败'
      default:
        return hasUnsavedChanges ? '有未保存的更改' : ''
    }
  }

  // 保存状态提示样式
  const getSaveStatusClass = () => {
    switch (saveStatus) {
      case 'saving':
        return 'text-amber-500'
      case 'saved':
        return 'text-green-500'
      case 'error':
        return 'text-red-500'
      default:
        return hasUnsavedChanges ? 'text-blue-500' : 'text-transparent'
    }
  }

  if (!isOpen || !card) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className={`fixed inset-0 z-50 flex ${isFullscreen ? 'bg-white' : ''}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* 背景遮罩 - 仅在非全屏模式下显示 */}
          {!isFullscreen && (
            <motion.div 
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={handleClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
          
          {/* 抽屉内容 */}
          <motion.div 
            className={`relative ml-auto ${isFullscreen ? 'w-full' : 'w-[60%]'} h-full bg-white shadow-2xl flex flex-col`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* 抽屉头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-amber-900">笔记详情</h2>
              <div className="flex items-center space-x-2">
                {/* 保存状态提示 */}
                <span className={`text-sm ${getSaveStatusClass()} transition-opacity duration-300`}>
                  {getSaveStatusText()}
                </span>
                <button
                  onClick={toggleFullscreen}
                  className="p-2 text-gray-400 hover:text-amber-900 transition-colors"
                  title={isFullscreen ? "退出全屏" : "全屏预览"}
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleClose}
                  className="p-2 text-gray-400 hover:text-amber-900 transition-colors cursor-pointer"
                  title="关闭"
                  type="button"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            {/* 抽屉内容区 */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                {/* 标题 */}
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-2xl font-bold text-amber-900 mb-4 leading-tight w-full border-none outline-none bg-transparent"
                  placeholder="输入标题..."
                />
                
                {/* 元数据 */}
                <div className="flex items-center gap-4 mb-6 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1.5" />
                    <span>{new Date(card.date).toLocaleDateString('zh-CN')}</span>
                  </div>
                  <div className="flex items-center">
                    <Tag className="w-4 h-4 mr-1.5" />
                    <span>{tags?.length || 0} 个标签</span>
                  </div>
                </div>
                
                {/* 富文本编辑器 */}
                <div className="border border-gray-200 rounded-lg mb-6 overflow-hidden">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-900"></div>
                    </div>
                  ) : (
                    <>
                      <MenuBar editor={editor} />
                      {/* 隐藏的文件输入，供图片按钮触发本地上传 */}
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageFileChange}
                      />

                      <div className="p-4">
                        <EditorContent editor={editor} />
                        <style>{`
                          .note-prose h1 { font-size: 1.375rem; line-height: 1.5; margin: 0.6em 0 0.3em; }
                          .note-prose h2 { font-size: 1.15rem;  line-height: 1.5; margin: 0.6em 0 0.3em; }
                          .note-prose h3 { font-size: 1.05rem; line-height: 1.5; margin: 0.6em 0 0.3em; font-weight: 700; }
                          .note-prose h4 { font-size: 1rem;    line-height: 1.7; margin: 0.6em 0 0.3em; font-weight: 700; }
                          .note-prose img { display: block; margin: 12px auto; max-width: 100%; height: auto; border-radius: 8px; }
                          .note-prose table { width: 100%; border-collapse: collapse; margin: 12px 0; table-layout: fixed; }
                          .note-prose th, .note-prose td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; vertical-align: top; word-break: break-word; }
                          .note-prose th { background: #fef3c7; font-weight: 600; }
                          .note-prose > p:last-child:empty,
                          .note-prose > p:last-child:has(> br.ProseMirror-trailingBreak:only-child) { margin: 0; height: 0; min-height: 0; overflow: hidden; }
                        `}</style>
                      </div>

                    </>
                  )}
                </div>

               {/* 相关链接（原生可点击，绕开 Tiptap 编辑态不跳转的限制） */}
                {(() => {
                  const links = extractLinks(card?.summary)
                  if (links.length === 0) return null
                  return (
                    <div className="mb-6 -mt-2 space-y-2">
                      {links.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-blue-100 bg-blue-50/60 text-sm text-blue-700 hover:bg-blue-100 hover:border-blue-200 transition-colors group"
                        >
                          <ExternalLink className="w-4 h-4 shrink-0" />
                          <span className="truncate group-hover:underline">{url}</span>
                        </a>
                      ))}
                    </div>
                  )
                })()}

                {/* 可编辑的标签区域 */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">标签编辑</h3>
                  <div className="flex flex-wrap gap-2 items-center">
                    {/* 现有标签 - 胶囊样式带删除按钮 */}
                    {tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1.5 bg-amber-100 text-amber-900 text-sm font-medium rounded-full group"
                      >
                        #{tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 w-4 h-4 flex items-center justify-center rounded-full hover:bg-amber-200 text-amber-700 transition-colors"
                          title="删除标签"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    
                    {/* 添加新标签输入框 */}
                    <div className="relative flex items-center">
                      <Plus className="absolute left-2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                        placeholder="添加标签..."
                        className="pl-7 pr-3 py-1.5 text-sm bg-transparent border-none outline-none focus:ring-0 text-gray-700 placeholder-gray-400 w-28 focus:w-40 transition-all"
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    提示：点击标签上的 × 删除，在输入框中输入文字按回车添加新标签
                  </p>
                </div>
              </div>
            </div>
            
            {/* 抽屉底部操作栏 */}
            <div className="border-t border-gray-200 p-4 flex justify-between items-center">
              <button
                onClick={handleDeleteClick}
                className="flex items-center space-x-2 text-red-500 hover:text-red-700 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                <span>删除笔记</span>
              </button>
              
              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving' || !hasUnsavedChanges}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  saveStatus === 'saving' || !hasUnsavedChanges
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                }`}
              >
                <Save className="w-5 h-5" />
                <span>
                  {saveStatus === 'saving' ? '保存中...' : '保存笔记'}
                </span>
              </button>
            </div>
          </motion.div>

          {/* 删除确认对话框 - 修复：使用 z-50 替代 z-60 */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div 
                className="fixed inset-0 z-50 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div 
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
                  onClick={cancelDelete}
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
                  <h3 className="text-lg font-bold text-gray-900 mb-4">确认删除</h3>
                  <p className="text-gray-600 mb-6">该笔记将移入回收站，可在 30 天内恢复。</p>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={cancelDelete}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={confirmDelete}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default DetailDrawer
