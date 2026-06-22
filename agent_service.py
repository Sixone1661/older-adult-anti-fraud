from __future__ import annotations

from pathlib import Path
import re
from typing import Callable

from openai import OpenAI

ROOT = Path(__file__).resolve().parent
SYSTEM_PROMPT = (ROOT / "agent_prompt.txt").read_text(encoding="utf-8-sig")
MAX_INPUT_CHARS = 2000
MAX_HISTORY_MESSAGES = 10
SENSITIVE_PATTERNS = (
    re.compile(r"(身份证|银行卡|密码|验证码|详细住址|家庭住址)"),
    re.compile(r"(?<!\d)\d{15,19}(?!\d)"),
    re.compile(r"(?<!\d)\d{6}(?!\d)"),
)


def contains_sensitive_data(text: str) -> bool:
    return any(pattern.search(text) for pattern in SENSITIVE_PATTERNS)


def safe_history(history: list[dict]) -> list[dict]:
    cleaned = []
    for item in history[-MAX_HISTORY_MESSAGES:]:
        role = item.get("role")
        content = str(item.get("content", ""))[:MAX_INPUT_CHARS]
        if role in {"user", "assistant"} and content:
            cleaned.append({"role": role, "content": content})
    return cleaned


def ask_agent(
    user_text: str,
    history: list[dict],
    api_key: str | None,
    model: str,
    client_factory: Callable[..., object] = OpenAI,
) -> dict:
    text = user_text.strip()[:MAX_INPUT_CHARS]
    if not text:
        return {"ok": False, "message": "请输入需要分析的内容。"}
    if contains_sensitive_data(text):
        return {
            "ok": False,
            "message": "请先删除身份证号、银行卡号、密码、验证码或详细住址等敏感信息，再进行分析。现在先停止转账或共享屏幕，并联系可信家人或独立官方渠道核验。",
        }
    if not api_key:
        return {"ok": False, "message": "防骗助手尚未配置API密钥。训练功能仍可正常使用；部署者可在Streamlit Secrets中配置OPENAI_API_KEY。"}
    messages = [{"role": "system", "content": SYSTEM_PROMPT}, *safe_history(history), {"role": "user", "content": text}]
    try:
        client = client_factory(api_key=api_key, timeout=25.0)
        response = client.responses.create(model=model, input=messages)
        output = (getattr(response, "output_text", "") or "").strip()
        if not output:
            return {"ok": False, "message": "助手暂时没有返回内容，请稍后重试。"}
        return {"ok": True, "message": output}
    except Exception as error:
        name = type(error).__name__.lower()
        if "ratelimit" in name:
            message = "请求较多，请稍后再试。"
        elif "timeout" in name:
            message = "请求超时，请稍后重试。"
        else:
            message = "暂时无法连接防骗助手。请先停止操作，通过独立官方渠道核验，或联系可信家人。"
        return {"ok": False, "message": message}
