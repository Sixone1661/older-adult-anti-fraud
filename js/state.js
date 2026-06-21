(function () {
  let current = null;

  function createSessionId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "local-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
  }

  function normalizeSession(session) {
    if (!session) return null;
    session.scenarioIndex = Number.isInteger(session.scenarioIndex) ? session.scenarioIndex : 0;
    session.scenarioMessageStep = Number.isInteger(session.scenarioMessageStep) ? session.scenarioMessageStep : 0;
    session.scenarioHints = session.scenarioHints || {};
    session.scenarioSupportPreview = session.scenarioSupportPreview || {};
    session.scenarioAnswers = session.scenarioAnswers || {};
    session.trainingStageComplete = Boolean(session.trainingStageComplete);
    session.transferAnswer = session.transferAnswer || null;
    session.resultSnapshot = session.resultSnapshot || null;
    session.completed = Boolean(session.completed);
    return session;
  }

  function newSession() {
    const now = new Date().toISOString();
    return {
      schemaVersion: 1,
      sessionId: createSessionId(),
      role: null,
      route: "role",
      pretestIndex: 0,
      pretestAnswers: {},
      strategyOrder: ["ask", "stop", "check"],
      strategyCompleted: false,
      strategyStatus: "",
      scenarioIndex: 0,
      scenarioMessageStep: 0,
      scenarioHints: {},
      scenarioSupportPreview: {},
      scenarioAnswers: {},
      trainingStageComplete: false,
      transferAnswer: null,
      resultSnapshot: null,
      completed: false,
      completedAt: null,
      createdAt: now,
      updatedAt: now
    };
  }

  function save() {
    if (!current) return;
    current.updatedAt = new Date().toISOString();
    AntiFraudStorage.saveCurrent(current);
  }

  function init() {
    current = normalizeSession(AntiFraudStorage.getCurrent());
    if (current && !current.sessionId) current = null;
  }

  function get() { return current; }
  function startNew() { current = newSession(); save(); return current; }
  function setRoute(route) { if (current) { current.route = route; save(); } }
  function setRole(role) { current.role = role; current.route = "instructions"; save(); }

  function submitPretest(question, option, elapsed) {
    if (!current || current.pretestAnswers[question.id]) return false;
    const answer = {
      selectedOption: option.id,
      isCorrect: option.is_correct,
      decisionTimeMs: Math.min(300000, Math.max(0, Math.round(elapsed))),
      submittedAt: new Date().toISOString()
    };
    current.pretestAnswers[question.id] = answer;
    save();
    AntiFraudStorage.appendLog({
      session_id: current.sessionId,
      role: current.role,
      scenario_id: question.id,
      phase: "pretest",
      selected_option: option.id,
      is_correct: option.is_correct,
      decision_time_ms: answer.decisionTimeMs,
      hint_used: false,
      verification_action: option.verification_action,
      help_seeking_action: option.help_seeking_action,
      completed_at: answer.submittedAt
    });
    return true;
  }

  function advancePretest() {
    if (current.pretestIndex < ANTI_FRAUD_DATA.pretest.length - 1) {
      current.pretestIndex += 1;
      save();
      return "pretest";
    }
    current.route = "strategy";
    save();
    return "strategy";
  }

  function moveStrategy(index, direction) {
    if (!current || current.strategyCompleted) return;
    const target = index + direction;
    if (target < 0 || target >= current.strategyOrder.length) return;
    const order = [...current.strategyOrder];
    [order[index], order[target]] = [order[target], order[index]];
    current.strategyOrder = order;
    current.strategyStatus = "";
    save();
  }

  function checkStrategy() {
    const correct = ANTI_FRAUD_CONTENT.strategyCorrectOrder;
    const isCorrect = current.strategyOrder.every((id, index) => id === correct[index]);
    current.strategyStatus = isCorrect ? "correct" : "try-again";
    if (isCorrect) current.strategyCompleted = true;
    save();
    return isCorrect;
  }

  function startScenarioTraining() {
    if (!current || !current.strategyCompleted) return false;
    current.route = "scenario";
    current.scenarioIndex = Math.min(current.scenarioIndex, ANTI_FRAUD_DATA.scenarios.length - 1);
    current.scenarioMessageStep = Math.max(0, current.scenarioMessageStep);
    save();
    return true;
  }

  function getCurrentScenario() {
    if (!current) return null;
    return ANTI_FRAUD_DATA.scenarios[current.scenarioIndex] || null;
  }

  function revealNextMessage() {
    const scenario = getCurrentScenario();
    if (!scenario || current.scenarioAnswers[scenario.id]) return;
    current.scenarioMessageStep = Math.min(current.scenarioMessageStep + 1, scenario.messages.length - 1);
    save();
  }

  function showSupportPreview() {
    const scenario = getCurrentScenario();
    if (!scenario) return;
    current.scenarioSupportPreview[scenario.id] = true;
    save();
  }

  function useScenarioHint() {
    const scenario = getCurrentScenario();
    if (!scenario || scenario.support_level === "full") return;
    current.scenarioHints[scenario.id] = true;
    save();
  }

  function submitScenario(scenario, option, elapsed) {
    if (!current || current.scenarioAnswers[scenario.id]) return false;
    const submittedAt = new Date().toISOString();
    const answer = {
      selectedOption: option.id,
      isCorrect: option.is_correct,
      decisionTimeMs: Math.min(300000, Math.max(0, Math.round(elapsed))),
      hintUsed: Boolean(current.scenarioHints[scenario.id]),
      submittedAt
    };
    current.scenarioAnswers[scenario.id] = answer;
    save();
    AntiFraudStorage.appendLog({
      session_id: current.sessionId,
      role: current.role,
      scenario_id: scenario.id,
      phase: "training",
      selected_option: option.id,
      is_correct: option.is_correct,
      decision_time_ms: answer.decisionTimeMs,
      hint_used: answer.hintUsed,
      verification_action: option.verification_action,
      help_seeking_action: option.help_seeking_action,
      completed_at: submittedAt
    });
    return true;
  }

  function advanceScenario() {
    if (!current) return "welcome";
    const scenario = getCurrentScenario();
    if (!scenario || !current.scenarioAnswers[scenario.id]) return "scenario";
    if (current.scenarioIndex < ANTI_FRAUD_DATA.scenarios.length - 1) {
      current.scenarioIndex += 1;
      current.scenarioMessageStep = 0;
      current.route = "scenario";
      save();
      return "scenario";
    }
    current.trainingStageComplete = true;
    current.route = "transfer";
    save();
    return "transfer";
  }

  function submitTransfer(option, elapsed) {
    if (!current || current.transferAnswer) return false;
    const submittedAt = new Date().toISOString();
    current.transferAnswer = {
      selectedOption: option.id,
      isCorrect: option.is_correct,
      decisionTimeMs: Math.min(300000, Math.max(0, Math.round(elapsed))),
      submittedAt
    };
    save();

    AntiFraudStorage.appendLog({
      session_id: current.sessionId,
      role: current.role,
      scenario_id: ANTI_FRAUD_DATA.transfer.id,
      phase: "transfer",
      selected_option: option.id,
      is_correct: option.is_correct,
      decision_time_ms: current.transferAnswer.decisionTimeMs,
      hint_used: false,
      verification_action: option.verification_action,
      help_seeking_action: option.help_seeking_action,
      completed_at: submittedAt
    });

    current.resultSnapshot = AntiFraudMetrics.calculate(current.sessionId);
    current.completed = true;
    current.completedAt = submittedAt;
    current.route = "transfer";
    save();

    AntiFraudStorage.addCompletedSession({
      session_id: current.sessionId,
      role: current.role,
      completed_at: submittedAt,
      correct_count: current.resultSnapshot.correct_count,
      total_count: 4,
      identification_accuracy_percent: current.resultSnapshot.identification_accuracy_percent,
      transfer_correct: current.resultSnapshot.transfer_correct
    });
    return true;
  }

  function showResults() {
    if (!current?.completed) return false;
    current.route = "results";
    save();
    return true;
  }

  function showSafetyCard() {
    if (!current?.completed) return false;
    current.route = "safety-card";
    save();
    return true;
  }

  function resetAfterClear() { current = null; }

  window.AntiFraudState = {
    init, get, startNew, setRoute, setRole, submitPretest,
    advancePretest, moveStrategy, checkStrategy, startScenarioTraining,
    getCurrentScenario, revealNextMessage, showSupportPreview, useScenarioHint,
    submitScenario, advanceScenario, submitTransfer, showResults, showSafetyCard,
    resetAfterClear, save
  };
}());

