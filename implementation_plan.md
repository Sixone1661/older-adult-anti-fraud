# “停一下”老年数字防骗情境训练平台实施计划

> 依据：PRODUCT_REQUIREMENTS.md V1.0（2026-06-20）  
> 性质：开发前实施计划；不含网页代码，不修改或扩展产品范围。

## 1. 项目与环境检查

- 当前目录原有内容只有 `outputs/` 与 `work/`；没有网页文件、`package.json`、测试配置或既有框架，也不是 Git 仓库。
- Node.js v24.16.0、npm 11.13.0、`npx.cmd` 可用。PowerShell 会阻止 `npm.ps1`，后续应使用 `npm.cmd` / `npx.cmd`。
- 未发现 `python` 命令；Chrome/Edge 命令未在 PATH 中，浏览器实测时需另行确认安装位置。
- 因无既有技术栈，按 PRD 使用原生 HTML、CSS、JavaScript 与 `localStorage`。
- 单页、多视图；传统 `defer` 脚本按顺序加载，无构建步骤、无网络资源。移动端以 390px 为基线，桌面端限制最大内容宽度。
- 不加入登录、后端、数据库、真实支付、AI 接口或外部平台接入。

## 2. 建议文件结构

```text
product-requirements-md-1-2-3/
├── index.html
├── README.md
├── css/
│   ├── base.css
│   ├── layout.css
│   └── components.css
├── js/
│   ├── app.js
│   ├── router.js
│   ├── state.js
│   ├── storage.js
│   ├── metrics.js
│   ├── render.js
│   └── interactions.js
├── data/
│   ├── scenarios.js
│   └── content.js
├── docs/
│   ├── implementation_plan.md
│   ├── content_map.md
│   ├── data_dictionary.md
│   └── qa_report.md
└── screenshots/
```

职责：`app.js` 初始化；`router.js` 管视图、返回和标题焦点；`state.js` 是状态唯一入口；`storage.js` 管本地进度、日志和清除；`metrics.js` 计算结果；`render.js` 呈现；`interactions.js` 管作答、提示、排序和确认；两个 data 文件分别存题目/反馈与固定文案。仍是无框架、无构建的原生前端。

## 3. P0 功能、页面、文件与 JavaScript 状态

| P0 功能 | 页面/视图 | 主要文件 | 关键状态 |
|---|---|---|---|
| 欢迎/开始 | P01 `welcome` | `index.html`、`content.js`、`router.js` | `currentView`、`hasSavedProgress` |
| 角色选择 | P02 `role-select` | `content.js`、`state.js`、`interactions.js` | `role: null/self/companion` |
| 使用说明 | P03 `instructions` | `content.js`、`router.js` | `sessionId`、`startedAt` |
| 三题前测 | P04 `pretest` | `scenarios.js`、`render.js`、`interactions.js` | `pretestIndex`、`pretestAnswers`、`decisionStartedAt`、`answerLocked` |
| 策略与排序 | P05 `strategy` | `content.js`、`interactions.js`、`state.js` | `sortOrder`、`sortAttempts`、`strategySortCompleted` |
| 情境一完整支架 | P06 `scenario-family` | `scenarios.js`、`render.js`、`interactions.js` | `scenarioId`、`messageStep`、`selectedOption`、`feedbackVisible`、`hintUsed` |
| 情境二部分支架 | P07 `scenario-refund` | 同上 | 同上；支架级别由场景数据决定 |
| 情境三弱支架 | P08 `scenario-investment` | 同上 | 同上；默认隐藏提示 |
| 渐隐支架 | P06–P08 | `scenarios.js`、`render.js` | `supportLevel`、`hintUsedByScenario` |
| 迁移题 | P09 `transfer` | `scenarios.js`、`render.js`、`interactions.js` | `transferAnswer`、`decisionStartedAt`、`answerLocked` |
| 结果/推荐 | P10 `results` | `metrics.js`、`render.js` | 六项核心指标、`recommendations` |
| 防骗卡 | P11 `safety-card` | `content.js`、`render.js` | 不新增业务状态 |
| 重新训练 | P11/P01 确认层 | `interactions.js`、`state.js`、`storage.js` | `confirmAction`、新 `sessionId` |
| 本地日志/清除 | P01 入口、P12 最小视图 | `storage.js`、`render.js`、`interactions.js` | `savedSessions`、`hasSavedProgress`、`confirmAction` |
| 响应式/适老化 | 全页面 | CSS、`router.js` | `focusTarget` |
| 流程恢复 | 全页面 | `app.js`、`state.js`、`storage.js`、`router.js` | `currentSession`、步骤索引、答案锁定 |

