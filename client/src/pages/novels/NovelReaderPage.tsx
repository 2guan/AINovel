import type { TouchEvent } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  ListTree,
  Minus,
  Moon,
  PenLine,
  Plus,
  Sun,
  Type,
} from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getPublicNovelReader, type PublicNovelReaderChapter } from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MIN_FONT_SIZE = 16;
const MAX_FONT_SIZE = 24;
const writeCtaClassName = "h-8 gap-1.5 border border-black bg-white px-3 text-xs font-medium text-black shadow-none hover:bg-white/90";

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
  const mobilePagerViewportRef = useRef<HTMLDivElement | null>(null);
  const mobilePagerContentRef = useRef<HTMLDivElement | null>(null);
  const mobileTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pendingMobilePagePlacementRef = useRef<"start" | "end">("start");
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(18);
  const [isNightMode, setIsNightMode] = useState(false);
  const [isMobilePagedMode, setIsMobilePagedMode] = useState(true);
  const [mobilePageIndex, setMobilePageIndex] = useState(0);
  const [mobilePageCount, setMobilePageCount] = useState(1);
  const [mobilePageWidth, setMobilePageWidth] = useState(0);
  const [readerControlsVisible, setReaderControlsVisible] = useState(false);

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
  const activeMobilePageIndex = Math.min(mobilePageIndex, Math.max(0, mobilePageCount - 1));
  const authorName = reader?.author.displayName?.trim() || reader?.author.username || "未知作者";
  const updatedAt = reader?.updatedAt ? formatReaderDate(reader.updatedAt) : "";
  const shouldShowMobileBookTitlePage = activeIndex === 0;

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

  useEffect(() => {
    setMobilePageIndex(pendingMobilePagePlacementRef.current === "end" ? Number.MAX_SAFE_INTEGER : 0);
    pendingMobilePagePlacementRef.current = "start";
  }, [activeChapter?.id]);

  useEffect(() => {
    setMobilePageIndex((current) => Math.min(current, Math.max(0, mobilePageCount - 1)));
  }, [mobilePageCount]);

  const recalculateMobilePages = useCallback(() => {
    if (!isMobilePagedMode) {
      setMobilePageCount(1);
      setMobilePageWidth(0);
      return;
    }

    const viewport = mobilePagerViewportRef.current;
    const content = mobilePagerContentRef.current;
    if (!viewport || !content) {
      return;
    }

    const nextPageWidth = Math.max(1, viewport.getBoundingClientRect().width);
    setMobilePageWidth(nextPageWidth);
    window.requestAnimationFrame(() => {
      const totalWidth = Math.max(content.scrollWidth, content.getBoundingClientRect().width);
      const nextPageCount = Math.max(1, Math.ceil(totalWidth / nextPageWidth - 0.01));
      setMobilePageCount(nextPageCount);
      setMobilePageIndex((current) => Math.min(current, nextPageCount - 1));
    });
  }, [isMobilePagedMode]);

  useLayoutEffect(() => {
    recalculateMobilePages();
  }, [activeChapter?.id, fontSize, paragraphs, recalculateMobilePages]);

  useEffect(() => {
    window.addEventListener("resize", recalculateMobilePages);
    window.addEventListener("orientationchange", recalculateMobilePages);
    return () => {
      window.removeEventListener("resize", recalculateMobilePages);
      window.removeEventListener("orientationchange", recalculateMobilePages);
    };
  }, [recalculateMobilePages]);

  const selectChapter = (chapter: PublicNovelReaderChapter, pagePlacement: "start" | "end" = "start") => {
    pendingMobilePagePlacementRef.current = pagePlacement;
    setActiveChapterId(chapter.id);
    setMobilePageIndex(pagePlacement === "end" ? Number.MAX_SAFE_INTEGER : 0);
    setSearchParams({ chapter: String(chapter.order) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reduceFontSize = () => {
    setFontSize((current) => Math.max(MIN_FONT_SIZE, current - 1));
  };

  const increaseFontSize = () => {
    setFontSize((current) => Math.min(MAX_FONT_SIZE, current + 1));
  };

  const scrollReaderToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToPreviousMobileUnit = () => {
    if (isMobilePagedMode && activeMobilePageIndex > 0) {
      setMobilePageIndex((current) => Math.max(0, current - 1));
      scrollReaderToTop();
      return;
    }
    if (previousChapter) {
      selectChapter(previousChapter, "end");
    }
  };

  const goToNextMobileUnit = () => {
    if (isMobilePagedMode && activeMobilePageIndex < mobilePageCount - 1) {
      setMobilePageIndex((current) => Math.min(mobilePageCount - 1, current + 1));
      scrollReaderToTop();
      return;
    }
    if (nextChapter) {
      selectChapter(nextChapter);
    }
  };

  const canGoPreviousMobileUnit = isMobilePagedMode
    ? activeMobilePageIndex > 0 || Boolean(previousChapter)
    : Boolean(previousChapter);
  const canGoNextMobileUnit = isMobilePagedMode
    ? activeMobilePageIndex < mobilePageCount - 1 || Boolean(nextChapter)
    : Boolean(nextChapter);

  const handleMobilePagerTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    mobileTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleMobilePagerTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = mobileTouchStartRef.current;
    const touch = event.changedTouches[0];
    mobileTouchStartRef.current = null;
    if (!start || !touch) {
      return;
    }
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) {
      return;
    }
    if (deltaX < 0) {
      goToNextMobileUnit();
    } else {
      goToPreviousMobileUnit();
    }
  };

  return (
    <div
      className={cn(
        "min-h-screen transition-colors",
        isMobilePagedMode && "max-lg:h-dvh max-lg:overflow-hidden",
        isNightMode ? "bg-[#141a1f] text-slate-100" : "bg-[#f4f7f3] text-slate-950",
      )}
    >
      <div className={cn(
        "mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8",
        isMobilePagedMode && "max-lg:h-dvh max-lg:min-h-0 max-lg:py-3",
      )}>
        <header
          className={cn(
            "sticky top-0 z-20 -mx-4 border-b px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8",
            isMobilePagedMode && "max-lg:hidden",
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
              <Button asChild size="sm" variant="outline" className={writeCtaClassName}>
                <Link to="/">
                  <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
                  我也要写
                </Link>
              </Button>
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

        <main className={cn("flex-1 py-6", isMobilePagedMode && "max-lg:flex max-lg:min-h-0 max-lg:flex-col max-lg:py-2")}>
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
            <div className={cn("grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]", isMobilePagedMode && "max-lg:min-h-0 max-lg:flex-1")}>
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

              <section className={cn("min-w-0", isMobilePagedMode && "max-lg:flex max-lg:min-h-0 max-lg:flex-col")}>
                <div
                  className={cn(
                    "mb-4 rounded-lg border p-4 lg:hidden",
                    isMobilePagedMode && "hidden",
                    isNightMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-white/75",
                  )}
                >
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
                  <div
                    className={cn(
                      "mt-3 grid grid-cols-2 rounded-md border p-1",
                      isNightMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-white/70",
                    )}
                  >
                    <button
                      type="button"
                      className={cn(
                        "rounded px-3 py-2 text-sm transition",
                        isMobilePagedMode
                          ? isNightMode
                            ? "bg-emerald-400/20 text-emerald-100"
                            : "bg-emerald-50 text-emerald-800"
                          : isNightMode
                            ? "text-slate-300"
                            : "text-slate-600",
                      )}
                      onClick={() => {
                        setIsMobilePagedMode(true);
                        setMobilePageIndex(0);
                        scrollReaderToTop();
                      }}
                    >
                      分页
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "rounded px-3 py-2 text-sm transition",
                        !isMobilePagedMode
                          ? isNightMode
                            ? "bg-emerald-400/20 text-emerald-100"
                            : "bg-emerald-50 text-emerald-800"
                          : isNightMode
                            ? "text-slate-300"
                            : "text-slate-600",
                      )}
                      onClick={() => {
                        setIsMobilePagedMode(false);
                        setMobilePageIndex(0);
                        scrollReaderToTop();
                      }}
                    >
                      滚动
                    </button>
                  </div>
                </div>

                <article
                  className={cn(
                    "mx-auto max-w-3xl rounded-lg border px-5 py-7 shadow-sm sm:px-8 sm:py-9 lg:px-12 lg:py-11",
                    isMobilePagedMode && "max-lg:flex max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col max-lg:overflow-hidden max-lg:px-4 max-lg:py-4",
                    isNightMode ? "border-white/10 bg-[#1b2329] shadow-black/20" : "border-slate-200 bg-[#fffefb] shadow-slate-200/70",
                  )}
                >
                  <div
                    className={cn(
                      "border-b pb-6",
                      isMobilePagedMode && "max-lg:hidden",
                      isNightMode ? "border-white/10" : "border-slate-200",
                    )}
                  >
                    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-sm", isNightMode ? "text-slate-400" : "text-slate-500")}>
                      <span>作者：{authorName}</span>
                      <span>章节：{formatCount(reader.stats.chapterCount)}</span>
                      <span>字数：{formatCount(reader.stats.wordCount)}</span>
                      {updatedAt ? <span>更新：{updatedAt}</span> : null}
                    </div>
                  </div>

                  {activeChapter ? (
                    <>
                      <div
                        className={cn(
                          "pt-8",
                          isMobilePagedMode && "max-lg:hidden",
                        )}
                      >
                        <div className={cn("text-sm", isNightMode ? "text-emerald-200/80" : "text-emerald-700")}>
                          第 {activeChapter.order} 章
                        </div>
                        <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">{activeChapter.title}</h2>
                      </div>
                      <div
                        className={cn(
                          "mt-8 hidden space-y-5 font-serif leading-9 lg:block",
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
                      {isMobilePagedMode ? (
                        <div
                          ref={mobilePagerViewportRef}
                          className={cn(
                            "relative mt-4 hidden min-h-0 flex-1 overflow-hidden font-serif leading-9 max-lg:block",
                            isNightMode ? "text-slate-100" : "text-slate-900",
                          )}
                          onTouchStart={handleMobilePagerTouchStart}
                          onTouchEnd={handleMobilePagerTouchEnd}
                        >
                          <div
                            ref={mobilePagerContentRef}
                            className="h-full transition-transform duration-200 ease-out"
                            style={{
                              boxSizing: "border-box",
                              columnGap: 0,
                              columnWidth: mobilePageWidth > 0 ? `${mobilePageWidth}px` : undefined,
                              fontSize,
                              transform: `translateX(-${activeMobilePageIndex * mobilePageWidth}px)`,
                              width: mobilePageWidth > 0 ? `${mobilePageWidth}px` : undefined,
                            }}
                          >
                            {shouldShowMobileBookTitlePage ? (
                              <section
                                className="flex h-full flex-col items-center justify-center px-6 text-center"
                                style={{
                                  breakAfter: "column",
                                  breakInside: "avoid",
                                }}
                              >
                                <h2 className="max-w-full break-words text-3xl font-semibold leading-tight">
                                  {reader.title}
                                </h2>
                                <div className={cn("mt-5 text-sm", isNightMode ? "text-slate-400" : "text-slate-500")}>
                                  作者：{authorName}
                                </div>
                                <div className={cn("mt-2 text-xs", isNightMode ? "text-slate-500" : "text-slate-400")}>
                                  共 {formatCount(reader.stats.chapterCount)} 章 · {formatCount(reader.stats.wordCount)} 字
                                </div>
                              </section>
                            ) : null}
                            <section
                              className="flex h-full flex-col justify-center px-6"
                              style={{
                                breakAfter: "column",
                                breakInside: "avoid",
                              }}
                            >
                              <div className={cn("text-sm", isNightMode ? "text-emerald-200/80" : "text-emerald-700")}>
                                第 {activeChapter.order} 章
                              </div>
                              <h2 className="mt-4 break-words text-2xl font-semibold leading-tight">
                                {activeChapter.title}
                              </h2>
                              <div className={cn("mt-5 text-sm leading-7", isNightMode ? "text-slate-400" : "text-slate-500")}>
                                <div>《{reader.title}》</div>
                                <div>作者：{authorName}</div>
                                {updatedAt ? <div>更新：{updatedAt}</div> : null}
                              </div>
                            </section>
                            {paragraphs.map((paragraph, index) => (
                              <p key={`${activeChapter.id}-paged-${index}`} className="mb-5 break-words px-1 text-justify">
                                {paragraph}
                              </p>
                            ))}
                          </div>
                          <button
                            type="button"
                            className="absolute inset-y-0 left-0 w-[30%] cursor-default bg-transparent"
                            aria-label="上一页"
                            onClick={goToPreviousMobileUnit}
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 left-[30%] w-[40%] cursor-default bg-transparent"
                            aria-label={readerControlsVisible ? "隐藏阅读控制" : "显示阅读控制"}
                            onClick={() => setReaderControlsVisible((current) => !current)}
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 w-[30%] cursor-default bg-transparent"
                            aria-label="下一页"
                            onClick={goToNextMobileUnit}
                          />
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "mt-8 space-y-5 font-serif leading-9 lg:hidden",
                            isNightMode ? "text-slate-100" : "text-slate-900",
                          )}
                          style={{ fontSize }}
                        >
                          {paragraphs.map((paragraph, index) => (
                            <p key={`${activeChapter.id}-scroll-${index}`} className="break-words text-justify">
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      )}
                      {isMobilePagedMode ? (
                        <div
                          className={cn(
                            "pointer-events-none fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-30 -translate-x-1/2 rounded-full px-3 py-1 text-center text-xs shadow-lg backdrop-blur lg:hidden",
                            readerControlsVisible && "bottom-[calc(5rem+env(safe-area-inset-bottom))]",
                            isNightMode ? "bg-black/35 text-slate-300" : "bg-white/80 text-slate-600",
                            isNightMode ? "text-slate-400" : "text-slate-500",
                          )}
                        >
                          {mobilePageCount > 0 ? `${activeMobilePageIndex + 1} / ${mobilePageCount}` : "0 / 0"}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className={cn("py-12 text-center", isNightMode ? "text-slate-300" : "text-slate-600")}>
                      这本书还没有可阅读正文。
                    </div>
                  )}
                </article>

                {activeChapter ? (
                  <nav className="mx-auto mt-5 hidden max-w-3xl items-center justify-between gap-3 lg:flex">
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
                {activeChapter ? (
                  <nav
                    className={cn(
                      "mx-auto mt-5 flex max-w-3xl items-center justify-between gap-3 lg:hidden",
                      isMobilePagedMode && "hidden",
                    )}
                  >
                    <Button
                      type="button"
                      variant={isNightMode ? "secondary" : "outline"}
                      disabled={!canGoPreviousMobileUnit}
                      onClick={goToPreviousMobileUnit}
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      {isMobilePagedMode && activeMobilePageIndex > 0 ? "上一页" : "上一章"}
                    </Button>
                    <Button
                      type="button"
                      variant={isNightMode ? "secondary" : "outline"}
                      disabled={!canGoNextMobileUnit}
                      onClick={goToNextMobileUnit}
                    >
                      {isMobilePagedMode && activeMobilePageIndex < mobilePageCount - 1 ? "下一页" : "下一章"}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </nav>
                ) : null}
              </section>
            </div>
          ) : null}
        </main>
      </div>
      {isMobilePagedMode && activeChapter && readerControlsVisible ? (
        <div className="lg:hidden">
          <div
            className={cn(
              "fixed inset-x-0 top-0 z-40 border-b px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-lg backdrop-blur",
              isNightMode ? "border-white/10 bg-[#141a1f]/92 text-slate-100" : "border-slate-200/80 bg-[#f4f7f3]/92 text-slate-950",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
                  公开阅读
                </div>
                <div className="mt-1 min-w-0 truncate text-base font-semibold">
                  {reader?.title ?? "小说阅读"}
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className={writeCtaClassName}>
                <Link to="/">
                  <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
                  我也要写
                </Link>
              </Button>
            </div>
            <div className={cn("mt-1 truncate text-xs", isNightMode ? "text-slate-400" : "text-slate-500")}>
              第 {activeChapter.order} 章 · {activeChapter.title}
            </div>
          </div>

          <div
            className={cn(
              "fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 rounded-2xl border p-3 shadow-2xl backdrop-blur",
              isNightMode ? "border-white/10 bg-[#1b2329]/94 text-slate-100" : "border-slate-200 bg-white/94 text-slate-950",
            )}
          >
            <div className="grid gap-3">
              <div>
                <label className="text-xs font-medium" htmlFor="floating-reader-chapter-select">章节</label>
                <select
                  id="floating-reader-chapter-select"
                  className={cn(
                    "mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none",
                    isNightMode ? "border-white/10 bg-[#141a1f] text-slate-100" : "border-slate-200 bg-white text-slate-950",
                  )}
                  value={activeChapter.id}
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

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm transition",
                    isMobilePagedMode
                      ? isNightMode
                        ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-100"
                        : "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : isNightMode
                        ? "border-white/10 text-slate-300"
                        : "border-slate-200 text-slate-600",
                  )}
                  onClick={() => {
                    setIsMobilePagedMode(true);
                    setMobilePageIndex(0);
                    scrollReaderToTop();
                  }}
                >
                  分页
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm transition",
                    !isMobilePagedMode
                      ? isNightMode
                        ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-100"
                        : "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : isNightMode
                        ? "border-white/10 text-slate-300"
                        : "border-slate-200 text-slate-600",
                  )}
                  onClick={() => {
                    setIsMobilePagedMode(false);
                    setMobilePageIndex(0);
                    setReaderControlsVisible(false);
                    scrollReaderToTop();
                  }}
                >
                  滚动
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
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
                    "flex h-9 flex-1 items-center justify-center gap-1 rounded-md border px-3 text-sm",
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
