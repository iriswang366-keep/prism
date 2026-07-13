-- ============================================================================
-- 折光 (Prism) 数据库初始化脚本 —— 唯一权威版本
-- ----------------------------------------------------------------------------
-- 说明：
--   本文件整合并取代了此前 5 个相互冲突的迁移脚本
--   （add_user_id_to_notes / enable_anon_access / fix_db_rls /
--    fix_notes_rls / update_user_schema_for_oauth）。
--   仅保留一张 notes 表 + 基于 auth.uid() = user_id 的严格行级隔离，
--   删除了遗留的 db / users 自定义 OAuth 表（微信/QQ 已弃用，改用 Supabase Auth）。
--
-- 使用方法：
--   在 Supabase 控制台 → SQL Editor 中，将本文件内容整段粘贴执行一次即可。
--   脚本是幂等的，重复执行不会报错。
-- ============================================================================

-- 1. 清理遗留的自定义 OAuth 表（如果存在）
DROP TABLE IF EXISTS "db" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- 2. 创建 notes 表（若不存在）
CREATE TABLE IF NOT EXISTS "notes" (
  "id"         BIGSERIAL PRIMARY KEY,
  "user_id"    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "title"      TEXT,
  "summary"    TEXT,
  "tags"       TEXT[] DEFAULT '{}',
  "date"       TIMESTAMPTZ DEFAULT now(),
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

-- 3. 兼容旧库：若 notes 表已存在但缺少 user_id 字段，则补上
ALTER TABLE "notes"
  ADD COLUMN IF NOT EXISTS "user_id" UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. 索引，优化「按用户查询 + 按时间排序」
CREATE INDEX IF NOT EXISTS "idx_notes_user_id" ON "notes"("user_id");
CREATE INDEX IF NOT EXISTS "idx_notes_created_at" ON "notes"("created_at" DESC);

-- 5. 启用行级安全（RLS）
ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;

-- 6. 清理所有历史策略，避免同名或宽松策略残留
DROP POLICY IF EXISTS "允许所有人查询" ON "notes";
DROP POLICY IF EXISTS "允许所有人新增" ON "notes";
DROP POLICY IF EXISTS "允许所有人修改" ON "notes";
DROP POLICY IF EXISTS "允许所有人删除" ON "notes";
DROP POLICY IF EXISTS "仅登录用户可查询数据" ON "notes";
DROP POLICY IF EXISTS "仅登录用户可新增数据" ON "notes";
DROP POLICY IF EXISTS "仅登录用户可修改数据" ON "notes";
DROP POLICY IF EXISTS "仅登录用户可删除数据" ON "notes";
DROP POLICY IF EXISTS "用户只能查询自己的笔记" ON "notes";
DROP POLICY IF EXISTS "用户只能新增自己的笔记" ON "notes";
DROP POLICY IF EXISTS "用户只能修改自己的笔记" ON "notes";
DROP POLICY IF EXISTS "用户只能删除自己的笔记" ON "notes";

-- 7. 权威策略：每个登录用户只能读写属于自己的笔记
CREATE POLICY "用户只能查询自己的笔记"
  ON "notes" FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "用户只能新增自己的笔记"
  ON "notes" FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户只能修改自己的笔记"
  ON "notes" FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户只能删除自己的笔记"
  ON "notes" FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 8. updated_at 自动维护触发器
CREATE OR REPLACE FUNCTION update_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notes_updated_at ON "notes";
CREATE TRIGGER trg_notes_updated_at
  BEFORE UPDATE ON "notes"
  FOR EACH ROW
  EXECUTE FUNCTION update_notes_updated_at();

COMMENT ON TABLE "notes" IS '折光个人知识库笔记表，基于 auth.uid() = user_id 做严格行级隔离';