状态包括会话身份、路由进度、答案、提示/核验/求助行为、反馈和确认、计时。结果由日志派生；DOM 只负责呈现。

## 4. 本地状态与核心流程

### 4.1 localStorage

| 键 | 内容 | 保存时机 |
|---|---|---|
| `stopCheckAsk.currentSession` | 未完成会话的角色、路由、步骤、已提交答案 | 角色选择、提交、查看提示、切页后 |
| `stopCheckAsk.logs` | PRD 第十三章逐题匿名日志 | 每次正式提交后 |
| `stopCheckAsk.sessions` | 已完成会话匿名摘要 | 首次到达结果页 |
| `stopCheckAsk.schemaVersion` | 数据结构版本 | 首次保存 |

`currentSession` 是实现“回首页后保存进度”的技术状态，不是新增功能。逐题日志严格使用 PRD 字段：`session_id`、`role`、`scenario_id`、`phase`、`selected_option`、`is_correct`、`decision_time_ms`、`hint_used`、`verification_action`、`help_seeking_action`、`completed_at`。前测写日志但不计最终正确率；结果现算；不保存自由输入或个人信息。

### 4.2 用户流程

- 本人：欢迎 → 角色 → 说明/匿名会话 → 三题前测并锁定 → 策略与排序 → 三个渐隐支架情境 → 无提示迁移题 → 结果/建议 → 防骗卡 → 返回或确认后重练。
- 家人陪练：题目、计分和主流程相同，只以 `role` 区分；专属提示是否属 P0 需确认。
- 中断恢复：关键变化后保存；回首页告知本机保存；恢复后已提交前测不可修改。
- 本地记录：P0 最小视图建议只显示未完成进度、完成次数、最近完成时间和清除入口；完整记录页留 P1。重新开始、清除均二次确认。

## 5. 开发阶段

1. **口径冻结**：确认第 7 节问题，补齐前测选项、排序规则、错误后行为、计分映射和逐页导航矩阵。
2. **静态骨架**：建立 P01–P11 语义视图，确定 390×844 与 1440×900 布局、字号、按钮、焦点和反馈基线。
3. **状态/路由/存储**：实现统一状态、视图切换、标题聚焦、答案锁定、保存恢复、重新开始与清除。
4. **前测/策略**：实现三题前测、计时、不即时解释、策略介绍和键盘/触摸均可用的排序。
5. **三个情境**：数据化消息、四选一、逐选项反馈、风险线索、策略回看和三档支架。
6. **迁移/结果/防骗卡**：实现无提示迁移，从日志计算指标和推荐，完成 390px 防骗卡。
7. **QA/交付**：执行全流程测试，补 README、内容映射、数据字典、QA 报告和截图。P0 通过前不启动 P1。

## 6. 测试方案

### 6.1 手机端（390×844）

- P01–P11 无横滚、遮挡、截字、按钮溢出；四个长选项和长反馈可读可点。
- 正文/一级/二级标题不低于 18/28/22px，按钮至少 48px 高。
- 防骗卡信息完整；系统字体放大、触摸滚动、快速双击不误提交。
- 在前测、每个情境反馈、迁移题前刷新：状态恢复且不重复写日志。

### 6.2 桌面端（1440×900）

- 内容不过度拉伸；100% 与 200% 缩放可操作。
- Tab、Shift+Tab、Enter、Space 可走全流程；焦点清晰、顺序合理、无键盘陷阱。
- 切页后焦点回标题；Chrome/Edge 布局、存储、计时一致，控制台无未处理错误。

### 6.3 完整学习流程

