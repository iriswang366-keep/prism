import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Clock, FileText, Tag, RefreshCw, Hash, ZoomIn, ZoomOut } from 'lucide-react'
import ForceGraph2D from 'react-force-graph-2d'

const KnowledgeGraph = ({ knowledgeItems = [], onNoteClick }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [hoveredNode, setHoveredNode] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [highlightNodes, setHighlightNodes] = useState(new Set())
  const [highlightLinks, setHighlightLinks] = useState(new Set())
  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const [graphVersion, setGraphVersion] = useState(0)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const fgRef = useRef()
  const containerRef = useRef()

  // 提取纯文本摘要的辅助函数
  const extractPlainText = (htmlContent, maxLength = 150) => {
    if (!htmlContent) return '暂无摘要'
    let plainText = htmlContent.replace(/<[^>]*>/g, '')
    const textarea = document.createElement('textarea')
    textarea.innerHTML = plainText
    plainText = textarea.value
    plainText = plainText.replace(/\s+/g, ' ').trim()
    return plainText.length > maxLength ? plainText.substring(0, maxLength) + '...' : plainText
  }

  // 计算标签之间的关联强度
  const calculateTagRelations = useCallback((notes) => {
    const tagRelations = new Map() // 标签对 -> 共同出现次数
    const tagNotes = new Map() // 标签 -> 包含该标签的笔记ID数组

    // 第一步：建立标签到笔记的映射
    notes.forEach(note => {
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach(tag => {
          if (!tag) return
          if (!tagNotes.has(tag)) {
            tagNotes.set(tag, [])
          }
          tagNotes.get(tag).push(note.id)
        })
      }
    })

    // 第二步：计算标签共现关系
    // 规则1：同一笔记内的标签对
    notes.forEach(note => {
      if (note.tags && note.tags.length >= 2) {
        const validTags = note.tags.filter(t => t)
        for (let i = 0; i < validTags.length; i++) {
          for (let j = i + 1; j < validTags.length; j++) {
            const tagA = validTags[i]
            const tagB = validTags[j]
            const pairKey = tagA < tagB ? `${tagA}|||${tagB}` : `${tagB}|||${tagA}`
            tagRelations.set(pairKey, (tagRelations.get(pairKey) || 0) + 1)
          }
        }
      }
    })

    // 规则2：共享笔记的标签对（跨笔记）
    tagNotes.forEach((notesA, tagA) => {
      tagNotes.forEach((notesB, tagB) => {
        if (tagA >= tagB) return

        const commonNotes = notesA.filter(id => notesB.includes(id))
        if (commonNotes.length > 0) {
          const pairKey = `${tagA}|||${tagB}`
          const currentCount = tagRelations.get(pairKey) || 0
          tagRelations.set(pairKey, currentCount + commonNotes.length)
        }
      })
    })

    return { tagRelations, tagNotes }
  }, [])

  // 将笔记数据转换为以标签为核心的复杂关系图谱
  const transformDataToGraph = useCallback((notes) => {
    if (!notes || notes.length === 0) {
      return { nodes: [], links: [] }
    }

    const nodes = []
    const links = []
    const { tagRelations, tagNotes } = calculateTagRelations(notes)
    const tagNodeMap = new Map()

    // 第一步：创建标签节点
    tagNotes.forEach((noteIds, tagName) => {
      const noteCount = noteIds.length
      // 标签节点大小基于笔记数量动态调整（基础15，每篇笔记+4，最大60）
      const nodeSize = Math.min(60, Math.max(15, 15 + noteCount * 4))

      const tagNode = {
        id: `tag-${tagName}`,
        name: tagName,
        type: 'tag',
        val: nodeSize,
        noteCount: noteCount,
        color: '#FDE68A', // 浅黄色背景
        strokeColor: '#F59E0B', // 深琥珀色边框
        icon: '#',
        noteIds: noteIds,
        valOriginal: nodeSize // 保存原始大小用于恢复
      }

      tagNodeMap.set(tagName, tagNode)
      nodes.push(tagNode)
    })

    // 第二步：创建标签-标签连线（基于关联度）
    tagRelations.forEach((strength, pairKey) => {
      const [tagA, tagB] = pairKey.split('|||')
      const tagANode = tagNodeMap.get(tagA)
      const tagBNode = tagNodeMap.get(tagB)

      if (tagANode && tagBNode) {
        // 连线粗细基于关联强度（1-6像素）
        const thickness = Math.min(6, Math.max(1, strength * 0.8))
        links.push({
          source: tagANode.id,
          target: tagBNode.id,
          value: thickness,
          type: 'tag-tag',
          strength: strength,
          color: `rgba(245, 158, 11, ${Math.min(0.9, 0.4 + strength * 0.15)})`
        })
      }
    })

    // 第三步：创建笔记节点并与标签建立连线
    notes.forEach((note) => {
      const noteNodeId = `note-${note.id}`
      const noteNode = {
        id: noteNodeId,
        name: note.title || '无标题笔记',
        type: 'note',
        val: 6, // 笔记节点固定小尺寸
        color: '#E5E7EB', // 浅灰色
        strokeColor: '#9CA3AF', // 深灰色边框
        icon: '📝',
        noteData: note,
        plainSummary: extractPlainText(note.summary),
        valOriginal: 6
      }
      nodes.push(noteNode)

      // 建立笔记与标签的连线
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach(tag => {
          if (tag && tagNodeMap.has(tag)) {
            links.push({
              source: noteNodeId,
              target: `tag-${tag}`,
              value: 0.8, // 笔记-标签连线较细
              type: 'tag-note',
              color: 'rgba(156, 163, 175, 0.4)'
            })
          }
        })
      }
    })

    return { nodes, links }
  }, [calculateTagRelations])

  // 更新容器尺寸
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({
          width: rect.width - 48,
          height: rect.height - 120
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // 当笔记数据变化时，重新计算图谱数据
  useEffect(() => {
    const newGraphData = transformDataToGraph(knowledgeItems)
    setGraphData(newGraphData)
    setGraphVersion(prev => prev + 1)
    setSelectedNode(null)
    setHighlightNodes(new Set())
    setHighlightLinks(new Set())
  }, [knowledgeItems, transformDataToGraph])

  // 筛选节点（基于搜索词）
  const filteredGraphData = useMemo(() => {
    if (!searchTerm.trim()) return graphData

    const searchLower = searchTerm.toLowerCase()
    const filteredNodes = graphData.nodes.filter(node =>
      node.name.toLowerCase().includes(searchLower) ||
      (node.type === 'note' && node.plainSummary?.toLowerCase().includes(searchLower))
    )

    const filteredNodeIds = new Set(filteredNodes.map(n => n.id))

    const filteredLinks = graphData.links.filter(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source
      const targetId = typeof link.target === 'object' ? link.target.id : link.target
      return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId)
    })

    return { nodes: filteredNodes, links: filteredLinks }
  }, [graphData, searchTerm])

  // 计算高亮节点和连线
  const calculateHighlight = useCallback((node) => {
    if (!node) {
      setHighlightNodes(new Set())
      setHighlightLinks(new Set())
      return
    }

    const connectedNodes = new Set([node.id])
    const connectedLinks = new Set()

    graphData.links.forEach((link, index) => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source
      const targetId = typeof link.target === 'object' ? link.target.id : link.target

      if (sourceId === node.id || targetId === node.id) {
        connectedNodes.add(sourceId)
        connectedNodes.add(targetId)
        connectedLinks.add(index)
      }
    })

    setHighlightNodes(connectedNodes)
    setHighlightLinks(connectedLinks)
  }, [graphData.links])

  // 处理节点悬停
  const handleNodeHover = useCallback((node, event) => {
    setHoveredNode(node)

    if (node && event) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top

        // 防止Tooltip超出边界
        const tooltipWidth = 320
        const tooltipHeight = 200
        let finalX = x + 15
        let finalY = y + 15

        if (finalX + tooltipWidth > rect.width) {
          finalX = x - tooltipWidth - 15
        }
        if (finalY + tooltipHeight > rect.height) {
          finalY = y - tooltipHeight - 15
        }

        setTooltipPos({ x: finalX, y: finalY })
      }
    }

    // 已选中某节点时，hover 不改变高亮，保持选中态的聚焦
    if (!selectedNode) {
      calculateHighlight(node)
    }
  }, [calculateHighlight, selectedNode])

  // 处理节点点击
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node)

    if (node.type === 'tag') {
      // 点击标签节点：高亮该标签下的所有笔记，并重新布局中心
      const connectedNodes = new Set([node.id])
      const connectedNoteIds = []

      graphData.links.forEach((link) => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source
        const targetId = typeof link.target === 'object' ? link.target.id : link.target

        if (sourceId === node.id || targetId === node.id) {
          connectedNodes.add(sourceId)
          connectedNodes.add(targetId)

          const otherId = sourceId === node.id ? targetId : sourceId
          const otherNode = graphData.nodes.find(n => n.id === otherId)
          if (otherNode?.type === 'note') {
            connectedNoteIds.push(otherId)
          }
        }
      })

      setHighlightNodes(connectedNodes)

      // 重新布局中心到该节点
      if (fgRef.current && node.x !== undefined && node.y !== undefined) {
        fgRef.current.centerAt(node.x, node.y, 800)
        fgRef.current.zoom(1.8, 800)
      }
    } else if (node.type === 'note' && node.noteData && onNoteClick) {
      // 点击笔记节点：打开详情抽屉
      onNoteClick(node.noteData)
    }
  }, [graphData.links, graphData.nodes, onNoteClick])

  // 清除选中和高亮状态
  const clearSelection = useCallback(() => {
    setSelectedNode(null)
    setHoveredNode(null)
    setHighlightNodes(new Set())
    setHighlightLinks(new Set())
  }, [])

  // 重置视图
  const handleResetView = useCallback(() => {
    setGraphVersion(prev => prev + 1)
    clearSelection()
    if (fgRef.current) {
      fgRef.current.zoomToFit(600, 50)
    }
  }, [clearSelection])

  // 节点绘制函数 - 只绘制节点和图标，不显示文字
  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const isHighlighted = highlightNodes.has(node.id)
    const isDimmed = highlightNodes.size > 0 && !isHighlighted
    const isHovered = hoveredNode?.id === node.id
    const isSelected = selectedNode?.id === node.id

    const baseRadius = node.val || (node.type === 'tag' ? 20 : 6)
    // 悬停或选中时稍微放大
    const finalRadius = (isHovered || isSelected) ? baseRadius * 1.2 : baseRadius

    // 透明度设置
    ctx.globalAlpha = isDimmed ? 0.15 : (isHovered ? 1 : 0.9)

    // 绘制节点圆形阴影
    if (!isDimmed) {
      ctx.beginPath()
      ctx.arc(node.x + 1, node.y + 1, finalRadius, 0, 2 * Math.PI, false)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
      ctx.fill()
    }

    // 绘制节点圆形主体
    ctx.beginPath()
    ctx.arc(node.x, node.y, finalRadius, 0, 2 * Math.PI, false)
    ctx.fillStyle = node.color
    ctx.fill()

    // 绘制边框
    ctx.lineWidth = isHovered ? 3 / globalScale : (isSelected ? 2.5 : 1.5) / globalScale
    ctx.strokeStyle = isHovered ? '#DC2626' : (isSelected ? '#F59E0B' : node.strokeColor)
    ctx.stroke()

    // 绘制图标（居中）
    ctx.globalAlpha = isDimmed ? 0.2 : 1
    ctx.fillStyle = node.type === 'tag' ? '#92400E' : '#6B7280'
    ctx.font = `${node.type === 'tag' ? 'bold' : 'normal'} ${Math.max(10, finalRadius * 0.7) / globalScale}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const icon = node.type === 'tag' ? '#' : '📝'
    ctx.fillText(icon, node.x, node.y)

    // 绘制笔记数量小徽章（仅标签节点）
    if (node.type === 'tag' && !isDimmed) {
      const badgeRadius = finalRadius * 0.4
      const badgeX = node.x + finalRadius * 0.7
      const badgeY = node.y - finalRadius * 0.7

      ctx.beginPath()
      ctx.arc(badgeX, badgeY, badgeRadius, 0, 2 * Math.PI, false)
      ctx.fillStyle = '#F59E0B'
      ctx.fill()

      ctx.fillStyle = '#FFFFFF'
      ctx.font = `bold ${badgeRadius / globalScale}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const countText = node.noteCount > 9 ? '9+' : node.noteCount.toString()
      ctx.fillText(countText, badgeX, badgeY)
    }

    // 重置透明度
    ctx.globalAlpha = 1
  }, [highlightNodes, hoveredNode, selectedNode])

  // 连线绘制函数
  const linkCanvasObject = useCallback((link, ctx, globalScale) => {
    const start = link.source
    const end = link.target

    const sourceId = typeof link.source === 'object' ? link.source.id : link.source
    const targetId = typeof link.target === 'object' ? link.target.id : link.target

    const isHighlighted = highlightLinks.has(link) ||
                          (highlightNodes.has(sourceId) && highlightNodes.has(targetId))
    const isDimmed = highlightNodes.size > 0 && !isHighlighted

    ctx.globalAlpha = isDimmed ? 0.08 : (isHighlighted ? 1 : 0.5)

    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)

    // 高亮时线条更粗更亮
    const baseWidth = link.value || 1
    ctx.lineWidth = isHighlighted ? baseWidth * 2 / globalScale : baseWidth / globalScale
    ctx.strokeStyle = isHighlighted ? '#F59E0B' : link.color
    ctx.stroke()

    ctx.globalAlpha = 1
  }, [highlightNodes, highlightLinks])

  // 统计信息
  const stats = useMemo(() => {
    const tagCount = graphData.nodes.filter(n => n.type === 'tag').length
    const noteCount = graphData.nodes.filter(n => n.type === 'note').length
    const tagTagLinks = graphData.links.filter(l => l.type === 'tag-tag').length
    const tagNoteLinks = graphData.links.filter(l => l.type === 'tag-note').length
    return { tagCount, noteCount, tagTagLinks, tagNoteLinks }
  }, [graphData])

  // 计算当前选中标签下的所有笔记节点，供左下角面板列出并点击打开
  const selectedTagNotes = useMemo(() => {
    if (!selectedNode || selectedNode.type !== 'tag') return []
    const noteIds = new Set()
    graphData.links.forEach(link => {
      if (link.type !== 'tag-note') return
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source
      const targetId = typeof link.target === 'object' ? link.target.id : link.target
      if (sourceId === selectedNode.id || targetId === selectedNode.id) {
        const otherId = sourceId === selectedNode.id ? targetId : sourceId
        noteIds.add(otherId)
      }
    })
    return graphData.nodes.filter(n => n.type === 'note' && noteIds.has(n.id))
  }, [selectedNode, graphData])

  const hasData = graphData.nodes.length > 0

  return (
    <div ref={containerRef} className="flex-1 p-6 bg-slate-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto h-[calc(100vh-120px)] flex flex-col">
        {/* 页面标题和工具栏 */}
        <div className="mb-4 flex-shrink-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-amber-900 mb-1.5">知识图谱</h2>
              <p className="text-gray-600 text-sm">
                以标签为核心的知识关系网 · {stats.noteCount} 篇笔记 · {stats.tagCount} 个标签 · {stats.tagTagLinks} 条标签关联
              </p>
            </div>

            {/* 工具栏 */}
            <div className="flex items-center space-x-3">
              {/* 搜索框 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="搜索标签或笔记..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm w-48"
                />
              </div>

              {/* 重置视图按钮 */}
              <button
                onClick={handleResetView}
                className="p-2 text-gray-600 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
                title="重置视图"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* 清除筛选 */}
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="flex items-center space-x-1 px-3 py-2 text-sm text-amber-700 hover:text-amber-900 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>清除</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 图谱可视化区域 */}
        <div className="flex-1 bg-white rounded-2xl border border-amber-900/20 shadow-xl overflow-hidden relative min-h-0">
          {hasData ? (
            <>
              <ForceGraph2D
                ref={fgRef}
                key={graphVersion}
                graphData={filteredGraphData}
                nodeCanvasObject={nodeCanvasObject}
                linkCanvasObject={linkCanvasObject}
                onNodeHover={handleNodeHover}
                onNodeClick={handleNodeClick}
                onBackgroundClick={clearSelection}
                nodeRelSize={1}
                linkDirectionalArrowLength={0}
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.25}
                warmupTicks={100}
                cooldownTicks={60}
                enableZoomInteraction={true}
                enablePanInteraction={true}
                enableNodeDrag={true}
                minZoom={0.2}
                maxZoom={8}
                backgroundColor="#ffffff"
                width={dimensions.width}
                height={dimensions.height}
              />

              {/* Tooltip 浮窗 - 标签节点（悬停时的快速预览，不再依赖它做点击） */}
              <AnimatePresence>
                {hoveredNode && hoveredNode.type === 'tag' && !selectedNode && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: 10 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute z-50 pointer-events-none"
                    style={{
                      left: tooltipPos.x,
                      top: tooltipPos.y,
                      maxWidth: '280px'
                    }}
                  >
                    <div className="bg-white rounded-xl border-2 border-amber-300 p-4 shadow-2xl">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-lg">
                          <Hash className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-amber-900 text-lg">#{hoveredNode.name}</h3>
                          <p className="text-xs text-amber-600 font-medium">标签节点</p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-amber-100">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">包含笔记</span>
                          <span className="text-lg font-bold text-amber-700">{hoveredNode.noteCount} 篇</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">关联标签</span>
                          <span className="text-sm font-medium text-gray-800">
                            {graphData.links.filter(l => {
                              const sId = typeof l.source === 'object' ? l.source.id : l.source
                              const tId = typeof l.target === 'object' ? l.target.id : l.target
                              return (sId === hoveredNode.id || tId === hoveredNode.id) && l.type === 'tag-tag'
                            }).length} 个
                          </span>
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-amber-600 text-center font-medium">
                        点击标签查看相关笔记 →
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tooltip 浮窗 - 笔记节点 */}
              <AnimatePresence>
                {hoveredNode && hoveredNode.type === 'note' && !selectedNode && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: 10 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute z-50 pointer-events-none"
                    style={{
                      left: tooltipPos.x,
                      top: tooltipPos.y,
                      maxWidth: '320px'
                    }}
                  >
                    <div className="bg-white rounded-xl border-2 border-gray-200 p-4 shadow-2xl">
                      <div className="flex items-start space-x-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 text-base leading-tight line-clamp-2">
                            {hoveredNode.name}
                          </h3>
                          <div className="flex items-center mt-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>
                              {hoveredNode.noteData?.date
                                ? new Date(hoveredNode.noteData.date).toLocaleDateString('zh-CN', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })
                                : '未知日期'
                              }
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-600 line-clamp-4 leading-relaxed">
                          {hoveredNode.plainSummary || '暂无摘要'}
                        </p>
                      </div>

                      {hoveredNode.noteData?.tags && hoveredNode.noteData.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {hoveredNode.noteData.tags.slice(0, 4).map((tag, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full border border-amber-100">
                              #{tag}
                            </span>
                          ))}
                          {hoveredNode.noteData.tags.length > 4 && (
                            <span className="px-2 py-0.5 bg-gray-50 text-gray-500 text-xs rounded-full">
                              +{hoveredNode.noteData.tags.length - 4}
                            </span>
                          )}
                        </div>
                      )}

                      <p className="mt-3 text-xs text-amber-600 font-medium text-center">
                        点击查看详情并编辑 →
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <Tag className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">暂无笔记数据</h3>
                <p className="text-gray-500">请先添加一些笔记和标签，知识图谱将自动构建</p>
              </div>
            </div>
          )}

          {/* 图例和操作提示 */}
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 p-4 shadow-lg max-w-[200px]">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">图例说明</h4>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded-full bg-amber-200 border-2 border-amber-500 flex items-center justify-center">
                  <span className="text-amber-800 font-bold text-xs">#</span>
                </div>
                <span className="text-gray-600">标签节点</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-gray-200 border border-gray-400"></div>
                <span className="text-gray-600">笔记节点</span>
              </div>
              <div className="pt-2 border-t border-gray-100 space-y-1.5 text-gray-400">
                <p className="flex items-center"><span className="w-4">🖱️</span> 悬停快速预览</p>
                <p className="flex items-center"><span className="w-4">👆</span> 点击标签列出笔记</p>
                <p className="flex items-center"><span className="w-4">📝</span> 点击笔记编辑</p>
                <p className="flex items-center"><span className="w-4">🔍</span> 滚轮缩放</p>
              </div>
            </div>
          </div>

          {/* 选中节点信息面板（点击触发，常驻显示，可交互） */}
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute bottom-4 left-4 bg-white rounded-xl border-2 border-amber-200 p-4 shadow-2xl w-80 max-w-[calc(100%-2rem)]"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2 min-w-0">
                  {selectedNode.type === 'tag' ? (
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Hash className="w-4 h-4 text-amber-600" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                  <span className="font-semibold text-gray-900 truncate">
                    {selectedNode.type === 'tag' ? `#${selectedNode.name}` : selectedNode.name}
                  </span>
                </div>
                <button
                  onClick={clearSelection}
                  className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 标签：列出该标签下的所有笔记，可点击直接打开 */}
              {selectedNode.type === 'tag' && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    该标签下共 <strong className="text-amber-700">{selectedTagNotes.length}</strong> 篇笔记，点击打开：
                  </p>
                  {selectedTagNotes.length > 0 ? (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      {selectedTagNotes.map((noteNode) => (
                        <button
                          key={noteNode.id}
                          onClick={() => noteNode.noteData && onNoteClick?.(noteNode.noteData)}
                          className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 hover:bg-amber-50 border border-gray-100 hover:border-amber-200 transition-colors group"
                        >
                          <div className="flex items-start space-x-2">
                            <FileText className="w-4 h-4 text-gray-400 group-hover:text-amber-500 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 line-clamp-1">{noteNode.name}</p>
                              <p className="text-xs text-gray-500 line-clamp-1">{noteNode.plainSummary}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">该标签暂无关联笔记</p>
                  )}
                </div>
              )}

              {/* 笔记：直接给打开详情的按钮 */}
              {selectedNode.type === 'note' && (
                <>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    笔记 "{selectedNode.name}" 已选中
                  </p>
                  <button
                    onClick={() => selectedNode.noteData && onNoteClick?.(selectedNode.noteData)}
                    className="w-full mt-2 px-4 py-2 bg-amber-100 text-amber-900 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium flex items-center justify-center space-x-1"
                  >
                    <FileText className="w-4 h-4" />
                    <span>打开笔记详情</span>
                  </button>
                </>
              )}
            </motion.div>
          )}
        </div>

        {/* 底部统计信息 */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500 flex-shrink-0">
          <div className="flex items-center space-x-6">
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-300 border border-amber-500"></span>
              <span>标签: <strong className="text-gray-700">{stats.tagCount}</strong></span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-300 border border-gray-400"></span>
              <span>笔记: <strong className="text-gray-700">{stats.noteCount}</strong></span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-6 h-0.5 bg-amber-400"></span>
              <span>标签关联: <strong className="text-gray-700">{stats.tagTagLinks}</strong></span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-6 h-0.5 bg-gray-300"></span>
              <span>笔记关联: <strong className="text-gray-700">{stats.tagNoteLinks}</strong></span>
            </span>
          </div>
          <div className="text-gray-400 text-xs">
            {hoveredNode
              ? `当前: ${hoveredNode.name.substring(0, 25)}${hoveredNode.name.length > 25 ? '...' : ''}`
              : '悬停节点查看详情'
            }
          </div>
        </div>
      </div>
    </div>
  )
}

export default KnowledgeGraph