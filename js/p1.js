(function () {
  const SETTINGS_KEY = "stopCheckAsk.p1.settings.v1";
  const DEFAULTS = { version: 1, fontSize: "medium" };
  let detailSessionId = null;

  function loadSettings() {
    try {
      const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
      return value?.version === 1 ? { ...DEFAULTS, ...value } : { ...DEFAULTS };
    } catch (error) {
      return { ...DEFAULTS };
    }
  }

  function saveSettings(settings) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (error) { /* optional preference */ }
  }

  function applyFontSize(value) {
    const allowed = ["medium", "large", "xlarge"];
    const size = allowed.includes(value) ? value : "medium";
    document.documentElement.dataset.fontSize = size;
    document.querySelectorAll("[data-font-size]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.fontSize === size));
    });
    saveSettings({ version: 1, fontSize: size });
  }

  function stopSpeech() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    document.querySelector("[data-speech-status]")?.replaceChildren(document.createTextNode(""));
  }

  function speakCurrent() {
    const status = document.querySelector("[data-speech-status]");
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance !== "function") {
      if (status) status.textContent = "当前浏览器不支持语音朗读，请直接阅读页面文字。";
      return;
    }
    stopSpeech();
    const copy = document.getElementById("app-main")?.cloneNode(true);
    copy?.querySelectorAll("button, input, .top-actions, .training-progress").forEach((node) => node.remove());
    const text = copy?.innerText?.replace(/\s+/g, " ").trim();
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 6000));
    utterance.lang = "zh-CN";
    utterance.rate = 0.88;
    utterance.onend = () => { if (status) status.textContent = "朗读已结束。"; };
    utterance.onerror = () => { if (status) status.textContent = "朗读未能完成，请稍后重试。"; };
    window.speechSynthesis.speak(utterance);
    if (status) status.textContent = "正在朗读当前页面。";
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const chars = [...text];
    let line = "";
    let currentY = y;
    chars.forEach((char) => {
      const candidate = line + char;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        ctx.fillText(line, x, currentY);
        line = char;
        currentY += lineHeight;
      } else line = candidate;
    });
    if (line) ctx.fillText(line, x, currentY);
    return currentY + lineHeight;
  }

  function exportSafetyCard() {
    const status = document.querySelector("[data-export-status]");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1600;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#FFF9F1";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#FFFFFF";
      ctx.strokeStyle = "#C65F2F";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(70, 70, 1060, 1460, 24);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#71351F";
      ctx.font = "bold 64px Microsoft YaHei, sans-serif";
      ctx.fillText("我的停、查、问防骗卡", 130, 180);
      const steps = [
        ["停一下", "催转账、要验证码、要求保密时，先暂停。"],
        ["查来源", "使用原号码、官网或官方客服独立核验。"],
        ["问家人", "拿不准时，询问家人、银行或社区工作人员。"]
      ];
      let y = 300;
      steps.forEach(([title, text]) => {
        ctx.fillStyle = "#F28C52";
        ctx.beginPath(); ctx.roundRect(125, y - 64, 220, 86, 18); ctx.fill();
        ctx.fillStyle = "#FFFFFF"; ctx.font = "bold 42px Microsoft YaHei, sans-serif"; ctx.fillText(title, 155, y - 8);
        ctx.fillStyle = "#34302D"; ctx.font = "36px Microsoft YaHei, sans-serif";
        y = wrapText(ctx, text, 385, y - 18, 650, 54) + 72;
      });
      ctx.fillStyle = "#71351F"; ctx.font = "bold 48px Microsoft YaHei, sans-serif"; ctx.fillText("四条底线", 130, y);
      ctx.fillStyle = "#34302D"; ctx.font = "34px Microsoft YaHei, sans-serif";
      const lines = ["1. 陌生号码不直接转账。", "2. 验证码不告诉任何人。", "3. 不开启陌生人的屏幕共享或远程控制。", "4. 对所谓“稳赚不赔”保持警惕。"];
      lines.forEach((line) => { y = wrapText(ctx, line, 145, y + 74, 900, 52); });
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      link.download = "停一下-个人防骗卡-" + date + ".png";
      link.href = canvas.toDataURL("image/png");
      link.click();
      if (status) status.textContent = "防骗卡图片已生成。如下载未开始，也可以使用手机长截图保存。";
    } catch (error) {
      if (status) status.textContent = "暂时无法导出图片，请使用手机长截图保存防骗卡。";
    }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[char]);
  }

  function companionTip(view) {
    if (AntiFraudState.get()?.role !== "companion" || !["instructions", "scenario", "results"].includes(view)) return;
    const target = document.querySelector(".page__header");
    if (!target) return;
    const text = view === "scenario"
      ? "可以先问：这条消息为什么要求马上处理？请鼓励学习者说出理由，不要直接替他作答。"
      : "请用提问和等待来支持判断，不直接给答案；学习提示和陪练建议分别记录。";
    target.insertAdjacentHTML("afterend", '<aside class="companion-tip" aria-labelledby="companion-tip-title"><h2 id="companion-tip-title">陪练建议</h2><p>' +
      escapeHtml(text) + '</p><p><strong>说明：</strong>这不是学习提示，不计入提示次数。</p></aside>');
  }

  function addAgentEntry(view) {
    if (!["welcome", "results"].includes(view)) return;
    const actions = document.querySelector(".page__actions");
    if (actions) actions.insertAdjacentHTML("beforeend", '<a class="text-link-button" href="/?view=agent" target="_top">打开防骗助手</a>');
  }

  function decorateSafetyCard(view) {
    if (view !== "safety-card") return;
    const actions = document.querySelector(".page__actions");
    if (!actions) return;
    actions.insertAdjacentHTML("afterbegin", '<button class="button button--secondary" type="button" data-p1-export>保存为图片</button><p class="export-status" data-export-status role="status"></p>');
  }

  function decorateRecords(view) {
    if (view !== "records") return;
    const sessions = AntiFraudStorage.getSessions();
    document.querySelectorAll(".session-summary").forEach((item, index) => {
      const session = sessions[index];
      if (!session?.session_id) return;
      item.insertAdjacentHTML("beforeend", '<button class="button button--secondary" type="button" data-p1-details="' +
        escapeHtml(session.session_id) + '">查看训练详情</button>');
    });
  }

  function scenarioById(id) {
    return [...ANTI_FRAUD_DATA.scenarios, ANTI_FRAUD_DATA.transfer].find((item) => item.id === id);
  }

  function renderDetails() {
    const summary = AntiFraudStorage.getSessions().find((item) => item.session_id === detailSessionId);
    const logs = AntiFraudStorage.getLogs().filter((item) => item.session_id === detailSessionId && ["training", "transfer"].includes(item.phase));
    const items = logs.length ? logs.map((log) => {
      const scenario = scenarioById(log.scenario_id);
      const option = scenario?.options?.find((item) => item.id === log.selected_option);
      const missed = log.is_correct ? "本题已识别主要风险线索" : (option?.missed_cues?.join("、") || "记录中没有该项信息");
      return '<article class="detail-item"><h2>' + escapeHtml(scenario?.title || log.scenario_id || "未知情境") + '</h2><dl>' +
        '<dt>首次选择</dt><dd>' + escapeHtml(log.selected_option || "缺失") + (option?.text ? "．" + escapeHtml(option.text) : "") + '</dd>' +
        '<dt>是否正确</dt><dd>' + (log.is_correct === true ? "是" : log.is_correct === false ? "否" : "缺失") + '</dd>' +
        '<dt>使用学习提示</dt><dd>' + (log.hint_used ? "是" : "否") + '</dd><dt>进行了独立核验</dt><dd>' + (log.verification_action ? "是" : "否") + '</dd>' +
        '<dt>选择主动求助</dt><dd>' + (log.help_seeking_action ? "是" : "否") + '</dd><dt>决策时间</dt><dd>' +
        (Number.isFinite(log.decision_time_ms) ? (log.decision_time_ms / 1000).toFixed(1) + " 秒" : "缺失") + '</dd>' +
        '<dt>忽略的风险线索</dt><dd>' + escapeHtml(missed) + '</dd></dl></article>';
    }).join("") : '<div class="notice">这次训练的逐题数据缺失或已损坏，摘要记录仍可查看。</div>';
    const role = summary?.role === "companion" ? "家人陪练" : "本人训练";
    document.getElementById("app-main").innerHTML = '<section class="page" aria-labelledby="page-title"><div class="top-actions">' +
      '<button class="button button--quiet" type="button" data-p1-back-records>返回记录</button><button class="button button--quiet" type="button" data-action="home">回到首页</button></div>' +
      '<header class="page__header"><p class="page__eyebrow">' + role + '</p><h1 id="page-title">训练详情</h1><p>这里根据本机已有匿名日志展示首次作答，不提供风险等级或能力诊断。</p></header>' +
      '<div class="detail-list">' + items + '</div></section>';
  }

  function installHeaderTools() {
    const header = document.querySelector(".site-header__inner");
    if (!header || header.querySelector(".header-tools")) return;
    header.insertAdjacentHTML("beforeend", '<div class="header-tools" aria-label="阅读设置"><span class="visually-hidden">字号</span>' +
      '<button class="tool-button" type="button" data-font-size="medium">中</button><button class="tool-button" type="button" data-font-size="large">大</button>' +
      '<button class="tool-button" type="button" data-font-size="xlarge">特大</button><button class="tool-button" type="button" data-p1-read aria-label="开始朗读当前页面">开始朗读</button>' +
      '<button class="tool-button" type="button" data-p1-stop aria-label="停止朗读">停止朗读</button><span class="visually-hidden" data-speech-status role="status"></span></div>');
    applyFontSize(loadSettings().fontSize);
  }

  const originalRender = AntiFraudRender.render.bind(AntiFraudRender);
  AntiFraudRender.render = function (view) {
    stopSpeech();
    if (view === "details") renderDetails();
    else originalRender(view);
    companionTip(view);
    addAgentEntry(view);
    decorateSafetyCard(view);
    decorateRecords(view);
  };

  document.addEventListener("click", (event) => {
    const size = event.target.closest("[data-font-size]");
    if (size) applyFontSize(size.dataset.fontSize);
    if (event.target.closest("[data-p1-read]")) speakCurrent();
    if (event.target.closest("[data-p1-stop]")) stopSpeech();
    if (event.target.closest("[data-p1-export]")) exportSafetyCard();
    const details = event.target.closest("[data-p1-details]");
    if (details) { detailSessionId = details.dataset.p1Details; AntiFraudRouter.show("details"); }
    if (event.target.closest("[data-p1-back-records]")) AntiFraudRouter.show("records");
  });
  window.addEventListener("DOMContentLoaded", installHeaderTools);
}());
