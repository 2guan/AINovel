# 短篇章节预算与前 30% 兑现规则

## Background

自动导演、创作中枢和卷章规划最早面向长篇网文生产设计，曾把默认章数、最小目标章数和“前 30 章承诺”写成固定长篇尺度。这会让 1 章、3 章、5 章这类短篇项目被拉长，也会让提示词在短篇里要求不存在的固定章节号。

## Decision

系统必须把章节规模视为用户目标，而不是长篇默认值。用户明确输入 1 章、3 章、5 章等短篇目标时，规划链路应按短篇闭环生成紧凑结构。

“前期兑现”统一表达为全书前 30% 的关键兑现。内部字段名为了兼容历史数据可以继续叫 `first30ChapterPromise` 或 `chapter30Payoff`，但产品文案、上下文标签和提示词解释都应按比例理解，不能要求一定写到固定章节号。

## Current Rule

- 新项目默认预计章节数保持轻量，避免新手误触后生成过大的项目。
- 自动导演目标章节数最小支持到 1 章，允许 1 章、3 章、5 章短篇。
- 蓝图 schema 允许单个 arc 和单章 arc；短篇可以用一个紧凑阶段完成开局、转折和兑现。
- 卷数建议不能把短篇预算强行抬到长篇最低预算；短篇通常应保持 1 卷。
- 分卷章节预算不能再设置固定长篇地板值。用户给出 3 章时，`deriveChapterBudget` 和每卷预算分配都必须保持 3 章目标，不得把预算抬到 12 章或每卷至少 3 章。
- 节奏板 schema 只负责字段完整性，不承担长篇 beat 数下限。1-5 章短篇的 beat 数由提示词按目标章数压缩，后置章节跨度校验负责确认 beat 覆盖到目标章数。
- 1-5 章短篇必须精确覆盖目标章数。长篇可以保留合理跨度容差，短篇不能接受“只覆盖前 1-2 章”的节奏板。
- 3 章以内短篇可以把开篇抓手、转向、高潮和收束合并在同一 beat 或相邻 beat 中，不需要单独拆出“中段走向”“高潮前挤压”“卷尾钩子”等长篇节奏段。
- 分卷策略和卷骨架提示词遇到 1-5 章预算时，应优先生成单卷闭环；字段仍要完整，但 `midVolumeRisk`、`nextVolumeHook`、`resetPoint` 可以表达为压缩转向、轻量余波或当前卷收束，而不是制造下一卷入口。
- 自动导演“继续自动执行前 N 章”不能把短篇目标固定解释为第 1-10 章。结构化大纲阶段必须用候选目标章数或用户预计章节数裁剪 `chapter_range`，例如 3 章目标只能准备和执行第 1-3 章。
- 提示词遇到 `chapter30Payoff` 时，应解释为“全书前 30% 位置的阶段兑现”，短篇按比例折算。

## Failure Modes

- 如果候选方案仍默认给出几十章，优先检查 `targetChapterCount` 的默认值、最小值和候选 schema。
- 如果 1-3 章项目在蓝图阶段失败，优先检查 arc 或 chapter shell 的 `min()` 约束是否重新变成多阶段长篇假设。
- 如果节奏 / 拆章仍至少生成 12 章，优先检查 `volumeChapterBudgetAllocation.ts` 是否重新出现固定 `12` 下限，或每卷预算是否重新变成至少 3 章。
- 如果 3 章项目仍生成 5-8 个 beat，优先检查 `createVolumeBeatSheetSchema()` 是否重新出现 `min(5)`，以及 `volumeBeatSheetPrompt` 是否把短篇分支覆盖掉。
- 如果 3 章项目出现开卷抓手、中段转向、高潮前挤压、卷尾钩子等完整长篇段落，优先检查分卷策略、卷骨架和 beat sheet 提示词是否继续使用长篇默认口径。
- 如果节奏板只覆盖到第 3 章但自动执行仍报“不能直接自动执行第 1-10 章”，优先检查 `clampDirectorAutoExecutionPlanToChapterBudget()` 是否被结构化大纲阶段调用，以及前端是否把短篇预计章数传给自动执行计划构建。
- 如果模型输出要求“第 30 章左右”，说明某个 prompt 或上下文标签又把比例兑现写回了固定章节号。

## Related Modules

- `shared/types/novelDirector.ts`
- `shared/types/volumePlanning.ts`
- `server/src/prompting/prompts/novel/directorPlanning.prompts.ts`
- `server/src/prompting/prompts/novel/volume/strategy.prompts.ts`
- `server/src/prompting/prompts/novel/volume/skeleton.prompts.ts`
- `server/src/prompting/prompts/novel/volume/beatSheet.prompts.ts`
- `server/src/services/novel/volume/volumeChapterBudgetAllocation.ts`
- `server/src/services/novel/volume/volumeBeatSheetChapterBudget.ts`
- `server/src/services/novel/volume/volumeGenerationSchemas.ts`
- `server/src/services/novel/director/automation/novelDirectorAutoExecution.ts`
- `server/src/services/novel/director/phases/novelDirectorStructuredOutlinePhase.ts`
- `client/src/pages/novels/novelBasicInfo.shared.ts`
