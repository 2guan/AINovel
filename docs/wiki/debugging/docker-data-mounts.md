# Docker 数据挂载边界

## Background

SQLite Docker 部署需要让数据库、生成图片和可选向量库数据离开容器生命周期。否则重建镜像或重建容器时，用户容易误以为项目数据丢失。

## Current Rule

- 主 `docker-compose.yml` 默认把 API 的 `/app/storage` 挂载到项目目录 `./AINovelData/storage`。
- SQLite 数据库位于 `./AINovelData/storage/ai-novel.db`。
- 本地图片资产默认位于 `./AINovelData/storage/generated-images/`。
- 可选 Qdrant compose 把 `/qdrant/storage` 挂载到 `./AINovelData/qdrant`。
- `AINovelData/` 必须被 `.gitignore` 忽略，不能提交数据库、图片或向量库文件。

## Migration Notes

从旧 named volume 迁移到 `./AINovelData/` 时，必须先停止服务，再复制数据，确认目标文件存在后再启动新挂载：

1. `docker compose down`
2. 创建 `AINovelData/storage` 和需要的子目录，Linux 服务器建议直接指定容器用户权限：`install -d -o 1000 -g 1000 AINovelData/storage AINovelData/qdrant`。
3. 从旧 Docker volume 复制 `/app/storage` 内容到 `./AINovelData/storage`。
4. 检查 `./AINovelData/storage/ai-novel.db` 存在且大小不为 0。
5. 设置 Linux 写权限，通常使用 `chown -R 1000:1000 ./AINovelData`。从 Docker named volume 复制出的文件常常归属 root，复制后必须再次执行。
6. `docker compose up -d --build`

不要在没有备份和存在性检查的情况下删除旧 named volume。

## Failure Modes

- 直接切换到 bind mount 但没有复制旧 volume：服务会用空目录启动，看起来像新数据库。
- 宿主机目录由 root 创建但未授权给容器用户：API 容器可能无法写入 SQLite、WAL 文件或生成图片。
- `docker compose logs` 出现 `unable to open database file: /app/storage/ai-novel.db`：优先检查 `AINovelData/storage` 是否存在、是否包含 `ai-novel.db`、目录和文件是否允许 uid 1000 写入。
- 把 `AINovelData/` 提交到 Git：会泄露数据库、图片和用户配置。
