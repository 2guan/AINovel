import type {
  TaskOverviewSummary,
  TaskKind,
  TaskStatus,
  UnifiedTaskDetail,
  UnifiedTaskListResponse,
  UnifiedTaskSummary,
} from "@ai-novel/shared/types/task";
import type { DirectorLLMOptions } from "@ai-novel/shared/types/novelDirector";
import { prisma } from "../../db/prisma";
import { AppError } from "../../middleware/errorHandler";
import { getSharedNovelServices } from "../novel/application/sharedNovelServices";
import { AgentRunTaskAdapter } from "./adapters/AgentRunTaskAdapter";
import { BookTaskAdapter } from "./adapters/BookTaskAdapter";
import { KnowledgeTaskAdapter } from "./adapters/KnowledgeTaskAdapter";
import { ImageTaskAdapter } from "./adapters/ImageTaskAdapter";
import { NovelWorkflowTaskAdapter } from "./adapters/NovelWorkflowTaskAdapter";
import { PipelineTaskAdapter } from "./adapters/PipelineTaskAdapter";
import { StyleExtractionTaskAdapter } from "./adapters/StyleExtractionTaskAdapter";
import { collectWorkflowLinkedPipelineIds } from "./taskCenterVisibility";
import {
  compareTaskSummary,
  isAfterCursor,
  normalizeKeyword,
  normalizeLimit,
  parseCursor,
  toCursor,
  type ListTasksFilters,
} from "./taskCenter.shared";
import { getArchivedTaskIdsByKind } from "./taskArchive";

const overviewTaskKinds: TaskKind[] = [
  "book_analysis",
  "novel_pipeline",
  "knowledge_document",
  "image_generation",
  "agent_run",
  "novel_workflow",
  "style_extraction",
];

export class TaskCenterService {
  private readonly novelService = getSharedNovelServices();

  private readonly bookAdapter = new BookTaskAdapter();

  private readonly pipelineAdapter = new PipelineTaskAdapter(this.novelService);

  private readonly knowledgeAdapter = new KnowledgeTaskAdapter();

  private readonly imageAdapter = new ImageTaskAdapter();

  private readonly workflowAdapter = new NovelWorkflowTaskAdapter();

  private readonly agentAdapter = new AgentRunTaskAdapter();

  private readonly styleExtractionAdapter = new StyleExtractionTaskAdapter();

