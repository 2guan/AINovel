# SQLite 迁移漏表排查规则

## Background

SQLite 运行版本依赖 `server/src/prisma/migrations.sqlite/` 执行增量建表。Prisma schema 中已经存在的 model 如果没有对应 SQLite migration，Docker 启动时会显示 “No pending migrations”，但运行到相关功能时仍会报 `The table main.<TableName> does not exist in the current database`。

## Diagnosis

出现这种日志时，先同时检查三处：

- `server/src/prisma/schema.sqlite.prisma` 是否已有对应 `model`。
- `server/src/prisma/migrations.sqlite/**/migration.sql` 是否有 `CREATE TABLE` 或 `ALTER TABLE`。
- 运行日志是否来自只读兼容路径，还是会影响写入和后续上下文质量。

如果 schema 有 model、SQLite migrations 没有建表 SQL，就不是用户数据损坏，也不应重置数据库。正确处理是补新的 SQLite migration。

## Current Rule

- 新的 SQLite 补表 migration 应优先使用 `CREATE TABLE IF NOT EXISTS` 和 `CREATE INDEX IF NOT EXISTS`，保证已经手动修过的部署也能安全执行。
- 不执行 `prisma migrate reset`、删除数据库、清空表或任何破坏性恢复。
- 如果是已有表补列，需确认 `ALTER TABLE ... ADD COLUMN` 对旧库是否安全；涉及非空列时必须给默认值或使用分阶段迁移。
- Docker 用户修复后只需要拉取代码并重新 `docker compose up -d --build`，启动脚本会应用未执行过的 migration。

## Examples

- `PromptSlotOverride` 缺表会导致提示词槽位覆盖读取失败，部分路径会返回空覆盖，但 Prisma 仍会打印 error 日志。
- `NovelFactEntry` 缺表会导致写章上下文里的 `completedMilestones` 为空，可能削弱后续章节避免重复事件的能力。

## Related Modules

- `server/src/prisma/migrations.sqlite/`
- `server/src/prisma/schema.sqlite.prisma`
- `server/src/prompting/slots/PromptSlotOverrideService.ts`
- `server/src/services/novel/fact/NovelFactService.ts`
- `server/src/services/novel/runtime/GenerationContextAssembler.ts`
