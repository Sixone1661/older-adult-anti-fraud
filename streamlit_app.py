from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components


ROOT = Path(__file__).resolve().parent
CSS_FILES = (
    "css/base.css",
    "css/layout.css",
    "css/components.css",
)
JS_FILES = (
    "data/content.js",
    "data/scenarios.js",
    "js/storage.js",
    "js/metrics.js",
    "js/state.js",
    "js/router.js",
    "js/render.js",
    "js/interactions.js",
    "js/app.js",
)


def read_text(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8-sig")


@st.cache_data(show_spinner=False)
def build_web_app() -> str:
    document = read_text("index.html")

    for relative_path in CSS_FILES:
        stylesheet = read_text(relative_path)
        link_tag = f'<link rel="stylesheet" href="{relative_path}">'
        document = document.replace(
            link_tag,
            f'<style data-source="{relative_path}">\n{stylesheet}\n</style>',
        )

    for relative_path in JS_FILES:
        script = read_text(relative_path)
        script_tag = f'<script defer src="{relative_path}"></script>'
        document = document.replace(
            script_tag,
            f'<script data-source="{relative_path}">\n{script}\n</script>',
        )

    resize_bridge = """
<script>
(() => {
  let lastHeight = 0;
  const reportHeight = () => {
    const height = Math.max(
      document.body?.scrollHeight || 0,
      document.documentElement?.scrollHeight || 0
    );
    if (height === lastHeight || height < 1) return;
    lastHeight = height;
    window.parent.postMessage(
      {
        isStreamlitMessage: true,
        type: "streamlit:setFrameHeight",
        height
      },
      "*"
    );
  };

  window.addEventListener("load", reportHeight);
  window.addEventListener("resize", reportHeight);
  new MutationObserver(reportHeight).observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true
  });
  new ResizeObserver(reportHeight).observe(document.documentElement);
  requestAnimationFrame(reportHeight);
})();
</script>
"""
    return document.replace("</body>", f"{resize_bridge}\n</body>")


st.set_page_config(
    page_title="停一下｜老年数字防骗情境训练",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown(
    """
<style>
#MainMenu, header, footer, [data-testid="stToolbar"] {
  display: none !important;
}
[data-testid="stAppViewContainer"],
[data-testid="stMain"] {
  background: #f7f5f2;
}
[data-testid="stMainBlockContainer"] {
  width: 100%;
  max-width: none;
  padding: 0;
}
iframe[title="streamlit.components.v1.html"] {
  display: block;
  width: 100%;
  border: 0;
}
</style>
""",
    unsafe_allow_html=True,
)

components.html(
    build_web_app(),
    height=1200,
    scrolling=True,
)

