(function () {
  const pretest = [
    {
      id: "pretest-1",
      prompt: "陌生号码发来消息：“我是小王，这是新号码，住院押金还差3000元，先别告诉家里。”",
      options: [
        { id: "A", text: "按照对方提供的账户转账", is_correct: false, verification_action: false, help_seeking_action: false, missed_cues: ["新号码", "要求保密", "催促转账"] },
        { id: "B", text: "在新号码中继续询问详细情况", is_correct: false, verification_action: false, help_seeking_action: false, missed_cues: ["应通过独立渠道核验"] },
        { id: "C", text: "暂停操作，用原来保存的号码联系本人核验", is_correct: true, verification_action: true, help_seeking_action: false, missed_cues: [] },
        { id: "D", text: "先转一小笔钱试试", is_correct: false, verification_action: false, help_seeking_action: false, missed_cues: ["小额转账仍有风险", "应先独立核验"] }
      ]
    },
    {
      id: "pretest-2",
      prompt: "客服发来退款链接，并要求提供验证码。",
      options: [
        { id: "A", text: "点击链接办理退款", is_correct: false, verification_action: false, help_seeking_action: false, missed_cues: ["陌生链接", "应回原平台核验"] },
        { id: "B", text: "只提供验证码，不提供密码", is_correct: false, verification_action: false, help_seeking_action: false, missed_cues: ["验证码不可提供"] },
        { id: "C", text: "打开原购物平台，在订单页面寻找官方客服", is_correct: true, verification_action: true, help_seeking_action: false, missed_cues: [] },
        { id: "D", text: "开启屏幕共享，让客服代为操作", is_correct: false, verification_action: false, help_seeking_action: false, missed_cues: ["屏幕共享会暴露敏感信息"] }
      ]
    },
    {
      id: "pretest-3",
      prompt: "投资群承诺月收益20%、本金安全，并催促当天入金。",
      options: [
        { id: "A", text: "先投入少量资金试试", is_correct: false, verification_action: false, help_seeking_action: false, missed_cues: ["高收益零风险", "限时催促"] },
        { id: "B", text: "询问群内其他成员是否可靠", is_correct: false, verification_action: false, help_seeking_action: false, missed_cues: ["群成员并非独立渠道"] },
        { id: "C", text: "不转账，通过独立官方渠道核查机构资质", is_correct: true, verification_action: true, help_seeking_action: false, missed_cues: [] },
        { id: "D", text: "先占名额，之后再详细了解", is_correct: false, verification_action: false, help_seeking_action: false, missed_cues: ["限时名额", "应先核验再行动"] }
      ]
    }
  ];

  const scenarios = [
    {
      id: "scenario-family",
      title: "冒充亲属紧急转账",
      support_level: "full",
      messages: [
        "奶奶，我手机坏了，这是新号码。",
        "我现在出了点事，急需5000元处理。",
        "先别告诉我爸妈，他们知道了会生气。",
        "请马上转到这个账户，晚了就来不及了。"
      ],
      risk_cues: ["突然更换号码", "制造紧迫感", "要求保密", "指定陌生账户", "阻止用户向其他家人核验"],
      support: {
        label: "完整提示",
        text: "停：先暂停转账。查：用原来保存的号码联系孙子。问：无法确认时询问其他家人。",
        preview_label: "查看风险线索提示",
        preview: ["新号码", "催促立即转账", "要求保密"]
      },
      strategy: {
        stop: "新号码催促转账并要求保密时，先暂停操作。",
        check: "用原来保存的号码联系孙子，不在新号码中核验。",
        ask: "无法确认时，询问其他家人。"
      },
      options: [
        {
          id: "A",
          text: "立即按照对方提供的账户转账。",
          is_correct: false,
          verification_action: false,
          help_seeking_action: false,
          missed_cues: ["突然更换号码", "制造紧迫感", "要求保密", "指定陌生账户"],
          feedback: "这个做法仍有风险，因为资金会直接进入对方指定的陌生账户。即使金额较小，也可能确认账户有效并造成损失；应先暂停并通过独立渠道核验。"
        },
        {
          id: "B",
          text: "继续在新号码里询问具体情况。",
          is_correct: false,
          verification_action: false,
          help_seeking_action: false,
          missed_cues: ["突然更换号码", "阻止用户向其他家人核验"],
          feedback: "这个做法仍有风险，因为继续在同一新号码中询问，信息仍由对方控制。换用原来保存的号码联系孙子或其他家人核验会更安全。"
        },
        {
          id: "C",
          text: "暂停操作，用原来保存的号码联系孙子或其他家人核验。",
          is_correct: true,
          verification_action: true,
          help_seeking_action: true,
          missed_cues: [],
          feedback: "这个选择更安全，因为你先暂停了转账，并改用自己原来保存的号码或联系其他家人进行独立核验。"
        },
        {
          id: "D",
          text: "先转一小笔钱测试对方是否能收到。",
          is_correct: false,
          verification_action: false,
          help_seeking_action: false,
          missed_cues: ["制造紧迫感", "指定陌生账户", "阻止用户向其他家人核验"],
          feedback: "这个做法仍有风险，因为即使只转一小笔钱，也可能确认账户有效并造成损失，还可能被继续诱导转更多钱。应先独立核验。"
        }
      ]
    },
    {
      id: "scenario-refund",
      title: "虚假客服退款",
      support_level: "partial",
      messages: [
        "您的网购订单存在质量问题，可办理三倍退款。",
        "对方发送了一个“客服专用链接”。",
        "对方称需要开启屏幕共享，查看退款是否到账。",
        "对方要求提供短信验证码完成认证。"
      ],
      risk_cues: ["主动承诺高额退款", "引导离开原平台", "要求点击陌生链接", "要求屏幕共享", "索要验证码"],
      support: {
        label: "需要帮助",
        text: "先暂停，不点击对方发来的链接。打开原购物平台，在订单页面找到官方客服核验；不要提供验证码或开启屏幕共享。"
      },
      strategy: {
        stop: "遇到退款链接、验证码或屏幕共享要求时先暂停。",
        check: "打开原购物平台，从订单页面寻找官方客服核验。",
        ask: "无法确认时，询问家人或平台官方客服。"
      },
      options: [
        {
          id: "A",
          text: "点击链接并按照客服提示操作。",
          is_correct: false,
          verification_action: false,
          help_seeking_action: false,
          missed_cues: ["主动承诺高额退款", "引导离开原平台", "要求点击陌生链接"],
          feedback: "这个做法仍有风险，因为陌生链接可能引导你离开原平台并泄露账户信息。核验渠道应由你自己在原购物平台中查找。"
        },
        {
          id: "B",
          text: "提供验证码，但不告诉对方银行卡密码。",
          is_correct: false,
          verification_action: false,
          help_seeking_action: false,
          missed_cues: ["索要验证码", "引导离开原平台"],
          feedback: "这个做法仍有风险，因为验证码可能被用于登录、转账或身份验证。验证码和密码一样重要，不能提供给任何人。"
        },
        {
          id: "C",
          text: "打开原购物平台，在订单页面寻找官方客服核验。",
          is_correct: true,
          verification_action: true,
          help_seeking_action: false,
          missed_cues: [],
          feedback: "这个选择更安全，因为核验渠道由你自己从原购物平台找到，不使用对方提供的链接、电话或操作方式。"
        },
        {
          id: "D",
          text: "开启屏幕共享，但不进行转账。",
          is_correct: false,
          verification_action: false,
          help_seeking_action: false,
          missed_cues: ["要求屏幕共享", "索要验证码"],
          feedback: "这个做法仍有风险，因为屏幕共享可能暴露密码、验证码和账户信息，即使不主动转账也不安全。"
        }
      ]
    },
    {
      id: "scenario-investment",
      title: "虚假投资专家群",
      support_level: "weak",
      messages: [
        "你被邀请进入“退休财富增长交流群”。",
        "“专家”连续发布其他成员获利截图。",
        "群内承诺“内部项目，月收益20%，本金安全”。",
        "对方称名额只剩3个，要求当天向个人账户入金。"
      ],
      risk_cues: ["承诺高收益、零风险", "使用无法核实的获利截图", "群体气氛制造从众压力", "限时名额制造紧迫感", "要求向个人账户转账"],
      support: {
        label: "需要帮助",
        text: "先停下，不根据群内截图或成员说法判断。通过独立渠道核查机构资质、风险和资金去向；拿不准时询问家人或正规金融机构。"
      },
      strategy: {
        stop: "看到高收益、零风险和限时名额时先暂停。",
        check: "独立核查机构资质、风险和资金去向。",
        ask: "咨询家人或正规金融机构，不依赖群内成员。"
      },
      options: [
        {
          id: "A",
          text: "先投入少量资金试试看。",
          is_correct: false,
          verification_action: false,
          help_seeking_action: false,
          missed_cues: ["承诺高收益、零风险", "限时名额制造紧迫感", "要求向个人账户转账"],
          feedback: "这个做法仍有风险，因为“先投入少量资金”可能被用来建立信任，再诱导你投入更多资金。应先独立核查，不向个人账户转账。"
        },
        {
          id: "B",
          text: "查看群里的获利截图和其他成员评价。",
          is_correct: false,
          verification_action: false,
          help_seeking_action: false,
          missed_cues: ["使用无法核实的获利截图", "群体气氛制造从众压力"],
          feedback: "这个做法仍有风险，因为获利截图无法独立核实，群内成员也可能是同一诈骗团伙控制的账号。"
        },
        {
          id: "C",
          text: "拒绝立即转账，独立核查机构资质，并咨询家人或正规金融机构。",
          is_correct: true,
          verification_action: true,
          help_seeking_action: true,
          missed_cues: [],
          feedback: "这个选择更安全，因为你拒绝了立即转账，主动独立核查资质，并向可信的人或正规机构求助。高收益一定伴随风险，不存在保证收益的正规投资。"
        },
        {
          id: "D",
          text: "私聊群内其他成员，询问项目是否可靠。",
          is_correct: false,
          verification_action: false,
          help_seeking_action: false,
          missed_cues: ["群体气氛制造从众压力", "使用无法核实的获利截图"],
          feedback: "这个做法仍有风险，因为群成员可能是同一诈骗团伙控制的账号，不属于独立可靠的核验渠道。"
        }
      ]
    }
  ];

  const transfer = {
    id: "transfer-delivery",
    title: "快递理赔",
    prompt: "用户接到电话，对方称快递丢失，可获得500元理赔，但需要下载“理赔会议软件”、开启屏幕共享，并登录手机银行确认收款。",
    risk_cues: [
      "主动联系并承诺赔偿",
      "要求下载陌生软件",
      "要求屏幕共享",
      "要求登录手机银行",
      "引导离开原购物或快递平台"
    ],
    options: [
      {
        id: "A",
        text: "按照对方提示下载软件并登录手机银行",
        is_correct: false,
        verification_action: false,
        help_seeking_action: false,
        missed_cues: ["要求下载陌生软件", "要求屏幕共享", "要求登录手机银行", "引导离开原购物或快递平台"],
        feedback: "这个做法仍有风险，因为陌生软件和屏幕共享可能暴露手机银行、密码和验证码。应挂断电话，通过原购物平台订单或快递官方渠道核实。"
      },
      {
        id: "B",
        text: "只开启屏幕共享，不登录手机银行",
        is_correct: false,
        verification_action: false,
        help_seeking_action: false,
        missed_cues: ["要求屏幕共享", "引导离开原购物或快递平台"],
        feedback: "这个做法仍有风险，因为屏幕共享本身就可能暴露通知、验证码和账户信息，不登录手机银行也不安全。"
      },
      {
        id: "C",
        text: "挂断电话，通过购物平台订单或快递官方渠道核实",
        is_correct: true,
        verification_action: true,
        help_seeking_action: false,
        missed_cues: [],
        feedback: "这个选择更安全，因为你停止了对方控制的操作，并通过自己找到的购物平台订单或快递官方渠道独立核实。"
      },
      {
        id: "D",
        text: "让对方先把理赔款转来，再决定是否操作",
        is_correct: false,
        verification_action: false,
        help_seeking_action: false,
        missed_cues: ["主动联系并承诺赔偿", "引导离开原购物或快递平台"],
        feedback: "这个做法仍有风险，因为继续与对方协商仍停留在对方控制的渠道中。不要以是否收到款项作为判断依据，应直接通过官方渠道核实。"
      }
    ]
  };

  window.ANTI_FRAUD_DATA = Object.freeze({
    pretest: Object.freeze(pretest),
    scenarios: Object.freeze(scenarios),
    transfer: Object.freeze(transfer)
  });
}());


