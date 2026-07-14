import { useState, useCallback, useEffect } from 'react'

// 可拖拽宽度 hook
export const useResizable = ({
  storageKey = 'sidebarWidth',
  defaultWidth = 256,
  minWidth = 200,
  maxWidth = 480,
} = {}) => {
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem(storageKey)
    return saved ? Number(saved) : defaultWidth
  })

  const startResizing = useCallback((e) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width

    const onMouseMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX
      let next = startWidth + delta
      next = Math.max(minWidth, Math.min(maxWidth, next)) // 限制范围
      setWidth(next)
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none' // 拖动时禁止选中文字
  }, [width, minWidth, maxWidth])

  useEffect(() => {
    localStorage.setItem(storageKey, String(width))
  }, [width, storageKey])

  return { width, startResizing }
}