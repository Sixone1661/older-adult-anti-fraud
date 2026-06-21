(function () {
  const FORMAL_IDS = ["scenario-family", "scenario-refund", "scenario-investment", "transfer-delivery"];

  function findOption(scenarioId, optionId) {
    const scenario = scenarioId === ANTI_FRAUD_DATA.transfer.id
      ? ANTI_FRAUD_DATA.transfer
      : ANTI_FRAUD_DATA.scenarios.find((item) => item.id === scenarioId);
    return scenario?.options.find((item) => item.id === optionId) || null;
  }

  function calculate(sessionId) {
    const logs = AntiFraudStorage.getLogs()
      .filter((entry) => entry.session_id === sessionId && FORMAL_IDS.includes(entry.scenario_id))
      .sort((a, b) => FORMAL_IDS.indexOf(a.scenario_id) - FORMAL_IDS.indexOf(b.scenario_id));

    const correctCount = logs.filter((entry) => entry.is_correct).length;
    const verificationCount = logs.filter((entry) => entry.verification_action).length;
    const helpSeekingCount = logs.filter((entry) => entry.help_seeking_action).length;
    const hintCount = logs.filter((entry) => entry.phase === "training" && entry.hint_used).length;
    const totalDecisionTime = logs.reduce((sum, entry) => sum + Math.min(300000, Math.max(0, Number(entry.decision_time_ms) || 0)), 0);
    const averageDecisionTimeMs = logs.length ? totalDecisionTime / logs.length : 0;
    const transferLog = logs.find((entry) => entry.scenario_id === ANTI_FRAUD_DATA.transfer.id);

    const cueCounts = new Map();
    let cueOrder = 0;
    for (const entry of logs.filter((item) => !item.is_correct)) {
      const option = findOption(entry.scenario_id, entry.selected_option);
      for (const cue of option?.missed_cues || []) {
        const existing = cueCounts.get(cue);
        cueCounts.set(cue, existing ? { count: existing.count + 1, order: existing.order } : { count: 1, order: cueOrder++ });
      }
    }
    const missedCues = [...cueCounts.entries()]
      .sort((a, b) => b[1].count - a[1].count || a[1].order - b[1].order)
      .slice(0, 2)
      .map(([cue, detail]) => ({ cue, count: detail.count }));

    const wrongIds = new Set(logs.filter((entry) => !entry.is_correct).map((entry) => entry.scenario_id));
    let recommendations;
    if (correctCount === 4 && logs.length === 4) {
      recommendations = ["你已经能够识别本次训练中的主要风险线索，请继续在真实生活中坚持独立核验。"];
    } else {
      recommendations = [];
      if (wrongIds.has("scenario-family")) recommendations.push("建议复习：更换渠道核验身份，不在对方控制的聊天中完成核验。");
      if (wrongIds.has("scenario-refund")) recommendations.push("建议复习：验证码和屏幕共享都不能交给陌生客服。");
      if (wrongIds.has("scenario-investment")) recommendations.push("建议复习：警惕高收益、零风险、限时名额和群体从众压力。");
      if (wrongIds.has("transfer-delivery")) recommendations.push("建议重新练习完整的“停、查、问”策略。");
    }

    return {
      identification_accuracy: correctCount / 4,
      identification_accuracy_percent: Math.round((correctCount / 4) * 100),
      correct_count: correctCount,
      total_count: 4,
      verification_count: verificationCount,
      help_seeking_count: helpSeekingCount,
      hint_count: hintCount,
      average_decision_time_ms: averageDecisionTimeMs,
      average_decision_time_seconds: Number((averageDecisionTimeMs / 1000).toFixed(1)),
      transfer_correct: Boolean(transferLog?.is_correct),
      missed_cues: missedCues,
      missed_cues_message: missedCues.length ? "" : "本次训练已识别主要风险线索",
      recommendations,
      formal_log_count: logs.length
    };
  }

  window.AntiFraudMetrics = { calculate };
}());