  async getOverview(userId?: string, userRole?: string): Promise<TaskOverviewSummary> {
    const archivedIdsByKind = await getArchivedTaskIdsByKind(overviewTaskKinds);
    const archivedBookIds = archivedIdsByKind.get("book_analysis") ?? [];
    const archivedPipelineIds = archivedIdsByKind.get("novel_pipeline") ?? [];
    const archivedKnowledgeIds = archivedIdsByKind.get("knowledge_document") ?? [];
    const archivedImageIds = archivedIdsByKind.get("image_generation") ?? [];
    const archivedAgentIds = archivedIdsByKind.get("agent_run") ?? [];
    const archivedWorkflowIds = archivedIdsByKind.get("novel_workflow") ?? [];
    const archivedStyleExtractionIds = archivedIdsByKind.get("style_extraction") ?? [];

    const userDocIds = (userRole !== "admin" && userId)
      ? (await prisma.knowledgeDocument.findMany({ where: { userId }, select: { id: true } })).map((d) => d.id)
      : [];
    const userProfileIds = (userRole !== "admin" && userId)
      ? (await prisma.styleProfile.findMany({ where: { userId }, select: { id: true } })).map((p) => p.id)
      : [];

    const [
      bookRows,
      pipelineRows,
      knowledgeRows,
      imageRows,
      agentRows,
      workflowRows,
      styleExtractionRows,
      bookRecoveryCount,
      pipelineRecoveryCount,
      imageRecoveryCount,
      workflowRecoveryCount,
      styleExtractionRecoveryCount,
    ] = await Promise.all([
      prisma.bookAnalysis.groupBy({
        by: ["status"],
        where: {
          status: { in: ["queued", "running", "succeeded", "failed", "cancelled"] },
          ...(archivedBookIds.length ? { id: { notIn: archivedBookIds } } : {}),
          ...(userRole !== "admin" && userId ? { document: { userId } } : {}),
        },
        _count: { _all: true },
      }),
      prisma.generationJob.groupBy({
        by: ["status"],
        where: {
          ...(archivedPipelineIds.length ? { id: { notIn: archivedPipelineIds } } : {}),
          ...(userRole !== "admin" && userId ? { novel: { userId } } : {}),
        },
        _count: { _all: true },
      }),
      prisma.ragIndexJob.groupBy({
        by: ["status"],
        where: {
          ownerType: "knowledge_document",
          ...(archivedKnowledgeIds.length ? { id: { notIn: archivedKnowledgeIds } } : {}),
          ...(userRole !== "admin" && userId ? { ownerId: { in: userDocIds } } : {}),
        },
        _count: { _all: true },
      }),
      prisma.imageGenerationTask.groupBy({
        by: ["status"],
        where: {
          ...(archivedImageIds.length ? { id: { notIn: archivedImageIds } } : {}),
          ...(userRole !== "admin" && userId ? { userId } : {}),
        },
        _count: { _all: true },
      }),
      prisma.agentRun.groupBy({
        by: ["status"],
        where: {
          ...(archivedAgentIds.length ? { id: { notIn: archivedAgentIds } } : {}),
          ...(userRole !== "admin" && userId ? {
            OR: [
              { novel: { userId } },
              { novelId: null },
            ],
          } : {}),
        },
        _count: { _all: true },
      }),
      prisma.novelWorkflowTask.groupBy({
        by: ["status"],
        where: {
          lane: "auto_director",
          ...(archivedWorkflowIds.length ? { id: { notIn: archivedWorkflowIds } } : {}),
          ...(userRole !== "admin" && userId ? { userId } : {}),
        },
        _count: { _all: true },
      }),
      prisma.styleExtractionTask.groupBy({
        by: ["status"],
        where: {
          ...(archivedStyleExtractionIds.length ? { id: { notIn: archivedStyleExtractionIds } } : {}),
          ...(userRole !== "admin" && userId ? {
            OR: [
              { createdStyleProfileId: { in: userProfileIds } },
              { createdStyleProfileId: null },
            ],
          } : {}),
        },
        _count: { _all: true },
      }),
      prisma.bookAnalysis.count({
        where: {
          status: { in: ["queued", "running"] },
          pendingManualRecovery: true,
          ...(archivedBookIds.length ? { id: { notIn: archivedBookIds } } : {}),
          ...(userRole !== "admin" && userId ? { document: { userId } } : {}),
        },
      }),
      prisma.generationJob.count({
        where: {
          status: { in: ["queued", "running"] },
          pendingManualRecovery: true,
          ...(archivedPipelineIds.length ? { id: { notIn: archivedPipelineIds } } : {}),
          ...(userRole !== "admin" && userId ? { novel: { userId } } : {}),
        },
      }),
      prisma.imageGenerationTask.count({
        where: {
          status: { in: ["queued", "running"] },
          pendingManualRecovery: true,
          ...(archivedImageIds.length ? { id: { notIn: archivedImageIds } } : {}),
          ...(userRole !== "admin" && userId ? { userId } : {}),
        },
      }),
      prisma.novelWorkflowTask.count({
        where: {
          lane: "auto_director",
          status: { in: ["queued", "running"] },
          pendingManualRecovery: true,
          ...(archivedWorkflowIds.length ? { id: { notIn: archivedWorkflowIds } } : {}),
          ...(userRole !== "admin" && userId ? { userId } : {}),
        },
      }),
      prisma.styleExtractionTask.count({
        where: {
          status: { in: ["queued", "running"] },
          pendingManualRecovery: true,
          ...(archivedStyleExtractionIds.length ? { id: { notIn: archivedStyleExtractionIds } } : {}),
          ...(userRole !== "admin" && userId ? {
            OR: [
              { createdStyleProfileId: { in: userProfileIds } },
              { createdStyleProfileId: null },
            ],
          } : {}),
        },
      }),
    ]);

    const overview: TaskOverviewSummary = {
      queuedCount: 0,
      runningCount: 0,
      failedCount: 0,
      cancelledCount: 0,
      waitingApprovalCount: 0,
      recoveryCandidateCount: bookRecoveryCount + pipelineRecoveryCount + imageRecoveryCount + workflowRecoveryCount + styleExtractionRecoveryCount,
    };

    for (const rows of [bookRows, pipelineRows, knowledgeRows, imageRows, agentRows, workflowRows, styleExtractionRows]) {
      for (const row of rows) {
        const count = row._count._all;
        if (row.status === "queued") {
          overview.queuedCount += count;
        } else if (row.status === "running") {
          overview.runningCount += count;
        } else if (row.status === "failed") {
          overview.failedCount += count;
        } else if (row.status === "cancelled") {
          overview.cancelledCount += count;
        } else if (row.status === "waiting_approval") {
          overview.waitingApprovalCount += count;
        }
      }
    }

    return overview;
  }

