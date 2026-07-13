import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchNotes,
  fetchTrashedNotes,
  createNote,
  updateNote,
  deleteNote,
  restoreNote,
  permanentDeleteNote
} from './api'

// 获取所有笔记（当前用户的、未删除的）
export const useNotes = (enabled = true) => {
  return useQuery({
    queryKey: ['notes'],
    queryFn: fetchNotes,
    enabled: enabled, // 仅在认证后启用
    retry: 1,
    staleTime: 30000, // 30秒内不重新获取
  })
}

// 获取回收站笔记（已软删除、未过期）
export const useTrashedNotes = (enabled = true) => {
  return useQuery({
    queryKey: ['trashedNotes'],
    queryFn: fetchTrashedNotes,
    enabled: enabled,
    retry: 1,
    staleTime: 30000,
  })
}

// 创建笔记
export const useCreateNote = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
    onError: (error) => {
      console.error('创建笔记失败:', error)
    }
  })
}

// 更新笔记
export const useUpdateNote = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }) => updateNote(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
    onError: (error) => {
      console.error('更新笔记失败:', error)
    }
  })
}

// 删除笔记（软删除：移入回收站）
export const useDeleteNote = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => {
      if (!id) {
        throw new Error('删除笔记时ID不能为空')
      }
      return deleteNote(id)
    },
    onSuccess: () => {
      // 笔记列表少一条、回收站多一条，两个缓存都要刷新
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      queryClient.invalidateQueries({ queryKey: ['trashedNotes'] })
    },
    onError: (error) => {
      console.error('删除笔记失败:', error)
    }
  })
}

// 从回收站恢复笔记
export const useRestoreNote = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => {
      if (!id) {
        throw new Error('恢复笔记时ID不能为空')
      }
      return restoreNote(id)
    },
    onSuccess: () => {
      // 回收站少一条、笔记列表多一条
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      queryClient.invalidateQueries({ queryKey: ['trashedNotes'] })
    },
    onError: (error) => {
      console.error('恢复笔记失败:', error)
    }
  })
}

// 彻底删除笔记（物理删除，不可恢复）
export const usePermanentDeleteNote = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => {
      if (!id) {
        throw new Error('彻底删除时ID不能为空')
      }
      return permanentDeleteNote(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trashedNotes'] })
    },
    onError: (error) => {
      console.error('彻底删除笔记失败:', error)
    }
  })
}