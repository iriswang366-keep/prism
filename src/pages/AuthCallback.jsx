import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'

/**
 * 认证回调处理页面 - 邮箱登录专用
 * 
 * 用于处理邮箱验证等回调
 */
const AuthCallback = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState('processing')
  const [errorMessage, setErrorMessage] = useState('')
  const processedRef = useRef(false)

  useEffect(() => {
    // 防止重复处理
    if (processedRef.current) return
    processedRef.current = true

    const processAuth = async () => {
      try {
        setStatus('processing')

        // 获取当前会话
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        if (session?.user) {
          // 跳转回首页
          window.location.replace('/#/')
        } else {
          throw new Error('未能获取到登录会话')
        }

      } catch (err) {
        console.error('AuthCallback 处理失败:', err)
        setStatus('error')
        setErrorMessage(err.message || '登录失败，请重试')
      }
    }

    processAuth()
  }, [])

  const handleRetry = () => {
    window.location.href = '/#/'
  }

  // 处理中状态
  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-amber-100">
          <div className="h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 rounded-full mb-8" />
          
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-amber-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-amber-600 rounded-full border-t-transparent animate-spin"></div>
            <div className="absolute inset-3 bg-amber-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
          </div>
          
          <h2 className="text-xl font-bold text-amber-900 mb-2">正在完成登录...</h2>
          <p className="text-gray-500 text-sm">请稍候，正在同步您的登录信息</p>
        </div>
      </div>
    )
  }

  // 错误状态
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-amber-100">
        <div className="h-1.5 bg-gradient-to-r from-red-400 via-red-500 to-red-600 rounded-full mb-8" />
        
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        
        <h2 className="text-xl font-bold text-red-600 mb-2">登录失败</h2>
        <p className="text-gray-600 mb-6">{errorMessage || '身份校验失败，请重试'}</p>
        
        <button 
          onClick={handleRetry}
          className="px-6 py-3 bg-amber-100 text-amber-900 rounded-xl hover:bg-amber-200 transition-colors font-medium w-full"
        >
          返回首页重试
        </button>
      </div>
    </div>
  )
}

export default AuthCallback