1. 本人全对：正确率 100%，迁移正确，行为次数符合冻结口径。
2. 全错：反馈对应、流程不中断、推荐匹配。
3. 混合答案：手算核对正确率、核验、求助、提示和平均时间。
4. 家人模式：计分不变，日志角色为 `companion`。
5. 三种支架/提示：自动与主动提示按最终口径计数。
6. 迁移题提交前无过程提示，提交后才展示线索。
7. 返回前测不可改答，且前测不进最终正确率。
8. 各关键步骤中断恢复，不丢步、不重复记分。
9. 重新训练二次确认并新建匿名会话。
10. 清除后当前会话、日志和摘要全部删除。
11. 断网后从首页走到防骗卡，不加载远程资源。
12. 存储中无个人信息；情境均标“模拟训练”；反馈不羞辱；无风险等级。
13. localStorage 不可用、损坏或版本不兼容时按确认后的降级规则处理。
14. 逐项覆盖 PRD 第十九章功能、视觉、内容和技术验收。

## 7. 需求冲突、遗漏与直接实现障碍

| 编号 | 问题 | 最小建议（均需确认） |
|---|---|---|
| R1 | P12 本地记录在页面表为 P1，但 P01 必须有入口，开发优先级又把日志/清除列 P0。 | P0 做最小记录视图与清除，完整查看留 P1。 |
| R2 | 第六章要求陪练专属提示，开发优先级却列 P1。 | 明确 P0 仅记录角色，还是包含专属提示。 |
| R3 | 三道前测只有题干，无选项、编号、最佳答案、行为标记。 | 编码前补齐内容表，不能由开发者自行编题。 |
| R4 | 排序把“不安全的先转账”也要求排进正确顺序。 | 明确“排序并剔除危险项”，或更换该项。 |
| R5 | 错误后“继续同一情境”未说明是否重答、按首次还是最终答案计分。 | 建议单次提交、反馈后继续回看；若重答需定义 attempts。 |
| R6 | 核验与求助边界不清；部分选项同时包含二者。 | 为每个选项冻结两个独立布尔标记。 |
| R7 | “最常忽略线索”无任何线索级数据，四选一不能唯一推导。 | 提供选项—线索映射及并列规则，或调整该展示口径。 |
| R8 | `hint_count` 未说明自动支架、风险回看、帮助按钮哪些计数。 | 建议仅统计主动点击，并冻结入口清单。 |
| R9 | 平均决策时间未规定后台、刷新、返回、看提示和异常长时间。 | 冻结起止、后台暂停和刷新规则。 |
| R10 | “可随时返回”缺逐页返回目标，且前测必须锁定。 | 建立逐页导航矩阵，区分可返回、只读回看、不可返回。 |

其他待补口径：

- 日志字段不含恢复所需页面/题号/消息步骤，需同意独立 `currentSession`。
- 欢迎页无“继续上次训练”文案，需确定自动恢复还是增加恢复分支。
- 未规定本地记录保留数量、期限、重复完成展示和上限。
- “必须阅读解释”缺可测条件，又禁止长等待；建议不设强制计时，让继续按钮位于完整反馈之后。
- “适合手机截图”未说明单屏或长截图；建议 P0 以 390px 无裁切/横滚为准，图片导出仍 P1。
- 全部错误选项缺最终逐字反馈稿；需先完成内容映射和审校。
- localStorage 不可用/损坏时的文案与降级策略未定义；建议允许无持久化继续。
- `session_id` 格式未定义；建议使用浏览器原生随机 UUID，仅本地去重。
- 完成状态与摘要写入时机未定义；建议迁移题完成后置为完成，结果页刷新不重复写入。

补齐 R1–R10 后，P0 均可用原生前端实现。当前直接障碍是内容、交互和计分口径缺失，不是技术限制。

## 8. 明确排除与启动条件

不实现登录、账号、后端/API、数据库/云同步、真实电话/短信/微信/银行/支付/快递/购物/投资平台、真实转账、AI/大模型、排行榜、社交、付费、风险诊断。字号三档、朗读、完整记录页、图片导出不提前混入 P0。

编码前必须：确认 R1–R10；批准 P0 页面—状态映射和最小记录范围；冻结每个选项的正确/核验/求助/提示标记；确认导航矩阵、恢复规则和指标示例。

