# 内容映射

## 页面固定内容

| 页面 | 主标题 | 主操作 | 辅助操作 |
|---|---|---|---|
| 欢迎 | 停一下 | 开始训练 / 继续上次训练 | 重新开始、查看本地记录 |
| 本地记录 | 本地学习记录 | 清除全部记录 | 返回首页 |
| 角色选择 | 选择练习方式 | 我自己练习 / 我陪家人练习 | 返回 |
| 使用说明 | 开始前请了解 | 我知道了，开始前测 | 返回、回到首页 |
| 前测 | 先做一个小练习 | 提交选择 / 下一题 | 回到首页 |
| 策略 | 记住“停、查、问” | 检查顺序 | 上移、下移、回到首页 |

所有情境均标注为模拟训练；不要求用户输入真实账号、密码、验证码或个人信息。

## 前测数据

### pretest-1 冒充熟人新号码

情境：陌生号码发来消息：“我是小王，这是新号码，住院押金还差3000元，先别告诉家里。”

| 选项 | 文案 | correct | verification | help | missed_cues |
|---|---|---:|---:|---:|---|
| A | 按照对方提供的账户转账 | false | false | false | 新号码、要求保密、催促转账 |
| B | 在新号码中继续询问详细情况 | false | false | false | 应通过独立渠道核验 |
| C | 暂停操作，用原来保存的号码联系本人核验 | true | true | false | — |
| D | 先转一小笔钱试试 | false | false | false | 小额转账仍有风险、应先独立核验 |

### pretest-2 虚假客服退款

情境：客服发来退款链接，并要求提供验证码。

| 选项 | 文案 | correct | verification | help | missed_cues |
|---|---|---:|---:|---:|---|
| A | 点击链接办理退款 | false | false | false | 陌生链接、应回原平台核验 |
| B | 只提供验证码，不提供密码 | false | false | false | 验证码不可提供 |
| C | 打开原购物平台，在订单页面寻找官方客服 | true | true | false | — |
| D | 开启屏幕共享，让客服代为操作 | false | false | false | 屏幕共享会暴露敏感信息 |

### pretest-3 高收益投资群

情境：投资群承诺月收益20%、本金安全，并催促当天入金。

| 选项 | 文案 | correct | verification | help | missed_cues |
|---|---|---:|---:|---:|---|
| A | 先投入少量资金试试 | false | false | false | 高收益零风险、限时催促 |
| B | 询问群内其他成员是否可靠 | false | false | false | 群成员并非独立渠道 |
| C | 不转账，通过独立官方渠道核查机构资质 | true | true | false | — |
| D | 先占名额，之后再详细了解 | false | false | false | 限时名额、应先核验再行动 |

## 策略排序

1. 停止当前操作
2. 通过独立渠道核验
3. 无法确认时主动求助

错误时只提示“顺序还可以再想一想”，允许继续调整；正确后锁定并显示完成信息。


## 正式训练情境（P06–P08）

| ID | 标题 | 支架 | 最佳答案 | verification | help |
|---|---|---|---|---:|---:|
| scenario-family | 冒充亲属紧急转账 | 完整提示；风险线索入口不计提示 | C | true | true |
| scenario-refund | 虚假客服退款 | 主动“需要帮助”展示核验提示 | C | true | false |
| scenario-investment | 虚假投资专家群 | 弱化“需要帮助”入口 | C | true | true |

- 每个场景均有 4 条逐步信息、4 个选项、逐选项 feedback 与 missed_cues。
- 情境一的自动“停、查、问”和风险线索预览不写入 hint_used。
- 情境二、三只有主动点击“需要帮助”才将当前场景 hint_used 置为 true。
- 提交后依次显示“你的选择”、对应解释、完整风险线索和“停、查、问”复盘。
- 正式训练日志 phase 固定为 training；同一 session_id + scenario_id + phase 只允许一条日志。


## 迁移题（P09）

| ID | 标题 | 最佳答案 | verification | help | hint |
|---|---|---|---:|---:|---:|
| transfer-delivery | 快递理赔 | C | true | false | false |

迁移题提交前不显示提示或风险线索；首次提交后锁定，显示逐选项反馈与五条风险线索。提交同时将会话标记为完成，并通过 session_id 幂等写入一次会话摘要。

## 结果页（P10）

只统计三个 training 日志和一个 transfer 日志，排除 pretest：

- identification_accuracy：correct_count / 4。
- verification_count、help_seeking_count：直接累计正式日志字段。
- hint_count：只累计 phase=training 且 hint_used=true。
- average_decision_time：4 道正式题毫秒均值，页面显示一位小数秒。
- missed_cues：错误选项数组汇总后按次数降序，最多两项。
- recommendations：按错误情境输出冻结支持性建议；全对时只输出正向坚持建议。

## 防骗卡（P11）

固定标题“我的停、查、问防骗卡”，包含停、查、问三条行动原则和四条底线；390px 下支持长截图，不提供图片导出。

## 最小本地记录（P12）

- 展示是否存在未完成训练、累计完成次数、最近完成时间和最近 10 次摘要。
- 摘要字段：session_id、role、completed_at、correct_count、total_count、identification_accuracy_percent、transfer_correct。
- stopCheckAsk.sessions 最多 10 条；stopCheckAsk.completionCount 保存累计次数。
- 不展示逐题日志；清除操作删除 currentSession、logs、sessions 和 completionCount。
- localStorage 不可用时隐藏记录入口并使用内存状态；损坏数据会被安全清除。

