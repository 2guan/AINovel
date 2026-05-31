# 多用户租户数据隔离与认证架构设计 (multi-user-tenant-isolation.md)

本页面记录了系统从“单用户本地工作台”升级为“支持多团队、多成员协作的 SaaS 化 SaaS 级系统”时的架构设计决策、多租户隔离规范与防越权规则。

---

## 1. 业务背景 (Background)
系统原设计为单用户本地运行，所有数据库记录（小说、大纲、世界设定、知识文档、风格库等）处于无归属状态。在改造为多用户版本时，我们需要确保：
* 极低的部署门槛（特别是支持 Docker ARM64 架构服务器部署，避免 native C++ 编译锁死）。
* 坚固的**多租户隔离（Tenant Isolation）**：除默认系统基础数据资产外，每个用户的创作资源完全物理隔离，不可越权读取或篡改。
* **上帝视角（God-eye View）**：超级管理员（admin）能够纵览并管理所有用户的数据资产、后台队列与自动化流。
* **低认知负载的新人审批流**：新注册用户处于 pending 状态，必须经管理员激活方可进入创作主页。

---

## 2. 核心架构决策 (Decisions)

### 2.1 基础依赖与密码安全
* **决策：** 选用 **`bcryptjs`**（纯 JavaScript 实现的哈希库）而非 C++ 绑定版的 `bcrypt`。
* **原因：** ARM64 架构（例如 M 系列芯片、ARM 服务器、部分云端 Alpine 镜像）在编译原生 C++ bcrypt 时经常面临 make/g++ 环境缺失导致容器构建崩溃的问题。`bcryptjs` 提供 100% 编译通过率与平台一致性，牺牲微小的计算性能是完全值得的。
* **令牌协议：** 选用标准 **JWT Bearer Token** 签署（expiresIn: 7d），在每次请求的 HTTP Request Header `Authorization` 中挂载。

### 2.2 混合租户数据隔离模型
我们将系统数据分为两类：

1. **共享基础资产：**
   * 包括 `AppSetting`（全局系统配置）和 `userId` 为 `null` 的 `NovelGenre`（题材）、`NovelStoryMode`（推进模式）、`StyleProfile`（写作风格）。
   * **隔离规则：** 普通用户只能读取使用共享资源，**绝不允许修改/删除**共享资源。仅 `admin` 能够对其进行维护升级。
2. **专属创作资产：**
   * 包括 `Novel`、`World`、`KnowledgeDocument` 以及其下的所有子集（`Chapter`、`Character`、`PlotBeat` 等）。
   * **隔离规则：** 普通用户名下的小说数据对其他用户完全不可见。用户可以创建并修改自己名下的世界观和自定义知识库文档，与他人完全隔离。

---

## 3. 防越权网关过滤规范 (Routing & Gateway Controls)

为了将改动对 LangGraph 后台自动管道和 Deep Core 业务服务的侵入性降到最低，我们在 HTTP 路由网关层实施了**防越权拦截（Access Interceptors）**：

### 3.1 路由层三道防火墙
* **`checkNovelAccess`** 拦截器：
  * 对所有包含 `/api/novels/:id` 或 `:novelId` 的参数边界自动触发。
  * 根据 `req.user.role === 'admin'` 直接放行，否则在数据库中比对该 Novel 的 `userId` 是否与 `req.user.id` 吻合。若不吻合直接返回 `403 Forbidden`。
* **`checkWorldAccess`** 拦截器：
  * 对所有包含 `/api/worlds/:id` 的路由进行拦截。
  * **读请求（GET）：** 允许读取自己名下或 `userId === null`（共享预设）的世界设定。
  * **写请求（POST/PUT/DELETE）：** 仅当 `world.userId === req.user.id` 时放行。
* **`checkKnowledgeAccess`** 拦截器：
  * 对 `/api/knowledge/documents/:id` 进行拦截，规则与世界设定完全一致。

### 3.2 服务层透传
* 当列表查询（如 `listNovels`，`listWorlds`，`listDocuments`）不具备单体 ID 拦截条件时，必须将当前请求上下文的 `userId` 和 `userRole` 作为参数透传给服务层（如 `WorldService.ts`）：
  ```typescript
  async listWorlds(userId?: string, userRole?: string) {
    const whereClause = userRole === "admin" ? {} : {
      OR: [
        { userId: userId || "" },
        { userId: null },
      ],
    };
    return prisma.world.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" },
    });
  }
  ```

---

## 4. 常见失效模式与防御 (Failure Modes & Defenses)

### 4.1 漏拦参数越权
* **失效现象：** 开发者在新增子表路由（例如 `router.put("/novels/:id/custom-property")`）时，忘记手动绑定拦截器，导致普通用户可以通过拼接 ID 绕过验证修改他人小说。
* **防御机制：**
  * 在小说模块总路由 [novel.ts (http controller)](file:///d:/Code/AINovel/server/src/modules/novel/http/novel.ts) 的参数解析处，挂载全局 `router.use("/:id", checkNovelAccess)`。
  * 任何挂载在 `:id` 之后的子路由将**自动级联继承**该越权拦截器，从根本上杜绝了人工遗漏的问题。

### 4.2 缓存与异步任务上下文失效
* **失效现象：** LangGraph 等后台任务在后台工作协程中异步运行时，失去了当前的 HTTP Request 对象，无法读取 `req.user`。
* **防御机制：**
  * 异步任务在创建和入队时，已将当前用户的 `userId` 写入 `NovelWorkflowTask` 或 `ImageGenerationTask` 实体。
  * 后台工作进程（Workers）从任务队列抓取任务时，只跟进归属任务，所有的中间缓存数据均以实体形式写入数据库或带路径的隔离缓存，防止上下文错乱。