  async listTasks(filters: ListTasksFilters = {}): Promise<UnifiedTaskListResponse> {
    const limit = normalizeLimit(filters.limit);
    const sourceTake = Math.max(60, limit * 4);
    const keyword = normalizeKeyword(filters.keyword);
    const cursorPayload = parseCursor(filters.cursor);

    const [bookTasks, novelTasks, knowledgeTasks, imageTasks, agentTasks, workflowTasks, styleExtractionTasks] = await Promise.all([
      filters.kind && filters.kind !== "book_analysis"
        ? Promise.resolve<UnifiedTaskSummary[]>([])
        : this.bookAdapter.list({ status: filters.status, keyword, take: sourceTake, userId: filters.userId, userRole: filters.userRole }),
      filters.kind && filters.kind !== "novel_pipeline"
        ? Promise.resolve<UnifiedTaskSummary[]>([])
        : this.pipelineAdapter.list({ status: filters.status, keyword, take: sourceTake, userId: filters.userId, userRole: filters.userRole }),
      filters.kind && filters.kind !== "knowledge_document"
        ? Promise.resolve<UnifiedTaskSummary[]>([])
        : this.knowledgeAdapter.list({ status: filters.status, keyword, take: sourceTake, userId: filters.userId, userRole: filters.userRole }),
      filters.kind && filters.kind !== "image_generation"
        ? Promise.resolve<UnifiedTaskSummary[]>([])
        : this.imageAdapter.list({ status: filters.status, keyword, take: sourceTake, userId: filters.userId, userRole: filters.userRole }),
      filters.kind && filters.kind !== "agent_run"
        ? Promise.resolve<UnifiedTaskSummary[]>([])
        : this.agentAdapter.list({ status: filters.status, keyword, take: sourceTake, userId: filters.userId, userRole: filters.userRole }),
      filters.kind && filters.kind !== "novel_workflow"
        ? Promise.resolve<UnifiedTaskSummary[]>([])
        : this.workflowAdapter.list({ status: filters.status, keyword, take: sourceTake, userId: filters.userId, userRole: filters.userRole }),
      filters.kind && filters.kind !== "style_extraction"
        ? Promise.resolve<UnifiedTaskSummary[]>([])
        : this.styleExtractionAdapter.list({ status: filters.status, keyword, take: sourceTake, userId: filters.userId, userRole: filters.userRole }),
    ]);

    const linkedPipelineIds = filters.kind === "novel_pipeline"
      ? new Set<string>()
      : collectWorkflowLinkedPipelineIds(workflowTasks);
    const visibleNovelTasks = filters.kind === "novel_pipeline"
      ? novelTasks
      : novelTasks.filter((task) => !linkedPipelineIds.has(task.id));

    const merged = [...bookTasks, ...visibleNovelTasks, ...knowledgeTasks, ...imageTasks, ...agentTasks, ...workflowTasks, ...styleExtractionTasks]
      .sort(compareTaskSummary);
    const filteredByCursor = cursorPayload
      ? merged.filter((item) => isAfterCursor(item, cursorPayload))
      : merged;
    const items = filteredByCursor.slice(0, limit);
    const nextCursor = filteredByCursor.length > limit ? toCursor(items[items.length - 1]) : null;

    return {
      items,
      nextCursor,
    };
  }

