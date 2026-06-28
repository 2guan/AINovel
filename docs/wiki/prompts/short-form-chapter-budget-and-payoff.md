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
- 提示词遇到 `chapter30Payoff` 时，应解释为“全书前 30% 位置的阶段兑现”，短篇按比例折算。

## Failure Modes

- 如果候选方案仍默认给出几十章，优先检查 `targetChapterCount` 的默认值、最小值和候选 schema。
- 如果 1-3 章项目在蓝图阶段失败，优先检查 arc 或 chapter shell 的 `min()` 约束是否重新变成多阶段长篇假设。
- 如果模型输出要求“第 30 章左右”，说明某个 prompt 或上下文标签又把比例兑现写回了固定章节号。

## Related Modules

- `shared/types/novelDirector.ts`
- `shared/types/volumePlanning.ts`
- `server/src/prompting/prompts/novel/directorPlanning.prompts.ts`
- `client/src/pages/novels/novelBasicInfo.shared.ts`
