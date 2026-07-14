import React, { useState, useEffect, useMemo } from 'react';
import { Home, BookOpen, Lightbulb, Heart, Sparkles, Menu, X, Search, Tag, Trash2 } from 'lucide-react';
import { useResizable } from '../useResizable'

const Sidebar = ({ activeTab, onTabChange, selectedTag, onTagClick, onGlobalSearch, knowledgeItems = [] }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { width, startResizing } = useResizable({ defaultWidth: 256, minWidth: 200, maxWidth: 480 });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const navigationItems = [
    { id: 'home', icon: Home, label: '灵感主页' },
    { id: 'graph', icon: BookOpen, label: '知识图谱' },
    { id: 'random', icon: Lightbulb, label: '每日随机漫步' },
    { id: 'favorites', icon: Heart, label: '我的收藏' },
    { id: 'tags', icon: Tag, label: '我的标签' },
    { id: 'trash', icon: Trash2, label: '回收站' }
  ];

  // 动态计算高频标签 - 只基于真实笔记的标签词频统计，不再用任何写死的默认标签补齐
  const frequentTags = useMemo(() => {
    if (!knowledgeItems || knowledgeItems.length === 0) {
      return [];
    }

    // 统计标签出现次数
    const tagCountMap = {};
    knowledgeItems.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => {
          if (tag) {
            tagCountMap[tag] = (tagCountMap[tag] || 0) + 1;
          }
        });
      }
    });

    // 按出现次数降序，取前 5 个真实标签
    return Object.entries(tagCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
  }, [knowledgeItems]);

  const handleTagClick = (tag) => {
    onTagClick(tag);
    if (isMobile) {
      setIsOpen(false);
    }
    if (activeTab !== 'home') {
      onTabChange('home');
    }
  };

  const handleTabChange = (tabId) => {
    onTabChange(tabId);
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (onGlobalSearch) {
      onGlobalSearch(value);
    }
  };

  const sidebarContent = (
    <>
      {/* Logo区域 */}
      <div className="p-5 border-b border-amber-900/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 bg-amber-900 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-amber-900">折光 (Prism)</h1>
          </div>
          {isMobile && (
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-amber-900 hover:bg-amber-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 全局搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="搜索笔记、标签或内容..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm transition-all"
          />
        </div>
      </div>

      {/* 导航菜单 */}
      <div className="flex-1 py-5">
        <nav className="space-y-1.5 px-3">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 ${
                activeTab === item.id
                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                  : 'text-amber-900/70 hover:bg-amber-50'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* 高频标签 - 动态统计 */}
      <div className="p-3 border-t border-amber-900/10">
        <h3 className="text-xs font-semibold text-amber-900/60 mb-2.5">高频唤醒标签</h3>
        <div className="space-y-1.5">
          {frequentTags.length === 0 ? (
            <p className="px-2.5 py-1.5 text-xs text-amber-900/40">暂无标签，记笔记时添加吧</p>
          ) : (
            frequentTags.map((tag, index) => (
              <button
                key={index}
                onClick={() => handleTagClick(tag)}
                className={`block w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                  selectedTag === tag
                    ? 'bg-amber-100 text-amber-900 font-medium'
                    : 'text-amber-900/70 hover:bg-amber-50'
                }`}
              >
                #{tag}
              </button>
            ))
          )}
        </div>

        {/* 查看全部标签入口 - 标签超过 5 个时提示还有更多 */}
        {frequentTags.length > 0 && (
          <button
            onClick={() => handleTabChange('tags')}
            className="mt-2.5 w-full text-left px-2.5 py-1.5 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-lg transition-colors font-medium"
          >
            查看全部标签 →
          </button>
        )}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        {/* 移动端菜单按钮 */}
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-amber-900/20"
        >
          <Menu className="w-5 h-5 text-amber-900" />
        </button>

        {/* 移动端侧边栏 */}
        {isOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-2xl">
              {sidebarContent}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div
      className="relative bg-white border-r border-amber-900/20 h-screen sticky top-0 flex flex-col shadow-xl shrink-0"
      style={{ width: `${width}px` }}
    >
      {sidebarContent}

      {/* 右边缘拖拽把手 */}
      <div
        onMouseDown={startResizing}
        onDoubleClick={() => {
          localStorage.removeItem('sidebarWidth')
          window.location.reload()
        }}
        className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-amber-300 transition-colors z-10"
      />
    </div>
  );
};


export default Sidebar;