  async getTaskDetail(kind: TaskKind, id: string, userId?: string, userRole?: string): Promise<UnifiedTaskDetail | null> {
    if (kind === "book_analysis") {
      return this.bookAdapter.detail(id, userId, userRole);
    }
    if (kind === "novel_pipeline") {
      return this.pipelineAdapter.detail(id, userId, userRole);
    }
    if (kind === "knowledge_document") {
      return this.knowledgeAdapter.detail(id, userId, userRole);
    }
    if (kind === "agent_run") {
      return this.agentAdapter.detail(id, userId, userRole);
    }
    if (kind === "novel_workflow") {
      return this.workflowAdapter.detail(id, userId, userRole, { heal: true });
    }
    if (kind === "style_extraction") {
      return this.styleExtractionAdapter.detail(id, userId, userRole);
    }
    return this.imageAdapter.detail(id, userId, userRole);
  }

  async retryTask(
    kind: TaskKind,
    id: string,
    options?: {
      llmOverride?: Pick<DirectorLLMOptions, "provider" | "model" | "temperature">;
      resume?: boolean;
      batchAlreadyStartedCount?: number;
    },
    userId?: string,
    userRole?: string,
  ): Promise<UnifiedTaskDetail> {
    if (kind === "book_analysis") {
      return this.bookAdapter.retry(id, userId, userRole);
    }
    if (kind === "novel_pipeline") {
      return this.pipelineAdapter.retry(id, userId, userRole);
    }
    if (kind === "knowledge_document") {
      return this.knowledgeAdapter.retry(id, userId, userRole);
    }
    if (kind === "agent_run") {
      return this.agentAdapter.retry(id, userId, userRole);
    }
    if (kind === "novel_workflow") {
      return this.workflowAdapter.retry({
        id,
        llmOverride: options?.llmOverride,
        resume: options?.resume,
        batchAlreadyStartedCount: options?.batchAlreadyStartedCount,
        userId,
        userRole,
      });
    }
    if (kind === "image_generation") {
      return this.imageAdapter.retry(id, userId, userRole);
    }
    if (kind === "style_extraction") {
      return this.styleExtractionAdapter.retry(id, userId, userRole);
    }
    throw new AppError(`Unsupported task kind: ${kind}`, 400);
  }

  async cancelTask(kind: TaskKind, id: string, userId?: string, userRole?: string): Promise<UnifiedTaskDetail> {
    if (kind === "book_analysis") {
      return this.bookAdapter.cancel(id, userId, userRole);
    }
    if (kind === "novel_pipeline") {
      return this.pipelineAdapter.cancel(id, userId, userRole);
    }
    if (kind === "knowledge_document") {
      return this.knowledgeAdapter.cancel(id, userId, userRole);
    }
    if (kind === "agent_run") {
      return this.agentAdapter.cancel(id, userId, userRole);
    }
    if (kind === "novel_workflow") {
      return this.workflowAdapter.cancel(id, userId, userRole);
    }
    if (kind === "image_generation") {
      return this.imageAdapter.cancel(id, userId, userRole);
    }
    if (kind === "style_extraction") {
      return this.styleExtractionAdapter.cancel(id, userId, userRole);
    }
    throw new AppError(`Unsupported task kind: ${kind}`, 400);
  }

  async archiveTask(kind: TaskKind, id: string, userId?: string, userRole?: string): Promise<UnifiedTaskDetail | null> {
    if (kind === "book_analysis") {
      return this.bookAdapter.archive(id, userId, userRole);
    }
    if (kind === "novel_pipeline") {
      return this.pipelineAdapter.archive(id, userId, userRole);
    }
    if (kind === "knowledge_document") {
      return this.knowledgeAdapter.archive(id, userId, userRole);
    }
    if (kind === "agent_run") {
      return this.agentAdapter.archive(id, userId, userRole);
    }
    if (kind === "novel_workflow") {
      return this.workflowAdapter.archive(id, userId, userRole);
    }
    if (kind === "image_generation") {
      return this.imageAdapter.archive(id, userId, userRole);
    }
    if (kind === "style_extraction") {
      return this.styleExtractionAdapter.archive(id, userId, userRole);
    }
    throw new AppError(`Unsupported task kind: ${kind}`, 400);
  }
}

export const taskCenterService = new TaskCenterService();
