-- taskgo スキーマへのアクセス権限を付与
-- Supabase SQL Editor で実行してください

-- 1. スキーマの使用権限
GRANT USAGE ON SCHEMA taskgo TO anon, authenticated, service_role;

-- 2. 全テーブルへの権限
GRANT ALL ON ALL TABLES IN SCHEMA taskgo TO anon, authenticated, service_role;

-- 3. シーケンス（自動採番）への権限
GRANT ALL ON ALL SEQUENCES IN SCHEMA taskgo TO anon, authenticated, service_role;

-- 4. 今後作成されるテーブルにも自動で権限を付与
ALTER DEFAULT PRIVILEGES IN SCHEMA taskgo
  GRANT ALL ON TABLES TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA taskgo
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
