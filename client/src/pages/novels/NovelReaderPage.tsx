import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  ListTree,
  Minus,
  Moon,
  Plus,
  Sun,
  Type,
} from "lucide-react";
import { useParams, useSearchParams } from "react-router-dom";
import { getPublicNovelReader, type PublicNovelReaderChapter } from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MIN_FONT_SIZE = 16;
const MAX_FONT_SIZE = 24;

function splitChapterParagraphs(content: string): string[] {
  return content
    .replace(/\r\n/g, "\n")
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(Math.max(0, Math.round(value)));
}

function formatReaderDate(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function resolveChapterFromParam(
  chapters: PublicNovelReaderChapter[],
  chapterParam: string | null,
): PublicNovelReaderChapter | undefined {
  if (!chapters.length) {
    return undefined;
  }
  if (!chapterParam) {
    return chapters[0];
  }
  return chapters.find((chapter) => chapter.id === chapterParam || String(chapter.order) === chapterParam) ?? chapters[0];
}

export default function NovelReaderPage() {
  const { id = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(18);
  const [isNightMode, setIsNightMode] = useState(false);

  const readerQuery = useQuery({
    queryKey: queryKeys.novels.publicReader(id),
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await getPublicNovelReader(id);
      if (!response.success || !response.data) {
        throw new Error(response.error ?? "无法读取小说。");
      }
      return response.data;
    },
  });

  const reader = readerQuery.data;
  const chapters = reader?.chapters ?? [];
  const activeChapter = useMemo(() => {
    if (!chapters.length) {
      return undefined;
    }
    return chapters.find((chapter) => chapter.id === activeChapterId) ?? resolveChapterFromParam(chapters, searchParams.get("chapter"));
  }, [activeChapterId, chapters, searchParams]);
  const activeIndex = activeChapter ? chapters.findIndex((chapter) => chapter.id === activeChapter.id) : -1;
  const previousChapter = activeIndex > 0 ? chapters[activeIndex - 1] : undefined;
  const nextChapter = activeIndex >= 0 && activeIndex < chapters.length - 1 ? chapters[activeIndex + 1] : undefined;
  const paragraphs = useMemo(() => splitChapterParagraphs(activeChapter?.content ?? ""), [activeChapter?.content]);
  const authorName = reader?.author.displayName?.trim() || reader?.author.username || "未知作者";
  const updatedAt = reader?.updatedAt ? formatReaderDate(reader.updatedAt) : "";

  useEffect(() => {
    if (!reader?.title) {
      return;
    }
    document.title = `${reader.title} - 阅读`;
  }, [reader?.title]);

  useEffect(() => {
    if (!chapters.length) {
      setActiveChapterId(null);
      return;
    }
    const resolved = resolveChapterFromParam(chapters, searchParams.get("chapter"));
    if (resolved && resolved.id !== activeChapterId) {
      setActiveChapterId(resolved.id);
    }
  }, [activeChapterId, chapters, searchParams]);

  const selectChapter = (chapter: PublicNovelReaderChapter) => {
    setActiveChapterId(chapter.id);
    setSearchParams({ chapter: String(chapter.order) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reduceFontSize = () => {
    setFontSize((current) => Math.max(MIN_FONT_SIZE, current - 1));
  };

  const increaseFontSize = () => {
    setFontSize((current) => Math.min(MAX_FONT_SIZE, current + 1));
  };

  return (
    <div
      className={cn(
        "min-h-screen transition-colors",
        isNightMode ? "bg-[#141a1f] text-slate-100" : "bg-[#f4f7f3] text-slate-950",
      )}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header
          className={cn(
            "sticky top-0 z-20 -mx-4 border-b px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8",
            isNightMode ? "border-white/10 bg-[#141a1f]/90" : "border-slate-200/80 bg-[#f4f7f3]/90",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className={cn("flex items-center gap-2 text-xs", isNightMode ? "text-slate-400" : "text-slate-500")}>
                <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
                公开阅读
              </div>
              <h1 className="mt-1 truncate text-xl font-semibold sm:text-2xl">
                {reader?.title ?? "小说阅读"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={isNightMode ? "secondary" : "outline"}
                size="icon"
                onClick={reduceFontSize}
                disabled={fontSize <= MIN_FONT_SIZE}
                aria-label="缩小字号"
                title="缩小字号"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </Button>
              <div
                className={cn(
                  "flex h-9 items-center gap-1 rounded-md border px-3 text-sm",
                  isNightMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-white/70",
                )}
                title="当前字号"
              >
                <Type className="h-4 w-4" aria-hidden="true" />
                {fontSize}
              </div>
              <Button
                type="button"
                variant={isNightMode ? "secondary" : "outline"}
                size="icon"
                onClick={increaseFontSize}
                disabled={fontSize >= MAX_FONT_SIZE}
                aria-label="放大字号"
                title="放大字号"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant={isNightMode ? "secondary" : "outline"}
                size="icon"
                onClick={() => setIsNightMode((current) => !current)}
                aria-label={isNightMode ? "切换日间阅读" : "切换夜间阅读"}
                title={isNightMode ? "切换日间阅读" : "切换夜间阅读"}
              >
                {isNightMode ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 py-6">
          {readerQuery.isPending ? (
            <div className={cn("mx-auto max-w-3xl rounded-lg border p-6", isNightMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-white/75")}>
              正在加载小说正文...
            </div>
          ) : readerQuery.isError ? (
            <div className={cn("mx-auto max-w-3xl rounded-lg border p-6", isNightMode ? "border-red-300/30 bg-red-950/20" : "border-red-200 bg-red-50")}>
              <div className="font-medium">无法打开这本小说</div>
              <div className={cn("mt-2 text-sm", isNightMode ? "text-red-100/80" : "text-red-700")}>
                {readerQuery.error instanceof Error ? readerQuery.error.message : "请稍后重试。"}
              </div>
            </div>
          ) : reader ? (
            <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="hidden lg:block">
                <div
                  className={cn(
                    "sticky top-28 max-h-[calc(100vh-8rem)] overflow-auto rounded-lg border p-4",
                    isNightMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-white/75",
                  )}
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ListTree className="h-4 w-4" aria-hidden="true" />
                    目录
                  </div>
                  <div className="mt-3 space-y-1">
                    {chapters.map((chapter) => (
                      <button
                        key={chapter.id}
                        type="button"
                        className={cn(
                          "w-full rounded-md px-3 py-2 text-left text-sm transition",
                          activeChapter?.id === chapter.id
                            ? isNightMode
                              ? "bg-emerald-400/15 text-emerald-100"
                              : "bg-emerald-50 text-emerald-800"
                            : isNightMode
                              ? "text-slate-300 hover:bg-white/10"
                              : "text-slate-600 hover:bg-slate-100",
                        )}
                        onClick={() => selectChapter(chapter)}
                      >
                        <span className="block text-xs opacity-70">第 {chapter.order} 章</span>
                        <span className="line-clamp-2">{chapter.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </aside>

              <section className="min-w-0">
                <div className={cn("mb-4 rounded-lg border p-4 lg:hidden", isNightMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-white/75")}>
                  <label className="text-sm font-medium" htmlFor="reader-chapter-select">章节</label>
                  <select
                    id="reader-chapter-select"
                    className={cn(
                      "mt-2 h-11 w-full rounded-md border px-3 text-sm outline-none",
                      isNightMode ? "border-white/10 bg-[#1c242b] text-slate-100" : "border-slate-200 bg-white text-slate-950",
                    )}
                    value={activeChapter?.id ?? ""}
                    onChange={(event) => {
                      const selected = chapters.find((chapter) => chapter.id === event.target.value);
                      if (selected) {
                        selectChapter(selected);
                      }
                    }}
                  >
                    {chapters.map((chapter) => (
                      <option key={chapter.id} value={chapter.id}>
                        第 {chapter.order} 章 {chapter.title}
                      </option>
                    ))}
                  </select>
                </div>

                <article
                  className={cn(
                    "mx-auto max-w-3xl rounded-lg border px-5 py-7 shadow-sm sm:px-8 sm:py-9 lg:px-12 lg:py-11",
                    isNightMode ? "border-white/10 bg-[#1b2329] shadow-black/20" : "border-slate-200 bg-[#fffefb] shadow-slate-200/70",
                  )}
                >
                  <div className={cn("border-b pb-6", isNightMode ? "border-white/10" : "border-slate-200")}>
                    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-sm", isNightMode ? "text-slate-400" : "text-slate-500")}>
                      <span>作者：{authorName}</span>
                      <span>章节：{formatCount(reader.stats.chapterCount)}</span>
                      <span>字数：{formatCount(reader.stats.wordCount)}</span>
                      {updatedAt ? <span>更新：{updatedAt}</span> : null}
                    </div>
                    {reader.description ? (
                      <p className={cn("mt-4 text-sm leading-7", isNightMode ? "text-slate-300" : "text-slate-600")}>
                        {reader.description}
                      </p>
                    ) : null}
                  </div>

                  {activeChapter ? (
                    <>
                      <div className="pt-8">
                        <div className={cn("text-sm", isNightMode ? "text-emerald-200/80" : "text-emerald-700")}>
                          第 {activeChapter.order} 章
                        </div>
                        <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">{activeChapter.title}</h2>
                      </div>
                      <div
                        className={cn(
                          "mt-8 space-y-5 font-serif leading-9",
                          isNightMode ? "text-slate-100" : "text-slate-900",
                        )}
                        style={{ fontSize }}
                      >
                        {paragraphs.map((paragraph, index) => (
                          <p key={`${activeChapter.id}-${index}`} className="break-words text-justify">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className={cn("py-12 text-center", isNightMode ? "text-slate-300" : "text-slate-600")}>
                      这本书还没有可阅读正文。
                    </div>
                  )}
                </article>

                {activeChapter ? (
                  <nav className="mx-auto mt-5 flex max-w-3xl items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant={isNightMode ? "secondary" : "outline"}
                      disabled={!previousChapter}
                      onClick={() => previousChapter && selectChapter(previousChapter)}
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      上一章
                    </Button>
                    <Button
                      type="button"
                      variant={isNightMode ? "secondary" : "outline"}
                      disabled={!nextChapter}
                      onClick={() => nextChapter && selectChapter(nextChapter)}
                    >
                      下一章
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </nav>
                ) : null}
              </section>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
