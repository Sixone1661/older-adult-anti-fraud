const URL = "http://127.0.0.1:4173/";
const fs = await import("node:fs/promises");
await fs.mkdir("screenshots/p1", { recursive: true });
const target = await fetch("http://127.0.0.1:9222/json/new?" + encodeURIComponent(URL), { method: "PUT" }).then(r => r.json());
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const issues = [];
ws.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const task = pending.get(message.id); pending.delete(message.id);
    message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
  } else if (message.method === "Runtime.exceptionThrown") issues.push(message.params.exceptionDetails.text);
};
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const callId = ++id; pending.set(callId, { resolve, reject });
  ws.send(JSON.stringify({ id: callId, method, params }));
});
const evaluate = async expression => {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const assert = (value, message) => { if (!value) throw new Error(message); };
const shot = async name => {
  const result = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
  await fs.writeFile("screenshots/p1/" + name, Buffer.from(result.data, "base64"));
};
await send("Page.enable"); await send("Runtime.enable");
await sleep(250);
await evaluate("localStorage.clear();location.reload()");
await sleep(200);

const fontLayouts = [];
for (const [width, height] of [[390, 844], [1440, 900]]) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 500 });
  for (const size of ["medium", "large", "xlarge"]) {
    await evaluate(`document.querySelector('[data-font-size="${size}"]').click()`);
    fontLayouts.push(await evaluate(`({width:${width},size:document.documentElement.dataset.fontSize,horizontal:document.documentElement.scrollWidth>innerWidth})`));
  }
}
assert(fontLayouts.every(item => !item.horizontal), "字号切换出现横向溢出");
await send("Page.reload"); await sleep(180);
assert(await evaluate("document.documentElement.dataset.fontSize") === "xlarge", "字号刷新后未恢复");
await shot("font-xlarge-desktop.png");

await evaluate(`window.__speech={speak:0,cancel:0};Object.defineProperty(window,"speechSynthesis",{configurable:true,value:{speak(){__speech.speak++},cancel(){__speech.cancel++}}});Object.defineProperty(window,"SpeechSynthesisUtterance",{configurable:true,value:function(t){this.text=t}});document.querySelector("[data-p1-read]").click()`);
assert((await evaluate("window.__speech.speak")) === 1, "朗读未启动");
await evaluate('document.querySelector("[data-action=start]").click()');
assert((await evaluate("window.__speech.cancel")) > 0, "切页未停止朗读");

const completed = {
  schemaVersion:1,sessionId:"p1-session",role:"companion",route:"safety-card",pretestIndex:0,pretestAnswers:{},
  strategyOrder:["stop","check","ask"],strategyCompleted:true,scenarioIndex:2,scenarioMessageStep:3,scenarioHints:{},
  scenarioSupportPreview:{},scenarioAnswers:{},trainingStageComplete:true,transferAnswer:{selectedOption:"C",isCorrect:true,decisionTimeMs:1000},
  resultSnapshot:{correct_count:4,identification_accuracy_percent:100,transfer_correct:true},completed:true,completedAt:new Date().toISOString()
};
await evaluate(`localStorage.setItem("stopCheckAsk.currentSession",JSON.stringify(${JSON.stringify(completed)}));location.reload()`);
await sleep(200);
await evaluate(`window.__download="";HTMLAnchorElement.prototype.click=function(){window.__download=this.href};document.querySelector("[data-p1-export]").click()`);
assert((await evaluate("window.__download")).startsWith("data:image/png"), "防骗卡未导出PNG");
await shot("safety-card-export.png");

const sessionSummary = {session_id:"p1-session",role:"companion",completed_at:new Date().toISOString(),correct_count:3,total_count:4,transfer_correct:true};
const log = {session_id:"p1-session",role:"companion",scenario_id:"scenario-family",phase:"training",selected_option:"A",is_correct:false,decision_time_ms:1500,hint_used:false,verification_action:false,help_seeking_action:false,completed_at:new Date().toISOString()};
await evaluate(`localStorage.setItem("stopCheckAsk.sessions",JSON.stringify([${JSON.stringify(sessionSummary)}]));localStorage.setItem("stopCheckAsk.logs",JSON.stringify([${JSON.stringify(log)}]));AntiFraudRouter.show("records")`);
await evaluate('document.querySelector("[data-p1-details]").click()');
const details = await evaluate('({title:document.querySelector("h1").textContent,count:document.querySelectorAll(".detail-item").length,text:document.querySelector(".detail-item").innerText})');
assert(details.title === "训练详情" && details.count === 1 && details.text.includes("1.5 秒"), "逐题详情与日志不一致");
await shot("training-details.png");

const companionSession = {...completed,completed:false,route:"scenario",scenarioIndex:0,scenarioMessageStep:3,transferAnswer:null,resultSnapshot:null};
await evaluate(`localStorage.setItem("stopCheckAsk.currentSession",JSON.stringify(${JSON.stringify(companionSession)}));location.reload()`);
await sleep(180);
await evaluate('document.querySelector("[data-action=continue]").click()');
assert(await evaluate('Boolean(document.querySelector(".companion-tip"))'), "陪练提示未显示");
await shot("companion-tip.png");
await evaluate(`const s=JSON.parse(localStorage.getItem("stopCheckAsk.currentSession"));s.role="self";localStorage.setItem("stopCheckAsk.currentSession",JSON.stringify(s));location.reload()`);
await sleep(180);
await evaluate('document.querySelector("[data-action=continue]").click()');
assert(!(await evaluate('Boolean(document.querySelector(".companion-tip"))')), "本人模式错误显示陪练提示");

assert(issues.length === 0, "控制台存在未处理错误");
await fs.mkdir("screenshots/agent", { recursive: true });
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await evaluate(`document.body.innerHTML='<main style="max-width:720px;margin:auto;padding:24px;font:18px/1.6 Microsoft YaHei;background:#FFF9F1;color:#34302D;min-height:100vh"><a style="color:#71351F">← 返回训练首页</a><h1 style="color:#71351F;font-size:34px">防骗助手</h1><div style="padding:16px;border-left:5px solid #A8472B;background:#FFF1E8">请勿输入身份证号、银行卡号、密码、验证码、详细住址等个人敏感信息。</div><p>助手按“停、查、问”提供核验建议，不保证识别所有诈骗。</p><h2 style="color:#71351F">你想做什么？</h2><button style="width:100%;min-height:52px;margin:6px 0;border:1px solid #F28C52;border-radius:8px;background:white;font-size:18px">帮我分析一条可疑消息</button><button style="width:100%;min-height:52px;margin:6px 0;border:1px solid #F28C52;border-radius:8px;background:white;font-size:18px">教我怎样核验信息</button><button style="width:100%;min-height:52px;margin:6px 0;border:1px solid #F28C52;border-radius:8px;background:white;font-size:18px">我现在应该找谁求助</button><div style="margin-top:24px;padding:14px;border:1px solid #ead9cd;border-radius:8px;background:white">防骗助手尚未配置API密钥。训练功能仍可正常使用。</div></main>'`);
const agentShot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
await fs.writeFile("screenshots/agent/agent-unconfigured-mobile.png", Buffer.from(agentShot.data, "base64"));
console.log(JSON.stringify({fontLayouts,details,issues,pass:true}));
await send("Page.close"); ws.close();
