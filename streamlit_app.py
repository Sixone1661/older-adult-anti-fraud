from pathlib import Path
import os
import base64

import streamlit as st
import streamlit.components.v1 as components
from agent_service import MAX_INPUT_CHARS, ask_agent


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
    "js/ui-enhancements.js",
    "js/p1.js",
    "js/app.js",
)


def read_text(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8-sig")


def get_agent_config() -> tuple[str | None, str]:
    try:
        key = st.secrets.get("OPENAI_API_KEY")
        model = st.secrets.get("OPENAI_MODEL")
    except Exception:
        key = None
        model = None
    return key or os.getenv("OPENAI_API_KEY"), model or os.getenv("OPENAI_MODEL", "gpt-5-mini")


def render_agent_page() -> None:
    st.markdown('<a href="?" target="_self">← 返回训练首页</a>', unsafe_allow_html=True)
    st.title("防骗助手")
    st.warning("请勿输入身份证号、银行卡号、密码、验证码、详细住址等个人敏感信息。")
    st.caption("助手提供“停、查、问”的核验建议，不保证识别所有诈骗，也不替代银行、平台或警方的官方判断。")
    if "agent_messages" not in st.session_state:
        st.session_state.agent_messages = []
    st.subheader("你想做什么？")
    labels = ["帮我分析一条可疑消息", "教我怎样核验信息", "我现在应该找谁求助"]
    for column, label in zip(st.columns(3), labels):
        if column.button(label, use_container_width=True):
            st.session_state.agent_pending = label
    for message in st.session_state.agent_messages:
        with st.chat_message(message["role"]):
            st.write(message["content"])
    prompt = st.chat_input("请输入不含敏感信息的可疑内容", max_chars=MAX_INPUT_CHARS)
    prompt = prompt or st.session_state.pop("agent_pending", None)
    if prompt:
        history = list(st.session_state.agent_messages)
        st.session_state.agent_messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.write(prompt)
        api_key, model = get_agent_config()
        result = ask_agent(prompt, history, api_key, model)
        st.session_state.agent_messages.append({"role": "assistant", "content": result["message"]})
        with st.chat_message("assistant"):
            st.write(result["message"])
    if st.button("清空对话"):
        st.session_state.agent_messages = []
        st.rerun()


@st.cache_data(show_spinner=False)
def build_web_app() -> str:
    document = read_text("index.html")
    hero_data = base64.b64encode((ROOT / "assets/illustrations/hero-elder-family.png").read_bytes()).decode("ascii")

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

    # ui-enhancements.js creates the hero image element, so replace its path
    # only after every JavaScript file has been embedded into the document.
    document = document.replace(
        "assets/illustrations/hero-elder-family.png",
        f"data:image/png;base64,{hero_data}",
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

if st.query_params.get("view") == "agent":
    render_agent_page()
    st.stop()

st.markdown(
    """
<style>
#MainMenu, header, footer, [data-testid="stToolbar"] {
  display: none !important;
}
[data-testid="stAppViewContainer"],
[data-testid="stMain"] {
  background: #fff9f1;
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

