import { useNotes, useCreateNote, useUpdateNote, useDeleteNote, useTrashedNotes, useRestoreNote, usePermanentDeleteNote } from '../lib/hooks'
import { useAuth } from '../lib/auth'
import { initializeUserNotes } from '../lib/noteTemplates'
import { checkUserHasNotes } from '../lib/api'
import RandomWalkModal from '../components/RandomWalkModal'
import KnowledgeGraph from '../components/KnowledgeGraph'
import TagsView from '../components/TagsView'
import TrashView from '../components/TrashView'
import AuthModal from '../components/AuthModal'
import React, { useState, useEffect, useCallback } from 'react'
import MainContent from '../components/MainContent'
import Sidebar from '../components/Sidebar'
import DetailDrawer from '../components/DetailDrawer'
import QuickCapture from '../components/QuickCapture'

const getInitKey = (userId) => `prism_initialized_${userId}`

const Index = () => {
  const [activeTab, setActiveTab] = useState('home')
  const [showRandomModal, setShowRandomModal] = useState(false)
  const [selectedCard, setSelectedCard] = useState(null)
  const [showDetailDrawer, setShowDetailDrawer] = useState(false)
  const [selectedTag, setSelectedTag] = useState(null)
  const [globalSearchTerm, setGlobalSearchTerm] = useState('')
  const [toast, setToast] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [initChecked, setInitChecked] = useState(false)

  // 获取认证状态
  const {
    user,
    loginMethod,
    isLoading: isAuthLoading,
    isInitialized: isAuthInitialized,
    isAuthenticated,
    logout
  } = useAuth()

  const {
    data: knowledgeItems = [],
    isLoading,
    error,
    refetch
  } = useNotes(isAuthenticated)

  const createNoteMutation = useCreateNote()
  const updateNoteMutation = useUpdateNote()
  const deleteNoteMutation = useDeleteNote()
  const restoreNoteMutation = useRestoreNote()
  const permanentDeleteNoteMutation = usePermanentDeleteNote()

  // 回收站数据：仅登录后拉取
  const { data: trashedItems = [] } = useTrashedNotes(isAuthenticated)

  // ==================== 简化的认证状态判断 ====================
  useEffect(() => {
    // 等待认证初始化完成
    if (!isAuthInitialized) {
      return
    }

    if (!isAuthenticated) {
      setShowAuthModal(true)
    } else {
      setShowAuthModal(false)
    }
  }, [isAuthenticated, isAuthInitialized, user?.id])

  // 新用户初始化预设笔记
  useEffect(() => {
    const initNewUser = async () => {
      if (!user?.id || isLoading || initChecked || isInitializing) {
        return
      }

      const initKey = getInitKey(user.id)
      const hasLocalInitFlag = localStorage.getItem(initKey) === 'true'

      if (hasLocalInitFlag) {
        setInitChecked(true)
        return
      }

      setIsInitializing(true)

      try {
        const hasNotes = await checkUserHasNotes()

        if (!hasNotes) {
          const createNoteWithUser = async (noteData) => {
            return await createNoteMutation.mutateAsync(noteData)
          }

          await initializeUserNotes(createNoteWithUser, user.id)
          localStorage.setItem(initKey, 'true')
          setToast('🎉 欢迎！已为你创建示例笔记')
          await refetch()
        } else {
          localStorage.setItem(initKey, 'true')
        }

        setInitChecked(true)
      } catch (error) {
        console.error('初始化用户笔记失败:', error)
        setToast('初始化失败，请刷新页面重试')
      } finally {
        setIsInitializing(false)
      }
    }

    initNewUser()
  }, [user?.id, isLoading, initChecked, isInitializing, refetch, createNoteMutation])

  // 清除提示
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleAuthSuccess = useCallback((method) => {
    setToast(`登录成功！欢迎回来`)
    setShowAuthModal(false)
    // Supabase 的 onAuthStateChange 会自动同步登录状态，
    // 这里只需重新拉取当前用户的笔记数据即可。
    refetch()
  }, [refetch])

  const handleLogout = useCallback(async () => {
    try {
      await logout()
      setToast('已退出登录')
      setShowDetailDrawer(false)
      setSelectedCard(null)
      setInitChecked(false)
      if (user?.id) {
        localStorage.removeItem(getInitKey(user.id))
      }
    } catch (error) {
      console.error('登出失败:', error)
      setToast('登出失败')
    }
  }, [logout, user?.id])

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId)

    if (tabId === 'random') {
      if (knowledgeItems.length === 0) {
        setToast('暂无知识，请先添加')
        setTimeout(() => {
          setActiveTab('home')
        }, 100)
        return
      }

      setShowRandomModal(true)
      setTimeout(() => {
        setActiveTab('home')
      }, 300)
    }
  }, [knowledgeItems.length])

  const handleCloseRandomModal = useCallback(() => {
    setShowRandomModal(false)
  }, [])

  const handleCloseDetailDrawer = useCallback(() => {
    setShowDetailDrawer(false)
    setSelectedCard(null)
  }, [])

  const handleAddNewCard = useCallback(async (newCardData) => {
    try {
      await createNoteMutation.mutateAsync(newCardData)
      setToast('笔记创建成功！')
    } catch (error) {
      console.error('创建笔记失败:', error)
      setToast('创建笔记失败: ' + (error.message || '请重试'))
    }
  }, [createNoteMutation])

  const handleCardClick = useCallback((card) => {
    setSelectedCard(card)
    setShowDetailDrawer(true)
  }, [])

  const handleTagClick = useCallback((tag) => {
    setSelectedTag(tag)
    setGlobalSearchTerm('')
  }, [])

    // 从「我的标签」页点击标签：选中标签并跳回灵感主页查看筛选结果；
  // 点“清除”(tag=null) 时留在标签页，仅取消筛选。
  const handleTagClickFromTagsView = useCallback((tag) => {
    setSelectedTag(tag)
    setGlobalSearchTerm('')
    if (tag) {
      setActiveTab('home')
    }
  }, [])

  const handleGlobalSearch = useCallback((searchTerm) => {
    setGlobalSearchTerm(searchTerm)
    setSelectedTag(null)
  }, [])

  // 切换收藏状态：复用更新笔记的 mutation，只改 favorite 字段
  const handleToggleFavorite = useCallback(async (card) => {
    try {
      if (!card?.id) {
        setToast('操作失败: 笔记ID为空')
        return
      }

      const nextFavorite = !card.favorite
      await updateNoteMutation.mutateAsync({
        id: card.id,
        updates: { favorite: nextFavorite }
      })
      setToast(nextFavorite ? '已加入收藏 ❤️' : '已取消收藏')
    } catch (error) {
      console.error('更新收藏状态失败:', error)
      setToast('操作失败: ' + (error.message || '请检查网络连接'))
    }
  }, [updateNoteMutation])

  const handleDeleteCard = useCallback(async (cardToDelete) => {
    try {
      if (!cardToDelete?.id) {
        setToast('删除失败: 卡片ID为空')
        return
      }

      await deleteNoteMutation.mutateAsync(cardToDelete.id)
      setToast('笔记已成功删除')
      setShowDetailDrawer(false)
      setSelectedCard(null)
    } catch (error) {
      console.error('删除笔记失败:', error)
      setToast('删除笔记失败: ' + (error.message || '请检查网络连接'))
    }
  }, [deleteNoteMutation])

    // 从回收站恢复笔记
  const handleRestoreNote = useCallback(async (note) => {
    try {
      if (!note?.id) {
        setToast('恢复失败: 笔记ID为空')
        return
      }
      await restoreNoteMutation.mutateAsync(note.id)
      setToast('笔记已恢复')
    } catch (error) {
      console.error('恢复笔记失败:', error)
      setToast('恢复失败: ' + (error.message || '请检查网络连接'))
    }
  }, [restoreNoteMutation])

  // 彻底删除（不可恢复）
  const handlePermanentDelete = useCallback(async (note) => {
    try {
      if (!note?.id) {
        setToast('删除失败: 笔记ID为空')
        return
      }
      await permanentDeleteNoteMutation.mutateAsync(note.id)
      setToast('笔记已永久删除')
    } catch (error) {
      console.error('彻底删除失败:', error)
      setToast('删除失败: ' + (error.message || '请检查网络连接'))
    }
  }, [permanentDeleteNoteMutation])

  const handleUpdateNote = useCallback(async (updatedNote) => {
    try {
      if (!updatedNote?.id) {
        setToast('更新失败: 笔记ID为空')
        return
      }

      await updateNoteMutation.mutateAsync({
        id: updatedNote.id,
        updates: {
          title: updatedNote.title,
          summary: updatedNote.summary,
          tags: updatedNote.tags
        }
      })
      setToast('笔记已成功更新')
    } catch (error) {
      console.error('更新笔记失败:', error)
      setToast('更新笔记失败: ' + (error.message || '请检查网络连接'))
    }
  }, [updateNoteMutation])

  // ==================== 渲染状态判断 ====================

  // 认证初始化中 - 显示全屏 Loading
  if (!isAuthInitialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-amber-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-amber-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-600 font-medium">正在初始化...</p>
        </div>
      </div>
    )
  }

  const renderMainContent = () => {
    // 未登录状态 - 显示占位内容
    if (!isAuthenticated) {
      return (
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center opacity-50">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 border-4 border-amber-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-amber-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="text-gray-600 font-medium">等待登录...</p>
          </div>
        </div>
      )
    }

    // 笔记加载中
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 border-4 border-amber-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-amber-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="text-gray-600 font-medium">加载笔记中...</p>
          </div>
        </div>
      )
    }

    // 加载错误
    if (error) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-red-600 mb-2">加载失败</h3>
            <p className="text-gray-600 mb-6">无法加载笔记数据，请检查网络连接</p>
            <p className="text-sm text-red-500 mb-4">{error.message}</p>
            <button
              onClick={() => refetch()}
              className="px-6 py-3 bg-amber-100 text-amber-900 rounded-lg hover:bg-amber-200 transition-colors font-medium"
            >
              重新加载
            </button>
          </div>
        </div>
      )
    }

    // 正常内容渲染
    switch (activeTab) {
      case 'home':
        return (
          <MainContent
            knowledgeItems={knowledgeItems}
            selectedCard={selectedCard}
            onCardClick={handleCardClick}
            selectedTag={selectedTag}
            onTagClick={handleTagClick}
            onToggleFavorite={handleToggleFavorite}
            globalSearchTerm={globalSearchTerm}
          />
        )
      case 'favorites':
        return (
          <MainContent
            knowledgeItems={knowledgeItems}
            selectedCard={selectedCard}
            onCardClick={handleCardClick}
            selectedTag={selectedTag}
            onTagClick={handleTagClick}
            onToggleFavorite={handleToggleFavorite}
            globalSearchTerm={globalSearchTerm}
            favoritesOnly={true}
          />
        )
      case 'graph':
        return (
          <KnowledgeGraph
            knowledgeItems={knowledgeItems}
            onNoteClick={handleCardClick}
          />
        )
      case 'tags':
        return (
          <TagsView
            knowledgeItems={knowledgeItems}
            selectedTag={selectedTag}
            onTagClick={handleTagClickFromTagsView}
          />
        )
      case 'trash':
        return (
          <TrashView
            trashedItems={trashedItems}
            onRestore={handleRestoreNote}
            onPermanentDelete={handlePermanentDelete}
          />
        )
      default:
        return (
          <MainContent
            knowledgeItems={knowledgeItems}
            selectedCard={selectedCard}
            onCardClick={handleCardClick}
            selectedTag={selectedTag}
            onTagClick={handleTagClick}
            onToggleFavorite={handleToggleFavorite}
            globalSearchTerm={globalSearchTerm}
          />
        )
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 全局提示 */}
      {toast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-amber-100 text-amber-900 px-6 py-3 rounded-lg shadow-lg border border-amber-200 animate-fade-in">
          {toast}
        </div>
      )}

      {/* 初始化提示 */}
      {isInitializing && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-100 text-blue-900 px-6 py-3 rounded-lg shadow-lg border border-blue-200">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-900"></div>
            <span>正在初始化你的知识库...</span>
          </div>
        </div>
      )}

      {/* 左侧固定侧边栏 - 仅在登录后显示 */}
      {isAuthenticated && (
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          selectedTag={selectedTag}
          onTagClick={handleTagClick}
          onGlobalSearch={handleGlobalSearch}
          knowledgeItems={knowledgeItems}
        />
      )}

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col">
        {isAuthenticated && activeTab !== 'random' && activeTab !== 'trash' && !isLoading && !error && (
          <QuickCapture onAddCard={handleAddNewCard} />
        )}

        {renderMainContent()}
      </div>

      {/* 每日随机漫步浮窗 - 仅在登录后显示 */}
      {isAuthenticated && (
        <RandomWalkModal
          isOpen={showRandomModal}
          onClose={handleCloseRandomModal}
          notes={knowledgeItems}
          onViewOriginal={(note) => {
            setShowRandomModal(false)
            handleCardClick(note)
          }}
        />
      )}

      {/* 详情抽屉 - 仅在登录后显示 */}
      {isAuthenticated && (
        <DetailDrawer
          isOpen={showDetailDrawer}
          onClose={handleCloseDetailDrawer}
          card={selectedCard}
          onDelete={handleDeleteCard}
          onUpdate={handleUpdateNote}
        />
      )}

      {/* 用户信息和登出按钮 - 仅在登录后显示 */}
      {isAuthenticated && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-amber-900">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                  {user?.email || '用户'}
                </p>
                <p className="text-xs text-gray-500">
                  邮箱登录
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="退出登录"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 认证模态框 - 仅在未认证时显示 */}
      {showAuthModal && !isAuthenticated && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => {}} // 不允许关闭，必须登录
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  )
}

export default Index
