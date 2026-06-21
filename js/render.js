(function () {
  const app = document.getElementById("app-main");

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[char]);
  }

  function storageNotice() {
    const status = AntiFraudStorage.getStatus();
    return status.notice ? '<div class="notice notice--storage" role="status">' + escapeHtml(status.notice) + "</div>" : "";
  }

  function topActions(backAction, backLabel = "返回") {
    const back = backAction ? '<button class="button button--quiet" type="button" data-action="' + backAction + '">' + backLabel + "</button>" : "<span></span>";
    return '<div class="top-actions">' + back + '<button class="button button--quiet" type="button" data-action="home">回到首页</button></div>';
  }

  function renderWelcome() {
    const session = AntiFraudState.get();
    const status = AntiFraudStorage.getStatus();
    const hasIncomplete = Boolean(session && !session.completed);
    const completedSummary = session?.completed ? session.resultSnapshot : null;
    let primaryActions;
    if (hasIncomplete) {
      primaryActions = '<button class="button" type="button" data-action="continue">继续上次训练</button>' +
        '<button class="button button--secondary" type="button" data-action="restart">重新开始</button>';
    } else if (session?.completed) {
      primaryActions = '<button class="button" type="button" data-action="restart">重新开始</button>';
    } else {
      primaryActions = '<button class="button" type="button" data-action="start">开始训练</button>';
    }
    const savedProgressNotice = hasIncomplete
      ? '<div class="notice" role="status">本次进度已保存在当前设备，可继续上次训练。</div>'
      : "";
    const completedCard = completedSummary
      ? '<div class="feedback"><h2>最近一次训练已完成</h2><p>答对 ' + completedSummary.correct_count +
        '/4 个情境；迁移题' + (completedSummary.transfer_correct ? '正确' : '需要复习') + '。</p></div>'
      : "";
    const recordsAction = status.persistent
      ? '<button class="button button--secondary" type="button" data-action="records">查看本地记录</button>'
      : "";

    app.innerHTML = '<section class="page" aria-labelledby="page-title">' +
      storageNotice() +
      '<header class="page__header"><p class="page__eyebrow">老年数字防骗情境训练</p><h1 id="page-title">遇到可疑信息，先“停一下”</h1>' +
      '<p>在安全的模拟情境中，练习遇事先停、独立核查、及时求助。</p></header>' +
      '<div class="notice"><strong>预计 10–15 分钟</strong><br>完成前测、策略练习、3 个训练情境和 1 个迁移题。</div>' +
      savedProgressNotice + completedCard + '<div class="page__actions">' + primaryActions + recordsAction + '</div></section>';
  }

  function stageLabel(session) {
    if (!session) return "无";
    if (session.route === "role") return "角色选择";
    if (session.route === "instructions") return "使用说明";
    if (session.route === "pretest") return "前测第 " + (session.pretestIndex + 1) + " 题";
    if (session.route === "strategy") return session.strategyCompleted ? "策略排序已完成" : "策略学习";
    if (session.route === "scenario") return "情境 " + (session.scenarioIndex + 1) + "，共 3 个";
    if (session.route === "training-complete") return "三个训练情境已完成";
    return "训练进行中";
  }

  function renderRecords() {
    const status = AntiFraudStorage.getStatus();
    if (!status.persistent) {
      app.innerHTML = '<section class="page" aria-labelledby="page-title"><div class="top-actions">' +
        '<button class="button button--quiet" type="button" data-action="home">返回首页</button><span></span></div>' +
        '<header class="page__header"><h1 id="page-title">本地学习记录</h1></header>' +
        '<div class="notice notice--storage">当前浏览器无法保存训练记录，本次仍可继续练习。</div></section>';
      return;
    }

    const session = AntiFraudState.get();
    const incomplete = session && !session.completed ? session : null;
    const sessions = AntiFraudStorage.getSessions();
    const completionCount = AntiFraudStorage.getCompletionCount();
    const last = sessions[0]?.completed_at
      ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(sessions[0].completed_at))
      : "暂无";
    const history = sessions.length
      ? '<ol class="session-history">' + sessions.map((item) => {
          const time = new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.completed_at));
          const role = item.role === "companion" ? "家人陪练" : "本人训练";
          return '<li class="session-summary"><div><strong>' + escapeHtml(time) + '</strong><span>' + role + '</span></div>' +
            '<p>答对 ' + item.correct_count + '/4；迁移题' + (item.transfer_correct ? '正确' : '需要复习') + '。</p></li>';
        }).join("") + '</ol>'
      : '<p class="empty-state">暂无已完成记录。</p>';

    app.innerHTML = '<section class="page" aria-labelledby="page-title">' +
      '<div class="top-actions"><button class="button button--quiet" type="button" data-action="home">返回首页</button><span></span></div>' +
      '<header class="page__header"><h1 id="page-title">本地学习记录</h1><p>数据只保存在当前浏览器；这里不展示逐题日志，也不包含姓名、电话或账号。</p></header>' +
      '<dl class="record-list"><div class="record-row"><dt>是否存在未完成训练</dt><dd>' + (incomplete ? '是：' + escapeHtml(stageLabel(incomplete)) : '否') + '</dd></div>' +
      '<div class="record-row"><dt>累计完成次数</dt><dd>' + completionCount + '</dd></div>' +
      '<div class="record-row"><dt>最近完成时间</dt><dd>' + escapeHtml(last) + '</dd></div></dl>' +
      (incomplete ? '<button class="button" type="button" data-action="continue">继续未完成训练</button>' : '') +
      '<section aria-labelledby="history-title"><h2 id="history-title">最近 10 次完成记录</h2>' + history + '</section>' +
      '<div class="page__actions"><button class="button button--danger" type="button" data-action="clear-records" ' +
      (!session && sessions.length === 0 && AntiFraudStorage.getLogs().length === 0 ? 'disabled' : '') +
      '>清除全部记录</button></div></section>';
  }

  function renderRole() {
    app.innerHTML = '<section class="page" aria-labelledby="page-title">' +
      topActions("home") +
      '<header class="page__header"><p class="page__eyebrow">第 1 步</p><h1 id="page-title">选择练习方式</h1><p>两种方式使用相同题目、流程和计分。</p></header>' +
      '<div class="page__actions page__actions--inline"><button class="button" type="button" data-action="choose-role" data-role="self">我自己练习</button>' +
      '<button class="button button--secondary" type="button" data-action="choose-role" data-role="companion">我陪家人练习</button></div></section>';
  }

  function renderInstructions() {
    app.innerHTML = '<section class="page" aria-labelledby="page-title">' +
      topActions("back-role") +
      '<header class="page__header"><p class="page__eyebrow">第 2 步</p><h1 id="page-title">开始前请了解</h1></header>' +
      '<div class="card"><ul><li>预计完成时间：10 至 15 分钟。</li><li>共有 3 个训练情境和 1 个迁移题。</li>' +
      '<li>可随时回到首页，未完成进度保存在本机。</li><li>错误不会受到批评；每次选择都会得到解释。</li><li>数据只保存在当前浏览器。</li></ul></div>' +
      '<div class="notice">所有内容均为模拟训练。请勿输入真实账号、密码或验证码。</div>' +
      '<div class="page__actions"><button class="button" type="button" data-action="start-pretest">我知道了，开始前测</button></div></section>';
  }

  function renderPretest() {
    const session = AntiFraudState.get();
    const question = ANTI_FRAUD_DATA.pretest[session.pretestIndex];
    const answer = session.pretestAnswers[question.id];
    const options = question.options.map((option) =>
      '<label class="option"><input type="radio" name="pretest-option" value="' + option.id + '" required><span><strong>' +
      option.id + ".</strong> " + escapeHtml(option.text) + "</span></label>"
    ).join("");
    const interaction = answer
      ? '<div class="feedback" role="status"><p class="selected-answer">你的选择：' + answer.selectedOption + ". " +
        escapeHtml(question.options.find((item) => item.id === answer.selectedOption).text) +
        '</p><p>选择已记录并锁定。前测阶段不在此解释答案。</p></div>' +
        '<button class="button" type="button" data-action="next-pretest">' +
        (session.pretestIndex === ANTI_FRAUD_DATA.pretest.length - 1 ? "学习“停、查、问”" : "下一题") + "</button>"
      : '<form data-pretest-form><fieldset><legend class="scenario-box">' + escapeHtml(question.prompt) + '</legend>' +
        '<div class="option-list">' + options + '</div></fieldset><div class="page__actions"><button class="button" type="submit">提交选择</button></div></form>';
    app.innerHTML = '<section class="page" aria-labelledby="page-title">' +
      topActions(null) +
      '<header class="page__header"><p class="progress">前测 ' + (session.pretestIndex + 1) + " / " + ANTI_FRAUD_DATA.pretest.length +
      '</p><h1 id="page-title">最安全的下一步是什么？</h1><p>每题只提交一次，提交后不能修改。</p></header>' +
      interaction + "</section>";
  }

  function renderStrategy() {
    const session = AntiFraudState.get();
    const steps = ANTI_FRAUD_CONTENT.strategySteps;
    const intro = steps.map((step) =>
      '<article class="strategy-card"><span class="strategy-card__mark" aria-hidden="true">' + step.short + '</span><h2>' +
      escapeHtml(step.label) + '</h2><p>' + escapeHtml(step.detail) + "</p></article>"
    ).join("");
    const ordered = session.strategyOrder.map((id, index) => {
      const step = steps.find((item) => item.id === id);
      const controls = session.strategyCompleted ? "" :
        '<div class="sort-controls"><button class="sort-control" type="button" data-action="move-step" data-index="' + index +
        '" data-direction="-1" aria-label="上移“' + escapeHtml(step.label) + '”" ' + (index === 0 ? "disabled" : "") + '>上移</button>' +
        '<button class="sort-control" type="button" data-action="move-step" data-index="' + index +
        '" data-direction="1" aria-label="下移“' + escapeHtml(step.label) + '”" ' + (index === session.strategyOrder.length - 1 ? "disabled" : "") + ">下移</button></div>";
      return '<li class="sort-item"><span>' + escapeHtml(step.label) + "</span>" + controls + "</li>";
    }).join("");
    let status = "";
    if (session.strategyStatus === "try-again") status = '<div class="notice" role="status">顺序还可以再想一想：遇到可疑信息时，第一步应该先做什么？</div>';
    if (session.strategyCompleted) status = '<div class="feedback" role="status"><h2>策略排序完成</h2><p>记住：先停，再查；无法确认时主动问。</p></div>';
    app.innerHTML = '<section class="page" aria-labelledby="page-title">' +
      topActions(null) +
      '<header class="page__header"><p class="page__eyebrow">核心策略</p><h1 id="page-title">记住“停、查、问”</h1><p>把三个安全步骤变成遇事时的固定动作。</p></header>' +
      '<div class="strategy-grid">' + intro + '</div><section aria-labelledby="sort-title"><h2 id="sort-title">把三张卡片排成正确顺序</h2>' +
      '<ol class="sort-list">' + ordered + '</ol>' + status +
      '<div class="page__actions">' +
      (session.strategyCompleted
        ? '<button class="button" type="button" data-action="start-scenarios">开始情境训练</button>'
        : '<button class="button" type="button" data-action="check-strategy">检查顺序</button>') +
      "</div></section></section>";
  }

  function renderSupport(scenario, session) {
    if (scenario.support_level === "full") {
      const previewOpen = Boolean(session.scenarioSupportPreview[scenario.id]);
      return '<aside class="support-panel" aria-labelledby="support-title"><h2 id="support-title">“停、查、问”完整提示</h2><p>' +
        escapeHtml(scenario.support.text) + '</p><button class="button button--secondary" type="button" data-action="show-support-preview" ' +
        (previewOpen ? "disabled" : "") + '>' + escapeHtml(scenario.support.preview_label) + "</button>" +
        (previewOpen ? '<ul class="cue-preview">' + scenario.support.preview.map((cue) => "<li>" + escapeHtml(cue) + "</li>").join("") + "</ul>" : "") +
        "</aside>";
    }
    const hintUsed = Boolean(session.scenarioHints[scenario.id]);
    const subtle = scenario.support_level === "weak" ? " help-entry--subtle" : "";
    return '<aside class="help-entry' + subtle + '">' +
      (!hintUsed
        ? '<button class="button button--secondary" type="button" data-action="use-scenario-hint">' + escapeHtml(scenario.support.label) + "</button>"
        : '<div class="support-panel" role="status"><h2>核验提示</h2><p>' + escapeHtml(scenario.support.text) + "</p></div>") +
      "</aside>";
  }

  function renderScenarioFeedback(scenario, answer) {
    const option = scenario.options.find((item) => item.id === answer.selectedOption);
    const cues = scenario.risk_cues.map((cue) => "<li>" + escapeHtml(cue) + "</li>").join("");
    return '<section class="scenario-feedback" aria-labelledby="feedback-title">' +
      '<div class="feedback"><h2 id="feedback-title">你的选择</h2><p class="selected-answer">' +
      option.id + ". " + escapeHtml(option.text) + '</p><p>' + escapeHtml(option.feedback) + "</p></div>" +
      '<section class="review-panel" aria-labelledby="cue-title"><h2 id="cue-title">风险线索回看</h2><ul class="risk-cues">' + cues + "</ul></section>" +
      '<section class="review-panel" aria-labelledby="strategy-review-title"><h2 id="strategy-review-title">这道题怎样用“停、查、问”</h2>' +
      '<dl class="strategy-review"><div><dt>停</dt><dd>' + escapeHtml(scenario.strategy.stop) + '</dd></div>' +
      '<div><dt>查</dt><dd>' + escapeHtml(scenario.strategy.check) + '</dd></div>' +
      '<div><dt>问</dt><dd>' + escapeHtml(scenario.strategy.ask) + "</dd></div></dl></section>" +
      '<div class="page__actions"><button class="button" type="button" data-action="next-scenario">' +
      (AntiFraudState.get().scenarioIndex === ANTI_FRAUD_DATA.scenarios.length - 1 ? "进入迁移练习" : "继续下一个情境") +
      "</button></div></section>";
  }

  function renderScenario() {
    const session = AntiFraudState.get();
    const scenario = AntiFraudState.getCurrentScenario();
    const answer = session.scenarioAnswers[scenario.id];
    const allMessagesVisible = session.scenarioMessageStep >= scenario.messages.length - 1;
    const messages = scenario.messages.slice(0, session.scenarioMessageStep + 1).map((message, index) =>
      '<li class="message-bubble"><span class="message-number">信息 ' + (index + 1) + '</span><p>' + escapeHtml(message) + "</p></li>"
    ).join("");

    let decision = "";
    if (answer) {
      decision = renderScenarioFeedback(scenario, answer);
    } else if (allMessagesVisible) {
      const options = scenario.options.map((option) =>
        '<label class="option"><input type="radio" name="scenario-option" value="' + option.id + '" required><span><strong>' +
        option.id + ".</strong> " + escapeHtml(option.text) + "</span></label>"
      ).join("");
      decision = '<form data-scenario-form><fieldset><legend class="scenario-question">你下一步会怎么做？</legend>' +
        '<div class="option-list">' + options + '</div></fieldset><div class="page__actions"><button class="button" type="submit">提交选择</button></div></form>';
    } else {
      decision = '<div class="page__actions"><button class="button" type="button" data-action="reveal-message">查看下一条信息</button></div>';
    }

    app.innerHTML = '<section class="page scenario-page" aria-labelledby="page-title">' +
      topActions(null) +
      '<header class="page__header"><div class="scenario-meta"><span class="progress">情境 ' + (session.scenarioIndex + 1) +
      '，共 ' + ANTI_FRAUD_DATA.scenarios.length + ' 个</span><span class="simulation-label">模拟训练</span></div>' +
      '<h1 id="page-title">' + escapeHtml(scenario.title) + '</h1><p>以下人物、号码、账户和平台均为虚构。</p></header>' +
      '<ol class="message-stream" aria-label="逐步呈现的情境信息">' + messages + "</ol>" +
      (!answer ? renderSupport(scenario, session) : "") +
      decision + "</section>";
  }

  function renderTransfer() {
    const session = AntiFraudState.get();
    const transfer = ANTI_FRAUD_DATA.transfer;
    const answer = session.transferAnswer;
    let interaction;
    if (!answer) {
      const options = transfer.options.map((option) =>
        '<label class="option"><input type="radio" name="transfer-option" value="' + option.id + '" required><span><strong>' +
        option.id + '.</strong> ' + escapeHtml(option.text) + '</span></label>'
      ).join('');
      interaction = '<form data-transfer-form><fieldset><legend class="scenario-question">你下一步会怎么做？</legend>' +
        '<div class="option-list">' + options + '</div></fieldset><div class="page__actions"><button class="button" type="submit">提交选择</button></div></form>';
    } else {
      const option = transfer.options.find((item) => item.id === answer.selectedOption);
      interaction = '<section class="scenario-feedback" aria-labelledby="transfer-feedback-title">' +
        '<div class="feedback"><h2 id="transfer-feedback-title">你的选择</h2><p class="selected-answer">' +
        option.id + '. ' + escapeHtml(option.text) + '</p><p>' + escapeHtml(option.feedback) + '</p></div>' +
        '<section class="review-panel" aria-labelledby="transfer-cues-title"><h2 id="transfer-cues-title">风险线索回看</h2><ul class="risk-cues">' +
        transfer.risk_cues.map((cue) => '<li>' + escapeHtml(cue) + '</li>').join('') + '</ul></section>' +
        '<div class="page__actions"><button class="button" type="button" data-action="show-results">查看训练结果</button></div></section>';
    }

    app.innerHTML = '<section class="page scenario-page" aria-labelledby="page-title">' + topActions(null) +
      '<header class="page__header"><div class="scenario-meta"><span class="progress">迁移练习</span><span class="simulation-label">模拟训练</span></div>' +
      '<h1 id="page-title">快递理赔</h1><p>这道题不提供过程提示。以下电话、软件和平台均为虚构。</p></header>' +
      '<div class="scenario-box"><p>' + escapeHtml(transfer.prompt) + '</p></div>' + interaction + '</section>';
  }

  function renderResults() {
    const session = AntiFraudState.get();
    const result = session.resultSnapshot || AntiFraudMetrics.calculate(session.sessionId);
    const missed = result.missed_cues.length
      ? '<ul class="risk-cues">' + result.missed_cues.map((item) => '<li>' + escapeHtml(item.cue) + (item.count > 1 ? '（' + item.count + '次）' : '') + '</li>').join('') + '</ul>'
      : '<p>' + escapeHtml(result.missed_cues_message) + '</p>';
    const recommendations = '<ul class="recommendation-list">' + result.recommendations.map((item) => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>';

    app.innerHTML = '<section class="page" aria-labelledby="page-title">' + topActions(null) +
      '<header class="page__header"><p class="page__eyebrow">训练完成</p><h1 id="page-title">本次训练结果</h1>' +
      '<p class="result-lead">答对 <strong>' + result.correct_count + '/4</strong> 个情境（' + result.identification_accuracy_percent + '%）</p></header>' +
      '<div class="metric-grid">' +
      '<article class="metric-card"><h2>迁移题结果</h2><p>' + (result.transfer_correct ? '正确' : '需要复习') + '</p></article>' +
      '<article class="metric-card"><h2>主动核验次数</h2><p>' + result.verification_count + ' 次</p></article>' +
      '<article class="metric-card"><h2>主动求助次数</h2><p>' + result.help_seeking_count + ' 次</p></article>' +
      '<article class="metric-card"><h2>主动查看提示次数</h2><p>' + result.hint_count + ' 次</p></article>' +
      '<article class="metric-card"><h2>平均决策时间</h2><p>' + result.average_decision_time_seconds.toFixed(1) + ' 秒</p></article></div>' +
      '<section class="review-panel" aria-labelledby="missed-title"><h2 id="missed-title">最常忽略的风险线索</h2>' + missed + '</section>' +
      '<section class="review-panel" aria-labelledby="recommend-title"><h2 id="recommend-title">个性化复习建议</h2>' + recommendations + '</section>' +
      '<div class="page__actions"><button class="button" type="button" data-action="show-safety-card">查看我的防骗卡</button>' +
      '<button class="button button--secondary" type="button" data-action="restart">重新训练</button>' +
      '<button class="button button--secondary" type="button" data-action="home">返回首页</button></div></section>';
  }

  function renderSafetyCard() {
    app.innerHTML = '<section class="page" aria-labelledby="page-title">' + topActions(null) +
      '<article class="safety-card"><header><p class="page__eyebrow">可保存为手机长截图</p><h1 id="page-title">我的停、查、问防骗卡</h1></header>' +
      '<dl class="safety-steps"><div><dt>停</dt><dd>催转账、要验证码、要求保密时，先暂停。</dd></div>' +
      '<div><dt>查</dt><dd>使用原号码、官网或官方客服独立核验。</dd></div>' +
      '<div><dt>问</dt><dd>拿不准时，询问家人、银行或社区工作人员。</dd></div></dl>' +
      '<section aria-labelledby="bottom-line-title"><h2 id="bottom-line-title">四条底线</h2><ol class="bottom-lines">' +
      '<li>陌生号码不直接转账。</li><li>验证码不告诉任何人。</li><li>不开启陌生人的屏幕共享或远程控制。</li><li>对所谓“稳赚不赔”保持警惕。</li>' +
      '</ol></section></article><div class="page__actions"><button class="button" type="button" data-action="restart">重新训练</button>' +
      '<button class="button button--secondary" type="button" data-action="home">返回首页</button></div></section>';
  }

  function render(view) {
    if (view === "welcome") renderWelcome();
    else if (view === "records") renderRecords();
    else if (view === "role") renderRole();
    else if (view === "instructions") renderInstructions();
    else if (view === "pretest") renderPretest();
    else if (view === "strategy") renderStrategy();
    else if (view === "scenario") renderScenario();
    else if (view === "transfer") renderTransfer();
    else if (view === "results") renderResults();
    else if (view === "safety-card") renderSafetyCard();
    else renderWelcome();

    const session = AntiFraudState.get();
    const pretestQuestion = session?.route === "pretest" ? ANTI_FRAUD_DATA.pretest[session.pretestIndex] : null;
    const scenario = session?.route === "scenario" ? AntiFraudState.getCurrentScenario() : null;
    const scenarioReady = scenario && session.scenarioMessageStep >= scenario.messages.length - 1;
    if (view === "pretest" && pretestQuestion && !session.pretestAnswers[pretestQuestion.id]) {
      AntiFraudDecisionTimer.start(pretestQuestion.id);
    } else if (view === "scenario" && scenarioReady && !session.scenarioAnswers[scenario.id]) {
      AntiFraudDecisionTimer.start(scenario.id);
    } else if (view === "transfer" && session && !session.transferAnswer) {
      AntiFraudDecisionTimer.start(ANTI_FRAUD_DATA.transfer.id);
    } else {
      AntiFraudDecisionTimer.cancel();
    }
  }

  window.AntiFraudRender = { render };
}());



