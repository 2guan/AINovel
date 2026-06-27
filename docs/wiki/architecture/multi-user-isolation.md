# 多用户与数据隔离边界

## Background

SQLite 版本从单用户创作工作台扩展为多人共用工作台后，系统必须同时满足两类目标：

- 新用户注册后先等待管理员审核，避免未授权账号进入创作链路。
- 作家之间的小说、资产、知识库、短剧、漫画和个人模型配置互相隔离，降低误读、误改和上下文串线风险。

这个边界优先服务新手完成长篇小说：用户登录后看到的是自己的项目和素材，不需要理解租户、命名空间或数据库隔离细节。

## Decision

SQLite 多用户版本采用应用层用户归属模型：

- 初始管理员账号固定为 `admin / admin2026`，管理员用户 id 固定为 `admin`。
- 注册用户默认是 `pending` / `pending_review`，后端会阻止其访问除认证相关接口外的所有功能。
- `Novel`、知识库文档、世界样本、基础角色、写法资产、标题库、短剧项目、漫画项目、模型密钥、模型路由等顶层业务表持有 `userId`。
- 普通作家的列表、唯一查询、计数、单条/批量更新删除、创建和 upsert 操作会在 Prisma 请求上下文中自动按当前 `userId` 过滤或写入归属。
- 任务中心和导演跟进中心使用显式任务归属隔离：`GenerationJob`、`NovelWorkflowTask`、`RagIndexJob`、`AgentRun` 持有 `userId`，避免跨用户聚合视图泄露任务状态、恢复入口或跟进动作。
- 对可通过 URL 直接访问的顶层资源，HTTP 路由还要做参数级所有权守卫，例如小说、世界、知识库文档、短剧项目和漫画项目。
- 管理员可以查看所有小说，并在小说卡片看到作者信息；作家只看到自己的小说。
- 提示词管理和成员管理只允许管理员访问。

## Current Rule

模型配置使用“个人覆盖优先，管理员默认兜底”的规则：

- 管理员配置的模型密钥、模型路由和当前模型选择是全局默认。
- 作家保存自己的模型密钥、模型路由或当前模型选择后，只覆盖自己的调用。
- 没有登录上下文的后台任务继续使用管理员默认配置。

数据隔离的维护优先级：

1. 新增创作或资产顶层表时，默认增加 `userId` 并纳入 Prisma 请求级隔离模型集合。
2. 新增任务中心、恢复中心、导演跟进中心可直接聚合或直接操作的任务表时，必须持有 `userId` 或通过已隔离父资源做强制过滤；优先使用显式 `userId`，避免聚合列表先泄露再过滤。
3. 新增以资源 id 直接读取、更新或删除的 HTTP 入口时，必须加参数级所有权守卫；守卫用于提供更清晰的 HTTP 错误和入口保护，不能替代 Prisma 请求级隔离。
4. 子表优先通过父资源所有权间接隔离；只有需要跨父资源直接列表或直接访问时，才额外增加自身 `userId`。
5. 管理员功能不能只靠前端隐藏，必须有后端 `requireAdmin` 或等价权限守卫。

## Failure Modes

- 只给列表加过滤但没有参数守卫：用户可能通过已知 id 直接打开别人的资源。
- 只在前端隐藏菜单：用户仍可直接请求后端接口。
- 给个人模型配置写入全局 key：一个作家的模型设置会影响所有用户。
- 后台任务没有登录上下文时读取普通用户配置：会让任务行为依赖启动者之外的随机上下文。后台默认应使用管理员配置，除非任务模型显式保存了所属用户。

## Related Modules

- `server/src/auth/`
- `server/src/middleware/auth.ts`
- `server/src/db/prisma.ts`
- `server/src/llm/modelRouter.ts`
- `server/src/services/settings/secretStore/`
- `server/src/services/task/`
- `server/src/modules/novel/http/novel.ts`
- `server/src/modules/setup/world/http/index.ts`
- `server/src/routes/knowledge.ts`
- `client/src/auth/`
- `client/src/pages/users/UserManagementPage.tsx`
