import { createClient } from '@supabase/supabase-js';

// 从环境变量读取 Supabase 配置。
// 本地开发：在项目根目录创建 .env 文件并填入以下两个变量。
// 线上部署（Vercel / Netlify 等）：在平台的环境变量设置中配置同名变量。
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '缺少 Supabase 配置：请在 .env 中设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY'
  );
}

// 使用方式：
// import { supabase } from "@/integrations/supabase/client";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
