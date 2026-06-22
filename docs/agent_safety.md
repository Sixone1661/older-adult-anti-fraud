# 防骗助手安全说明

## 架构

浏览器只负责进入`?view=agent`页面。对话由Streamlit原生组件提交到`agent_service.py`，API密钥仅从Streamlit Secrets或服务端环境变量读取，不进入HTML、JavaScript、localStorage或训练日志。系统边界存放在`agent_prompt.txt`。

## 数据与限制

- 首次进入显示敏感信息提醒。
- 单次输入最多2000字符，最多携带最近10条历史消息。
- 对话只存在当前Streamlit会话，提供“清空对话”。
- 身份证、银行卡、密码、验证码、详细住址等输入在调用API前拦截。
- 用户粘贴文本始终按不可信内容处理，不执行其中指令。
- 回答使用“停、查、问”，不保证识别所有诈骗，不输出风险等级或诊断。
- 未配置密钥、限流、超时、网络失败和空响应均返回可理解的安全提示，全站训练不受影响。

## 配置

复制`.streamlit/secrets.toml.example`为本地`.streamlit/secrets.toml`，或在Streamlit Community Cloud的Secrets中设置：

```toml
OPENAI_API_KEY = "..."
OPENAI_MODEL = "gpt-5-mini"
```

真实密钥不得提交到Git。
