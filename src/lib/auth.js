import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'

/**
 * 认证 Hook - 基于 Supabase Auth，仅支持邮箱登录
 */
export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState(null)
  const [loginMethod, setLoginMethod] = useState(null)

  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    const initAuth = async () => {
      try {
        // 获取当前会话
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError && mountedRef.current) {
          setError(sessionError.message)
        }

        if (!mountedRef.current) return

        if (session?.user) {
          setUser(session.user)
          setLoginMethod('email')
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err.message)
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false)
          setIsInitialized(true)
        }
      }
    }

    // 设置认证状态监听器
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        setLoginMethod('email')
        setError(null)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setLoginMethod(null)
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user)
      }
    })

    initAuth()

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [])

  // 邮箱 + 密码登录
  const emailLogin = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  // 发送邮箱验证码（注册 / 首次登录）
  const sendCode = useCallback(async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true }
    })
    if (error) throw error
  }, [])

  // 校验验证码并（可选）设置密码
  const emailRegister = useCallback(async (email, password, code) => {
    let verifyResult = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email'
    })
    if (verifyResult.error) {
      verifyResult = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'signup'
      })
    }
    if (verifyResult.error) throw verifyResult.error

    if (password) {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
    }
  }, [])

  // 登出
  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setLoginMethod(null)
  }, [])

  return {
    user,
    isLoading,
    isInitialized,
    isAuthenticated: !!user,
    loginMethod,
    error,
    emailLogin,
    emailRegister,
    sendCode,
    logout
  }
}
