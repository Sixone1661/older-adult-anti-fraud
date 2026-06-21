(function () {
  function init() {
    AntiFraudStorage.init();
    AntiFraudState.init();
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) AntiFraudDecisionTimer.pause();
      else AntiFraudDecisionTimer.resume();
    });
    const session = AntiFraudState.get();
    const completedView = session?.completed && ["transfer", "results", "safety-card"].includes(session.route);
    AntiFraudRouter.show(completedView ? session.route : "welcome");
  }
  window.addEventListener("DOMContentLoaded", init);
}());


