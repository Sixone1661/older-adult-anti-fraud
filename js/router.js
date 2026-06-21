(function () {
  let visibleView = "welcome";

  function focusHeading() {
    window.requestAnimationFrame(() => {
      const heading = document.querySelector("main h1");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: false });
      }
    });
  }

  function show(view, options = {}) {
    visibleView = view;
    if (options.persist && AntiFraudState.get()) AntiFraudState.setRoute(view);
    AntiFraudRender.render(view);
    focusHeading();
  }

  function home() { show("welcome"); }
  function continueSession() {
    const session = AntiFraudState.get();
    show(session ? session.route : "welcome");
  }
  function refresh() { show(visibleView); }
  function getVisibleView() { return visibleView; }

  window.AntiFraudRouter = { show, home, continueSession, refresh, getVisibleView };
}());

