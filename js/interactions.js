(function () {
  const timer = {
    active: false,
    key: null,
    startedAt: 0,
    accumulated: 0,
    start(key) {
      if (this.active && this.key === key) return;
      this.active = true;
      this.key = key;
      this.accumulated = 0;
      this.startedAt = performance.now();
    },
    pause() {
      if (!this.active || !this.startedAt) return;
      this.accumulated += performance.now() - this.startedAt;
      this.startedAt = 0;
    },
    resume() {
      if (this.active && !this.startedAt) this.startedAt = performance.now();
    },
    stop() {
      if (!this.active) return 0;
      this.pause();
      const elapsed = Math.min(300000, this.accumulated);
      this.cancel();
      return elapsed;
    },
    cancel() {
      this.active = false;
      this.key = null;
      this.startedAt = 0;
      this.accumulated = 0;
    }
  };
  window.AntiFraudDecisionTimer = timer;

  let confirmAction = null;
  const dialog = document.getElementById("confirm-dialog");
  const message = document.getElementById("confirm-message");

  function openConfirm(action) {
    confirmAction = action;
    message.textContent = action === "restart"
      ? "重新开始会清除当前未完成进度，但不会删除已完成会话摘要。确定重新开始吗？"
      : "这会清除当前进度、逐题日志和已完成会话摘要。此操作无法撤销。";
    dialog.showModal();
    dialog.querySelector("[data-dialog-cancel]").focus();
  }

  function closeConfirm() {
    if (dialog.open) dialog.close();
    confirmAction = null;
  }

  document.addEventListener("submit", (event) => {
    if (event.target.matches("[data-pretest-form]")) {
      event.preventDefault();
      const selectedId = new FormData(event.target).get("pretest-option");
      if (!selectedId) return;
      const session = AntiFraudState.get();
      const question = ANTI_FRAUD_DATA.pretest[session.pretestIndex];
      const option = question.options.find((item) => item.id === selectedId);
      AntiFraudState.submitPretest(question, option, timer.stop());
      AntiFraudRouter.refresh();
      return;
    }

    if (event.target.matches("[data-scenario-form]")) {
      event.preventDefault();
      const selectedId = new FormData(event.target).get("scenario-option");
      if (!selectedId) return;
      const scenario = AntiFraudState.getCurrentScenario();
      const option = scenario.options.find((item) => item.id === selectedId);
      AntiFraudState.submitScenario(scenario, option, timer.stop());
      AntiFraudRouter.refresh();
      return;
    }

    if (event.target.matches("[data-transfer-form]")) {
      event.preventDefault();
      const selectedId = new FormData(event.target).get("transfer-option");
      if (!selectedId) return;
      const option = ANTI_FRAUD_DATA.transfer.options.find((item) => item.id === selectedId);
      AntiFraudState.submitTransfer(option, timer.stop());
      AntiFraudRouter.refresh();
    }
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;

    if (action === "start") {
      AntiFraudState.startNew();
      AntiFraudRouter.show("role");
    } else if (action === "continue") {
      AntiFraudRouter.continueSession();
    } else if (action === "restart") {
      openConfirm("restart");
    } else if (action === "records") {
      AntiFraudRouter.show("records");
    } else if (action === "home") {
      AntiFraudRouter.home();
    } else if (action === "back-role") {
      AntiFraudRouter.show("role", { persist: true });
    } else if (action === "choose-role") {
      AntiFraudState.setRole(button.dataset.role);
      AntiFraudRouter.show("instructions");
    } else if (action === "start-pretest") {
      AntiFraudRouter.show("pretest", { persist: true });
    } else if (action === "next-pretest") {
      AntiFraudRouter.show(AntiFraudState.advancePretest());
    } else if (action === "move-step") {
      AntiFraudState.moveStrategy(Number(button.dataset.index), Number(button.dataset.direction));
      AntiFraudRouter.refresh();
    } else if (action === "check-strategy") {
      AntiFraudState.checkStrategy();
      AntiFraudRouter.refresh();
    } else if (action === "start-scenarios") {
      if (AntiFraudState.startScenarioTraining()) AntiFraudRouter.show("scenario");
    } else if (action === "reveal-message") {
      AntiFraudState.revealNextMessage();
      AntiFraudRouter.refresh();
    } else if (action === "show-support-preview") {
      AntiFraudState.showSupportPreview();
      AntiFraudRouter.refresh();
    } else if (action === "use-scenario-hint") {
      AntiFraudState.useScenarioHint();
      AntiFraudRouter.refresh();
    } else if (action === "next-scenario") {
      AntiFraudRouter.show(AntiFraudState.advanceScenario());
    } else if (action === "show-results") {
      if (AntiFraudState.showResults()) AntiFraudRouter.show("results");
    } else if (action === "show-safety-card") {
      if (AntiFraudState.showSafetyCard()) AntiFraudRouter.show("safety-card");
    } else if (action === "clear-records") {
      openConfirm("clear");
    }
  });

  dialog.querySelector("[data-dialog-cancel]").addEventListener("click", closeConfirm);
  dialog.querySelector("[data-dialog-confirm]").addEventListener("click", () => {
    const action = confirmAction;
    closeConfirm();
    if (action === "restart") {
      AntiFraudState.startNew();
      AntiFraudRouter.show("role");
    } else if (action === "clear") {
      AntiFraudStorage.clearAll();
      AntiFraudState.resetAfterClear();
      AntiFraudRouter.show("records");
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && dialog.open) closeConfirm();
  });
}());


