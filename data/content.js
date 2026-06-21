(function () {
  window.ANTI_FRAUD_CONTENT = Object.freeze({
    strategySteps: Object.freeze([
      { id: "stop", label: "停止当前操作", short: "停", detail: "先暂停，不被紧迫感推着走。" },
      { id: "check", label: "通过独立渠道核验", short: "查", detail: "用自己找到的原号码、官网或官方客服核验。" },
      { id: "ask", label: "无法确认时主动求助", short: "问", detail: "拿不准就问家人、银行或社区工作人员。" }
    ]),
    strategyCorrectOrder: Object.freeze(["stop", "check", "ask"])
  });
}());

