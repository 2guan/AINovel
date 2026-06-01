import "dotenv/config";
import { prisma } from "./prisma";
import { hashPassword } from "../utils/auth";
import {
  ensureSystemResourceStarterData,
  hasSystemResourceBootstrapChanges,
} from "../services/bootstrap/SystemResourceBootstrapService";

async function ensureAdminAndBackfill(): Promise<void> {
  console.log("开始同步用户数据与回填历史归属...");

  // 1. Ensure admin user exists
  let admin = await prisma.user.findUnique({
    where: { username: "admin" },
  });

  if (!admin) {
    const passwordHash = await hashPassword("admin2026");
    admin = await prisma.user.create({
      data: {
        username: "admin",
        passwordHash,
        role: "admin",
      },
    });
    console.log("已成功创建默认管理员账号: admin (密码: admin2026)");
  } else {
    console.log("管理员账号 admin 已存在，无需重复创建。");
  }

  // 2. Backfill existing novels to admin
  const novelsCount = await prisma.novel.updateMany({
    where: { userId: null },
    data: { userId: admin.id },
  });
  if (novelsCount.count > 0) {
    console.log(`成功将 ${novelsCount.count} 部历史小说归属至 admin 账号下。`);
  }

  // 3. Backfill existing worlds to admin
  const worldsCount = await prisma.world.updateMany({
    where: { userId: null },
    data: { userId: admin.id },
  });
  if (worldsCount.count > 0) {
    console.log(`成功将 ${worldsCount.count} 个历史世界设定归属至 admin 账号下。`);
  }

  // 4. Backfill existing knowledge documents to admin
  const docsCount = await prisma.knowledgeDocument.updateMany({
    where: { userId: null },
    data: { userId: admin.id },
  });
  if (docsCount.count > 0) {
    console.log(`成功将 ${docsCount.count} 个历史知识库文档归属至 admin 账号下。`);
  }

  // 5. Backfill existing style profiles to admin
  const stylesCount = await prisma.styleProfile.updateMany({
    where: { userId: null },
    data: { userId: admin.id },
  });
  if (stylesCount.count > 0) {
    console.log(`成功将 ${stylesCount.count} 个历史风格库归属至 admin 账号下。`);
  }

  // 6. Backfill existing workflow tasks and image tasks to admin
  const tasksCount = await prisma.novelWorkflowTask.updateMany({
    where: { userId: null },
    data: { userId: admin.id },
  });
  const imgTasksCount = await prisma.imageGenerationTask.updateMany({
    where: { userId: null },
    data: { userId: admin.id },
  });
  if (tasksCount.count > 0 || imgTasksCount.count > 0) {
    console.log(`成功将 ${tasksCount.count + imgTasksCount.count} 个历史后台任务归属至 admin 账号下。`);
  }

  console.log("用户数据同步与回填历史归属完成。");
}

async function main(): Promise<void> {
  // Enforce admin user creation and historical backfills
  await ensureAdminAndBackfill();

  const report = await ensureSystemResourceStarterData({ mode: "sync_existing" });

  if (hasSystemResourceBootstrapChanges(report)) {
    console.log("系统内置创作资源同步完成。", report);
    return;
  }

  console.log("系统内置创作资源已是最新，无需同步。");
}

main()
  .catch((error) => {
    console.error("种子数据写入失败：", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
