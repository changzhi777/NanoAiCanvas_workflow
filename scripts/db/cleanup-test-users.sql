-- scripts/db/cleanup-test-users.sql
-- =============================================================================
-- 清空测试用户及其全部关联数据（动态扫描所有 FK，避免漏表）
-- =============================================================================
--
-- 用途：e2e/test 用户一键清理，常用于跑完 Playwright/Cypress 后的环境复位
--
-- 用法：
--   # 生产环境（谨慎！）
--   PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f cleanup-test-users.sql
--
--   # 可选：自定义匹配前缀（默认 e2e_）
--   psql -v prefix='testuser\_%' -f cleanup-test-users.sql
--
--   # dry-run 模式（只打印不删）
--   psql -v dry_run='true' -f cleanup-test-users.sql
--
--   # 或者改文件顶部 \set prefix '...' / \set dry_run 'true'
--
-- 清理顺序（关键）：
--   1. points_transactions（FK → points_accounts，不直接 FK users）
--   2. 动态扫描所有 FK → users 的子表（清空直接关联）
--   3. 孤儿 conversations（conversation_members 删完后的空对话）
--   4. users 自身
--
-- 已知覆盖（24 张直接 FK 表 + 2 张间接表）：
--   agent_execution_logs, agent_memories, agent_sessions, agent_tasks,
--   assets, categories, conversation_members, folders, messages, notifications,
--   operations, points_accounts, recharge_records, skill_promotion_requests,
--   system_skills, tags, team_assets, team_members, teams(×2), templates,
--   tvc_projects, user_skills, workflows, points_transactions, conversations
-- =============================================================================

\set prefix 'e2e\\_%'
\set dry_run 'false'

DO $$
DECLARE
  r RECORD;
  deleted INT;
  prefix TEXT := 'e2e\_%';
  dry_run BOOLEAN := false;
BEGIN
  -- 读取 psql 变量（如果通过 -v 传入）
  BEGIN
    prefix := current_setting('psql.prefix', true);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    dry_run := current_setting('psql.dry_run', true) = 'true';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- fallback：如果 psql 变量没注入（NULL），用文件顶部 \set 默认值
  IF prefix IS NULL THEN
    prefix := 'e2e\_%';
  END IF;
  IF dry_run IS NULL THEN
    dry_run := false;
  END IF;

  RAISE NOTICE '清理 prefix=%, dry_run=%', prefix, dry_run;

  IF dry_run THEN
    RAISE NOTICE '>>> DRY-RUN：仅打印将删除的行数 <<<';
  END IF;

  -- 第一步：先删 points_transactions（FK → points_accounts，不直接 FK users）
  SELECT COUNT(*) INTO deleted FROM points_transactions pt
  JOIN points_accounts pa ON pa.id = pt.account_id
  JOIN users u ON u.id = pa.user_id
  WHERE u.username LIKE prefix;
  RAISE NOTICE '[1/4] points_transactions 将删 % 行', deleted;
  IF NOT dry_run THEN
    DELETE FROM points_transactions pt
    USING points_accounts pa, users u
    WHERE pt.account_id = pa.id AND pa.user_id = u.id AND u.username LIKE prefix;
    GET DIAGNOSTICS deleted = ROW_COUNT;
    RAISE NOTICE '       实际删除 % 行', deleted;
  END IF;

  -- 第二步：动态扫描所有 FK → users 的子表，清空直接关联
  FOR r IN
    SELECT conrelid::regclass::text AS tbl, a.attname AS col
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.confrelid = 'users'::regclass AND c.contype = 'f'
    ORDER BY 1
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM %s WHERE %I IN (SELECT id FROM users WHERE username LIKE %L)',
                   r.tbl, r.col, prefix) INTO deleted;
    IF deleted > 0 THEN
      RAISE NOTICE '[2/4] % 将删 % 行 (列 %)', r.tbl, deleted, r.col;
      IF NOT dry_run THEN
        EXECUTE format('DELETE FROM %s WHERE %I IN (SELECT id FROM users WHERE username LIKE %L)',
                       r.tbl, r.col, prefix);
        GET DIAGNOSTICS deleted = ROW_COUNT;
        RAISE NOTICE '       实际删除 % 行', deleted;
      END IF;
    END IF;
  END LOOP;

  -- 第三步：孤儿 conversations（conversation_members 删完后的空对话）
  SELECT COUNT(*) INTO deleted FROM conversations c
  WHERE NOT EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = c.id);
  IF deleted > 0 THEN
    RAISE NOTICE '[3/4] conversations 孤儿 将删 % 行', deleted;
    IF NOT dry_run THEN
      DELETE FROM conversations c
      WHERE NOT EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = c.id);
      GET DIAGNOSTICS deleted = ROW_COUNT;
      RAISE NOTICE '       实际删除 % 行', deleted;
    END IF;
  END IF;

  -- 第四步：删 user 自身
  SELECT COUNT(*) INTO deleted FROM users WHERE username LIKE prefix;
  RAISE NOTICE '[4/4] users 将删 % 行', deleted;
  IF NOT dry_run AND deleted > 0 THEN
    DELETE FROM users WHERE username LIKE prefix;
    GET DIAGNOSTICS deleted = ROW_COUNT;
    RAISE NOTICE '       实际删除 % 行', deleted;
  END IF;

  IF dry_run THEN
    RAISE NOTICE '>>> DRY-RUN 完成，未做任何变更 <<<';
  ELSE
    RAISE NOTICE '>>> 清理完成 <<<';
  END IF;
END $$;
