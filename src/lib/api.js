import { supabase } from '@/integrations/supabase/client'

// 回收站保留天数
const TRASH_RETENTION_DAYS = 30

// 获取当前用户ID（从 Supabase Auth）
const getCurrentUserId = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    console.error('获取当前用户失败:', error)
    return null
  }

  return user?.id || null
}

// 获取所有笔记（仅当前用户的、未删除的）
export const fetchNotes = async () => {
  const userId = await getCurrentUserId()
  if (!userId) {
    throw new Error('用户未登录')
  }

  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null) // 只取没被软删除的
    .order('created_at', { ascending: false })

  if (error) {
    console.error('获取笔记错误:', error)
    throw error
  }
  return data
}

// 获取回收站笔记（已软删除、未过期）；顺带清理超过 30 天的
export const fetchTrashedNotes = async () => {
  const userId = await getCurrentUserId()
  if (!userId) {
    throw new Error('用户未登录')
  }

  // 先物理清除已过期（删除时间早于 30 天前）的笔记
  const expireBefore = new Date(
    Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  const { error: purgeError } = await supabase
    .from('notes')
    .delete()
    .eq('user_id', userId)
    .not('deleted_at', 'is', null)
    .lt('deleted_at', expireBefore)

  if (purgeError) {
    // 清理失败不阻断主流程，只记录
    console.error('清理过期回收站笔记失败:', purgeError)
  }

  // 再取剩余的回收站笔记
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  if (error) {
    console.error('获取回收站笔记错误:', error)
    throw error
  }
  return data
}

// 创建新笔记
export const createNote = async (note) => {
  const userId = await getCurrentUserId()
  if (!userId) {
    throw new Error('用户未登录')
  }

  // 确保笔记包含 user_id
  const noteWithUserId = {
    ...note,
    user_id: userId
  }

  const { data, error } = await supabase
    .from('notes')
    .insert([noteWithUserId])
    .select()
    .single()

  if (error) {
    console.error('创建笔记错误:', error)
    throw error
  }
  return data
}

// 更新笔记（仅允许更新自己的笔记）
export const updateNote = async (id, updates) => {
  if (!id) {
    throw new Error('更新失败: ID 不能为空')
  }

  const userId = await getCurrentUserId()
  if (!userId) {
    throw new Error('用户未登录')
  }

  const { data, error } = await supabase
    .from('notes')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('更新笔记错误:', error)
    throw error
  }
  return data
}

// 删除笔记（软删除：写入 deleted_at，移入回收站）
export const deleteNote = async (id) => {
  if (!id) {
    throw new Error('删除失败: ID 不能为空')
  }

  const userId = await getCurrentUserId()
  if (!userId) {
    throw new Error('用户未登录')
  }

  const { data, error } = await supabase
    .from('notes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('删除笔记错误:', error)
    throw error
  }
  return data
}

// 从回收站恢复笔记（清空 deleted_at）
export const restoreNote = async (id) => {
  if (!id) {
    throw new Error('恢复失败: ID 不能为空')
  }

  const userId = await getCurrentUserId()
  if (!userId) {
    throw new Error('用户未登录')
  }

  const { data, error } = await supabase
    .from('notes')
    .update({ deleted_at: null })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('恢复笔记错误:', error)
    throw error
  }
  return data
}

// 彻底删除笔记（从数据库物理删除，不可恢复）
export const permanentDeleteNote = async (id) => {
  if (!id) {
    throw new Error('删除失败: ID 不能为空')
  }

  const userId = await getCurrentUserId()
  if (!userId) {
    throw new Error('用户未登录')
  }

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('彻底删除笔记错误:', error)
    throw error
  }
  return true
}

// 检查用户是否已有笔记（含回收站中的，避免重复初始化示例笔记）
export const checkUserHasNotes = async () => {
  const userId = await getCurrentUserId()
  if (!userId) {
    return false
  }

  const { data, error } = await supabase
    .from('notes')
    .select('id')
    .eq('user_id', userId)
    .limit(1)

  if (error) {
    console.error('检查用户笔记失败:', error)
    return false
  }

  return data && data.length > 0
}