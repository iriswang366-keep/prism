import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Mail, 
  Lock, 
  MessageSquare, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

const AuthModal = ({ isOpen, onClose, onSuccess }) => {
  // 主标签：login | register
  const [mainTab, setMainTab] = useState('login')
  
  // 表单数据
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  
  // UI 状态
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [codeCountdown, setCodeCountdown] = useState(0)
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 验证码倒计时
  useEffect(() => {
    if (codeCountdown > 0) {
      const timer = setTimeout(() => setCodeCountdown(c => c - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [codeCountdown])

  // 清理状态
  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen])

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setVerificationCode('')
    setLocalError('')
    setCodeSent(false)
    setCodeCountdown(0)
    setSuccessMessage('')
    setIsLoading(false)
  }

  // ==================== 发送验证码 ====================
  const handleSendCode = async () => {
    if (!email.trim()) {
      setLocalError('请输入邮箱地址')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError('请输入有效的邮箱地址')
      return
    }

    try {
      setLocalError('')
      setIsLoading(true)
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true
        }
      })
      if (error) throw error
      setCodeSent(true)
      setCodeCountdown(60)
      setSuccessMessage(`验证码已发送至 ${email}`)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setLocalError(err.message || '发送验证码失败')
    } finally {
      setIsLoading(false)
    }
  }

  // ==================== 邮箱登录 ====================
  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')

    if (!email.trim() || !password.trim()) {
      setLocalError('请输入邮箱和密码')
      return
    }

    try {
      setIsLoading(true)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      onSuccess?.('email')
    } catch (err) {
      setLocalError(err.message || '登录失败，请检查邮箱和密码')
      setIsLoading(false)
    }
  }

  // ==================== 邮箱注册 ====================
  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')

    if (!email.trim()) {
      setLocalError('请输入邮箱地址')
      return
    }
    if (!verificationCode.trim()) {
      setLocalError('请输入验证码')
      return
    }
    if (!password.trim()) {
      setLocalError('请设置密码')
      return
    }
    if (password.length < 6) {
      setLocalError('密码至少需要6个字符')
      return
    }
    if (password !== confirmPassword) {
      setLocalError('两次输入的密码不一致')
      return
    }

    try {
      setIsLoading(true)
      
      // 兼容老用户登录邮件和新用户注册确认邮件
      let verifyResult = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: 'email'
      })
      if (verifyResult.error) {
        verifyResult = await supabase.auth.verifyOtp({
          email,
          token: verificationCode,
          type: 'signup'
        })
      }
      if (verifyResult.error) throw verifyResult.error
      
      // 设置密码
      if (password) {
        const { error: updateError } = await supabase.auth.updateUser({ password })
        if (updateError) throw updateError
      }
      
      onSuccess?.('email')
    } catch (err) {
      setLocalError(err.message || '注册失败')
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* 背景遮罩 */}
        <motion.div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        
        {/* 模态框内容 */}
        <motion.div 
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
        >
          {/* 顶部装饰条 */}
          <div className="h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />
          
          <div className="p-8">
            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Logo 和标题 */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-7 h-7 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-amber-900 mb-1">
                欢迎来到折光
              </h2>
              <p className="text-gray-500 text-sm">
                使用邮箱登录或注册
              </p>
            </div>

            {/* 主标签切换 */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
              <button
                onClick={() => setMainTab('login')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  mainTab === 'login'
                    ? 'bg-white text-amber-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                密码登录
              </button>
              <button
                onClick={() => setMainTab('register')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  mainTab === 'register'
                    ? 'bg-white text-amber-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                验证码注册
              </button>
            </div>

            {/* 错误提示 */}
            {localError && (
              <motion.div 
                className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600">{localError}</p>
              </motion.div>
            )}

            {/* 成功提示 */}
            {successMessage && (
              <motion.div 
                className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <p className="text-sm text-green-600">{successMessage}</p>
              </motion.div>
            )}

            {/* 登录表单 */}
            {mainTab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    邮箱地址
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    密码
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="请输入密码"
                      className="w-full pl-10 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors flex items-center justify-center space-x-2 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>登录中...</span>
                    </>
                  ) : (
                    <span>立即登录</span>
                  )}
                </button>
              </form>
            )}

            {/* 注册表单 */}
            {mainTab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    邮箱地址
                  </label>
                  <div className="relative flex space-x-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        disabled={isLoading}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={codeCountdown > 0 || isLoading || !email.trim()}
                      className="px-4 py-3 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors disabled:cursor-not-allowed whitespace-nowrap text-sm"
                    >
                      {codeCountdown > 0 ? `${codeCountdown}s` : '获取验证码'}
                    </button>
                  </div>
                </div>

                {codeSent && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      验证码
                    </label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="请输入6位验证码"
                        maxLength={6}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        disabled={isLoading}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      验证码已发送至您的邮箱,10分钟内有效
                    </p>
                  </motion.div>
                )}

                {codeSent && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      设置密码
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="至少6位字符"
                        className="w-full pl-10 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </motion.div>
                )}

                {codeSent && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      确认密码
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="再次输入密码"
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        disabled={isLoading}
                      />
                    </div>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !codeSent}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors flex items-center justify-center space-x-2 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>注册中...</span>
                    </>
                  ) : (
                    <span>完成注册</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default AuthModal
