import { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { prisma } from "../db/prisma";

const router = Router();

function countCjkAwareWords(content: string): number {
  const cjkCount = content.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const wordCount = content
    .replace(/[\u3400-\u9fff]/g, " ")
    .match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g)?.length ?? 0;
  return cjkCount + wordCount;
}

router.get("/novels/:id/reader", async (req, res, next) => {
  try {
    const id = String(req.params.id ?? "").trim();
    if (!id) {
      res.status(404).json({
        success: false,
        error: "小说不存在。",
      } satisfies ApiResponse<null>);
      return;
    }

    const novel = await prisma.novel.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        updatedAt: true,
        owner: {
          select: {
            username: true,
            displayName: true,
          },
        },
        chapters: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            order: true,
            title: true,
            content: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!novel) {
      res.status(404).json({
        success: false,
        error: "小说不存在。",
      } satisfies ApiResponse<null>);
      return;
    }

    const chapters = novel.chapters
      .map((chapter) => ({
        id: chapter.id,
        order: chapter.order,
        title: chapter.title,
        content: chapter.content?.trim() ?? "",
        updatedAt: chapter.updatedAt,
      }))
      .filter((chapter) => chapter.content.length > 0);
    const totalWordCount = chapters.reduce((sum, chapter) => sum + countCjkAwareWords(chapter.content), 0);
    const data = {
      id: novel.id,
      title: novel.title,
      description: novel.description,
      status: novel.status,
      updatedAt: novel.updatedAt,
      author: {
        username: novel.owner.username,
        displayName: novel.owner.displayName,
      },
      chapters,
      stats: {
        chapterCount: chapters.length,
        wordCount: totalWordCount,
      },
    };

    res.status(200).json({
      success: true,
      data,
      message: "小说阅读内容已加载。",
    } satisfies ApiResponse<typeof data>);
  } catch (error) {
    next(error);
  }
});

export default router;
