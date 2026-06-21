(function () {
  const KEYS = {
    current: "stopCheckAsk.currentSession",
    logs: "stopCheckAsk.logs",
    sessions: "stopCheckAsk.sessions",
    completionCount: "stopCheckAsk.completionCount",
    version: "stopCheckAsk.schemaVersion"
  };
  const memory = { current: null, logs: [], sessions: [], completionCount: 0, version: 1 };
  let persistent = false;
  let notice = "";

  function switchToMemory(message) {
    persistent = false;
    notice = message;
  }

  function clearPersistentData() {
    Object.values(KEYS).forEach((key) => {
      try { localStorage.removeItem(key); } catch (error) { /* storage unavailable */ }
    });
  }

  function init() {
    try {
      const testKey = "stopCheckAsk.__test";
      localStorage.setItem(testKey, "1");
      localStorage.removeItem(testKey);
    } catch (error) {
      switchToMemory("当前浏览器无法保存训练记录，本次仍可继续练习。");
      return;
    }

    persistent = true;
    try {
      for (const key of [KEYS.current, KEYS.logs, KEYS.sessions, KEYS.completionCount]) {
        const raw = localStorage.getItem(key);
        if (raw !== null) JSON.parse(raw);
      }
      localStorage.setItem(KEYS.version, "1");
    } catch (error) {
      clearPersistentData();
      localStorage.setItem(KEYS.version, "1");
      notice = "检测到损坏的本地记录，已安全清除。";
    }
  }

  function read(name, fallback) {
    if (!persistent) return memory[name] ?? fallback;
    try {
      const raw = localStorage.getItem(KEYS[name]);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
      clearPersistentData();
      notice = "检测到损坏的本地记录，已安全清除。";
      return fallback;
    }
  }

  function write(name, value) {
    if (!persistent) {
      memory[name] = value;
      return;
    }
    try {
      localStorage.setItem(KEYS[name], JSON.stringify(value));
    } catch (error) {
      memory[name] = value;
      switchToMemory("当前浏览器无法保存训练记录，本次仍可继续练习。");
    }
  }

  function getCurrent() { return read("current", null); }
  function saveCurrent(session) { write("current", session); }
  function removeCurrent() {
    memory.current = null;
    if (persistent) localStorage.removeItem(KEYS.current);
  }
  function getLogs() { return read("logs", []); }
  function appendLog(entry) {
    const logs = getLogs();
    const duplicate = logs.some((item) =>
      item.session_id === entry.session_id &&
      item.scenario_id === entry.scenario_id &&
      item.phase === entry.phase
    );
    if (!duplicate) write("logs", [...logs, entry]);
    return !duplicate;
  }
  function getSessions() { return read("sessions", []); }
  function getCompletionCount() { return Number(read("completionCount", 0)) || 0; }
  function addCompletedSession(summary) {
    const sessions = getSessions();
    if (sessions.some((item) => item.session_id === summary.session_id)) return false;
    write("sessions", [summary, ...sessions].slice(0, 10));
    write("completionCount", getCompletionCount() + 1);
    return true;
  }
  function clearAll() {
    memory.current = null;
    memory.logs = [];
    memory.sessions = [];
    memory.completionCount = 0;
    if (persistent) {
      clearPersistentData();
      localStorage.setItem(KEYS.version, "1");
    }
  }
  function getStatus() { return { persistent, notice }; }

  window.AntiFraudStorage = {
    init, getCurrent, saveCurrent, removeCurrent, getLogs, appendLog,
    getSessions, getCompletionCount, addCompletedSession, clearAll, getStatus
  };
}());

