(function () {
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[char]);
  }

  function progressMeta(session) {
    const route = session?.route;
    if (route === "instructions") return { value: 10, label: "训练说明" };
    if (route === "pretest") return { value: 15 + (session.pretestIndex * 5), label: "前测 " + (session.pretestIndex + 1) + " / 3" };
    if (route === "strategy") return { value: 35, label: "学习停、查、问" };
    if (route === "scenario") return { value: 50 + (session.scenarioIndex * 13), label: "情境 " + (session.scenarioIndex + 1) + " / 3" };
    if (route === "transfer") return { value: 90, label: "独立挑战" };
    if (route === "results" || route === "safety-card") return { value: 100, label: "训练完成" };
    return { value: 5, label: "准备开始" };
  }

  function injectProgress(view) {
    if (["welcome", "records"].includes(view)) return;
    const anchor = document.querySelector(".top-actions");
    const session = AntiFraudState.get();
    if (!anchor || !session) return;
    const meta = progressMeta(session);
    anchor.insertAdjacentHTML("afterend", '<div class="training-progress" aria-label="训练进度：' + escapeHtml(meta.label) +
      '"><span class="training-progress__label">' + escapeHtml(meta.label) +
      '</span><div class="training-progress__track" aria-hidden="true"><span class="training-progress__bar" style="--progress:' +
      meta.value + '%"></span></div></div>');
  }

  function decorateWelcome() {
    const header = document.querySelector(".page__header");
    if (!header) return;
    header.className = "hero-copy";
    const eyebrow = header.querySelector(".page__eyebrow");
    if (eyebrow) eyebrow.className = "hero-subtitle";
    const heading = header.querySelector("h1");
    if (heading) heading.textContent = "停一下";
    header.insertAdjacentHTML("beforeend", '<ul class="strategy-highlight" aria-label="核心策略"><li>停一下</li><li>查来源</li><li>问家人</li></ul>');
    const hero = document.createElement("div");
    hero.className = "hero-layout";
    header.before(hero);
    hero.append(header);
    hero.insertAdjacentHTML("beforeend", '<figure class="hero-illustration"><img src="assets/illustrations/hero-elder-family.png" alt="一位老年人与成年子女共同查看手机并核验信息"></figure>');
  }

  function decorateTransfer() {
    const label = document.querySelector(".scenario-meta .progress");
    if (!label) return;
    label.className = "challenge-label";
    label.textContent = "独立挑战";
  }

  const originalRender = AntiFraudRender.render.bind(AntiFraudRender);
  AntiFraudRender.render = function (view) {
    originalRender(view);
    injectProgress(view);
    if (view === "welcome") decorateWelcome();
    if (view === "transfer") decorateTransfer();
  };
}());

