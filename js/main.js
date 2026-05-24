import { ARCHETYPES, DIM_KEYS, EASTER_EGG_ARCHETYPE, QUESTIONS } from "./questions.js"
import { StageRenderer } from "./render.js"

const randomInt = (max) => {
  if (max <= 1) return 0
  if (globalThis.crypto?.getRandomValues) {
    const buf = new Uint32Array(1)
    globalThis.crypto.getRandomValues(buf)
    return buf[0] % max
  }
  return Math.floor(Math.random() * max)
}

const pickRandom = (items) => {
  if (!items?.length) return null
  return items[randomInt(items.length)]
}

const pickBestArchetype = (dims) => {
  const entries = DIM_KEYS.map((key) => ({ key, score: dims[key] ?? 0 }))
  const total = entries.reduce((sum, item) => sum + item.score, 0)
  if (total <= 0) return EASTER_EGG_ARCHETYPE

  const topScore = Math.max(...entries.map((item) => item.score))
  const firstPool = entries.filter((item) => item.score === topScore).map((item) => item.key)
  const k1 = pickRandom(firstPool) ?? DIM_KEYS[0]

  const remaining = entries.filter((item) => item.key !== k1)
  const secondScore = Math.max(...remaining.map((item) => item.score))
  const secondPool = remaining.filter((item) => item.score === secondScore).map((item) => item.key)
  const k2 = pickRandom(secondPool) ?? remaining[0]?.key ?? DIM_KEYS[1]
  const key = [k1, k2].sort().join("|")
  return ARCHETYPES.find((a) => a.pairKey === key) ?? ARCHETYPES[0]
}

const sumDims = (answers) => {
  const dims = Object.fromEntries(DIM_KEYS.map((k) => [k, 0]))
  for (let i = 0; i < QUESTIONS.length; i += 1) {
    const a = answers[i]
    if (a == null) continue
    const eff = QUESTIONS[i]?.options?.[a]?.effects ?? {}
    for (const k of DIM_KEYS) dims[k] += eff[k] ?? 0
  }
  return dims
}

const el = (id) => document.getElementById(id)

const show = (node) => node.classList.remove("hidden")
const hide = (node) => node.classList.add("hidden")

const syncVh = () => {
  const h = window.visualViewport?.height || window.innerHeight || 0
  document.documentElement.style.setProperty("--vh", `${h * 0.01}px`)
}

const isRectOverlap = (a, b) =>
  !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)

const calculateResult = (answers) => {
  const dims = sumDims(answers)
  return {
    dims,
    archetype: pickBestArchetype(dims),
  }
}

const escapeXml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const hexToRgb = (hex) => {
  const value = String(hex ?? "").trim().replace(/^#/, "")
  const normalized = value.length === 3 ? value.split("").map((c) => c + c).join("") : value
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

const rgbToHex = ({ r, g, b }) =>
  `#${[r, g, b]
    .map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`

const mixHex = (baseHex, targetHex, amount) => {
  const base = hexToRgb(baseHex)
  const target = hexToRgb(targetHex)
  if (!base || !target) return baseHex
  const ratio = clamp(amount, 0, 1)
  return rgbToHex({
    r: base.r + (target.r - base.r) * ratio,
    g: base.g + (target.g - base.g) * ratio,
    b: base.b + (target.b - base.b) * ratio,
  })
}

const getLuminance = (hex) => {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  const toLinear = (value) => {
    const channel = value / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b)
}

const getResultTitlePalette = (recipe) => {
  const main = recipe?.main ?? "#b43a19"
  const accent = recipe?.accent ?? main
  const luminance = getLuminance(main)
  const fill = luminance > 0.58 ? mixHex(accent, "#000000", 0.34) : mixHex(main, "#111111", 0.18)
  const edge = mixHex(fill, "#000000", 0.14)
  return {
    fill,
    edge,
  }
}

const getResultDecorPalette = (recipe) => {
  const accent = recipe?.accent ?? "#c8a13d"
  return {
    fill: mixHex(accent, "#efc45b", 0.56),
    edge: mixHex("#7a6947", "#b9922f", 0.45),
  }
}

const setResultNameText = (node, name) => {
  if (!node) return
  const text = String(name ?? "").trim()
  node.textContent = text
  node.setAttribute("aria-label", text ? `结果菜名：${text}` : "结果菜名")
}

const RESULT_DECOR_MAP = {
  "still-water-tofu": { motif: "tofu", label: "原味", mood: "你现在需要先恢复元气。" },
  "chongqing-hotpot": { motif: "chili", label: "辣椒", mood: "情绪滚烫，先把火慢一点。" },
  "suanla-fen": { motif: "vinegar", label: "红醋", mood: "苦尽总会来，你真的很坚韧。" },
  "gongbao-jiding": { motif: "peanut", label: "花生", mood: "节奏很快，也别忘了奖励自己。" },
  "mapo-tofu": { motif: "pepper", label: "花椒", mood: "别再把所有责任都扛在肩上。" },
  "leshan-boboji": { motif: "leaf", label: "青椒", mood: "冷静也是一种锋利的力量。" },
  "guizhou-hongsuantang": { motif: "tomato", label: "酸汤", mood: "别急，情绪也需要慢慢回温。" },
  "wuzhou-guilinggao": { motif: "osmanthus", label: "桂花", mood: "苦尽总会回甘，你真的很坚韧。" },
  "xiandanhuang-kugua": { motif: "leaf", label: "苦瓜", mood: "你在清醒里，也有柔软的内核。" },
  "douzhi": { motif: "cup", label: "豆汁", mood: "不是所有人都懂你，但你自有风味。" },
  "guobaorou": { motif: "star", label: "糖醋", mood: "今天也值得给自己一点甜头。" },
  "suan-tang-feiniu": { motif: "pepper", label: "肥牛", mood: "累了的时候，也要被热气抱一抱。" },
  "culiu-baicai": { motif: "leaf", label: "白菜", mood: "平常心，也是一种难得的松弛。" },
  "yuxiang-rousi": { motif: "fish", label: "鱼香", mood: "复杂的滋味，也能被你理顺。" },
  "bingtang-xueli": { motif: "pear", label: "雪梨", mood: "先润一润自己，再面对世界吧。" },
  "nanjing-yanshuiya": { motif: "feather", label: "鸭羽", mood: "你很稳，只是最近真的辛苦了。" },
}

const getResultDecor = (archetype) => RESULT_DECOR_MAP[archetype?.id] ?? { motif: "flower", label: "花朵", mood: "愿你把疲惫熬成奖章。" }

const buildDecorSvg = (motif, mainColor, accentColor) => {
  const main = escapeXml(mainColor)
  const accent = escapeXml(accentColor)
  const svgs = {
    osmanthus: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g fill="${main}"><path d="M16 6l3 5 5 2-5 3-2 5-3-5-5-2 5-3z"/><circle cx="16" cy="16" r="2.2" fill="${accent}"/></g></svg>`,
    chili: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M8 20c5-8 11-10 16-8-1 7-6 12-14 12-2 0-3-1-2-4z" fill="${main}"/><path d="M19 8c1-2 3-3 5-3" stroke="${accent}" stroke-width="2.4" stroke-linecap="round"/></svg>`,
    leaf: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M8 21c0-7 7-11 15-11-1 7-5 14-13 14-1 0-2-1-2-3z" fill="${main}"/><path d="M12 22c4-3 7-7 10-12" stroke="${accent}" stroke-width="2" stroke-linecap="round"/></svg>`,
    pepper: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g fill="${main}"><circle cx="11" cy="12" r="4"/><circle cx="19" cy="10" r="3.5"/><circle cx="18" cy="19" r="4.5"/><circle cx="10" cy="20" r="3.5"/></g><circle cx="19" cy="10" r="1.2" fill="${accent}"/></svg>`,
    pear: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M18 7c0 2-1 3-2 4 4 1 7 4 7 9 0 5-3 8-8 8s-8-3-8-8c0-4 2-8 6-9-1-1-2-2-2-4" fill="${main}"/><path d="M18 7c2-2 4-2 6-1" stroke="${accent}" stroke-width="2" stroke-linecap="round"/></svg>`,
    fish: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M6 17c3-6 8-9 14-8l6-3-1 6 1 6-6-3c-6 1-11-2-14-8z" fill="${main}"/><circle cx="12" cy="13.5" r="1.3" fill="${accent}"/></svg>`,
    feather: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M23 7c-8 1-13 8-13 14 0 3 2 4 4 4 7 0 14-8 14-16 0-1-2-2-5-2z" fill="${main}"/><path d="M11 24c3-4 7-8 12-14" stroke="${accent}" stroke-width="2" stroke-linecap="round"/></svg>`,
    cup: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M7 10h15v8c0 5-3 8-8 8s-7-3-7-8z" fill="${main}"/><path d="M22 12h2a3 3 0 010 6h-2" stroke="${accent}" stroke-width="2" fill="none"/><path d="M12 8c0-2 1-3 2-4M17 8c0-2 1-3 2-4" stroke="${accent}" stroke-width="2" stroke-linecap="round"/></svg>`,
    peanut: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M12 7c4 0 7 3 7 7 0 1 1 2 2 3 2 2 3 3 3 5 0 3-3 6-7 6-3 0-5-2-6-4-1 1-3 2-5 2-3 0-6-2-6-6 0-3 2-5 5-6 1 0 2-1 2-2 1-3 3-5 5-5z" fill="${main}"/></svg>`,
    tomato: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="17" r="9" fill="${main}"/><path d="M16 8l2.5 3 3.5.5-2.5 2.5.6 3.5-4.1-2-4.1 2 .6-3.5-2.5-2.5 3.5-.5z" fill="${accent}"/></svg>`,
    vinegar: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M13 6h6v4l4 7c2 5-1 9-7 9s-9-4-7-9l4-7z" fill="${main}"/><rect x="13" y="6" width="6" height="2.5" fill="${accent}"/></svg>`,
    tofu: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><rect x="7" y="9" width="18" height="14" rx="3" fill="${main}"/><path d="M7 14l9-5 9 5-9 5z" fill="${accent}" opacity=".5"/></svg>`,
    star: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M16 5l3.2 6.5 7.2 1-5.2 5.1 1.2 7.2L16 21.6l-6.4 3.2 1.2-7.2-5.2-5.1 7.2-1z" fill="${main}"/></svg>`,
    flower: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g fill="${main}"><circle cx="16" cy="8" r="4"/><circle cx="24" cy="16" r="4"/><circle cx="16" cy="24" r="4"/><circle cx="8" cy="16" r="4"/><circle cx="16" cy="16" r="3" fill="${accent}"/></g></svg>`,
  }
  return svgs[motif] ?? svgs.flower
}

const setDecorNode = (node, decor, palette) => {
  if (!node) return
  node.innerHTML = buildDecorSvg(decor.motif, palette.fill, palette.edge)
}

const extractSummary = (reading, fallback) => {
  const lines = String(reading ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !["为什么是这道菜？", "为什么是这道菜?", "内心戏：", "内心戏:", "建议：", "建议:"].includes(line))
  const source = lines[0] ?? String(fallback ?? "").trim()
  const match = source.match(/^[^。！？!?]{8,34}[。！？!?]?/)
  return (match?.[0] ?? source).trim()
}

const buildResultSections = (wrap, reading, soul) => {
  wrap.innerHTML = ""
  const lines = String(reading ?? "").split("\n")
  const blocks = []
  const isTitle = (s) => {
    const t = String(s ?? "").trim()
    if (!t) return null
    if (t === "为什么是这道菜？" || t === "为什么是这道菜?") return "为什么是这道菜"
    if (t === "内心戏：" || t === "内心戏:") return "内心戏"
    if (t === "建议：" || t === "建议:") return "建议"
    return null
  }

  let cur = null
  for (const raw of lines) {
    const t = isTitle(raw)
    if (t) {
      cur = { title: t, body: "" }
      blocks.push(cur)
      continue
    }
    if (!cur) {
      cur = { title: "分析", body: "" }
      blocks.push(cur)
    }
    cur.body += (cur.body ? "\n" : "") + raw
  }

  if (blocks.length) {
    for (const b of blocks) {
      const sec = document.createElement("section")
      sec.className = "block"
      const title = document.createElement("div")
      title.className = "block-title"
      title.textContent = b.title
      const body = document.createElement("div")
      body.className = "block-body"
      body.textContent = String(b.body ?? "").trim()
      sec.appendChild(title)
      sec.appendChild(body)
      wrap.appendChild(sec)
    }
  }

  const s = String(soul ?? "")
    .replace(/^💡?\s*【灵魂侧写】/g, "")
    .replace(/^灵魂侧写[:：]/g, "")
    .trim()
  if (s) {
    const divider = document.createElement("div")
    divider.className = "soul-divider"
    divider.textContent = "------"
    const noteText = document.createElement("div")
    noteText.className = "soul-text"
    noteText.textContent = s
    wrap.appendChild(divider)
    wrap.appendChild(noteText)
  }
}

const setScreen = (screens, name) => {
  for (const [k, v] of Object.entries(screens)) {
    if (k === name) show(v)
    else hide(v)
  }
}

const buildOptions = (wrap, q, selectedIndex, onPick) => {
  wrap.innerHTML = ""
  q.options.forEach((opt, idx) => {
    const b = document.createElement("button")
    b.type = "button"
    b.className = `btn option${selectedIndex === idx ? " selected" : ""}`
    b.textContent = opt.text
    b.setAttribute("aria-pressed", selectedIndex === idx ? "true" : "false")
    b.addEventListener("click", () => onPick(idx), { passive: true })
    wrap.appendChild(b)
  })
}

const main = () => {
  const frame = el("frame")
  const canvas = el("stage")
  const renderer = new StageRenderer(canvas)

  const screens = {
    home: el("screen-home"),
    quiz: el("screen-quiz"),
    result: el("screen-result"),
  }

  const error = el("error")
  const btnStart = el("btn-start")
  const btnPrev = el("btn-prev")
  const btnRestart = el("btn-restart")
  const homePot = el("home-pot")
  const homeIngredient = el("home-ingredient")
  const homeHint = el("home-hint")
  const phaseTrack = el("phase-track")
  const phaseDots = [el("phase-dot-0"), el("phase-dot-1"), el("phase-dot-2"), el("phase-dot-3")]
  const phaseGifs = [el("phase-gif-0"), el("phase-gif-1"), el("phase-gif-2")]
  const homeIngredientRestTransform = "rotate(6deg)"

  const progress = el("progress")
  const question = el("question")
  const options = el("options")

  const resultPaper = screens.result?.querySelector(".result-paper")
  const resultNameText = el("result-name-text")
  const resultFood = el("result-food")
  const resultSections = el("result-sections")
  let stopped = false

  const showError = () => {
    if (stopped) return
    stopped = true
    show(error)
  }

  const state = {
    screen: "home",
    qIndex: 0,
    answers: Array.from({ length: QUESTIONS.length }).fill(null),
    result: null,
    startingQuiz: false,
  }

  let drag = null

  const resize = () => {
    const rect = frame.getBoundingClientRect()
    const w = Math.max(1, rect.width)
    const h = Math.max(1, rect.height)
    renderer.resize(w, h)
  }

  const goHome = () => {
    state.screen = "home"
    state.qIndex = 0
    state.answers.fill(null)
    state.result = null
    state.startingQuiz = false
    renderer.setMode("home", null)
    screens.home.classList.remove("leaving")
    setScreen(screens, "home")
    resetIngredient()
  }

  const goQuiz = () => {
    state.screen = "quiz"
    state.qIndex = 0
    state.answers.fill(null)
    state.result = null
    state.startingQuiz = false
    renderer.setMode("quiz", null)
    setScreen(screens, "quiz")
    renderQuestion()
  }

  const goResult = () => {
    const { archetype } = calculateResult(state.answers)
    const r = archetype
    state.result = r
    state.screen = "result"
    renderer.setMode("result", r.visualRecipe)
    setScreen(screens, "result")
    const palette = getResultTitlePalette(r.visualRecipe)
    resultPaper?.style.setProperty("--result-theme", "#2d241d")
    resultPaper?.style.setProperty("--result-theme-soft", mixHex(r.visualRecipe?.main ?? palette.fill, "#f6f0df", 0.84))
    resultPaper?.style.setProperty("--result-theme-line", mixHex(r.visualRecipe?.accent ?? palette.edge, "#d8ccb4", 0.6))
    resultPaper?.style.setProperty("--result-theme-accent", mixHex(r.visualRecipe?.accent ?? palette.edge, "#e0b445", 0.3))
    setResultNameText(resultNameText, r.name)
    const fallbackImage = renderer.renderFoodImage({ recipe: r.visualRecipe })
    resultFood.onerror = () => {
      resultFood.onerror = null
      resultFood.src = fallbackImage
    }
    resultFood.src = r.image ? encodeURI(r.image) : fallbackImage
    buildResultSections(resultSections, r.reading, r.soul)
  }

  const renderQuestion = () => {
    const idx = state.qIndex
    const q = QUESTIONS[idx]
    progress.textContent = `${idx + 1} / ${QUESTIONS.length}`
    const phaseIndex = Math.min(phaseDots.length - 1, 1 + Math.floor(idx / 4))
    phaseDots.forEach((node, dotIndex) => {
      if (!node) return
      node.classList.toggle("done", dotIndex < phaseIndex)
      node.classList.toggle("current", dotIndex === phaseIndex)
    })
    phaseGifs.forEach((node, gifIndex) => {
      if (!node) return
      node.classList.toggle("is-visible", gifIndex < phaseIndex)
    })
    phaseTrack?.style.setProperty("--phase-ratio", String(phaseIndex / (phaseDots.length - 1)))
    question.textContent = q.text
    btnPrev.disabled = idx === 0
    buildOptions(options, q, state.answers[idx], (optIndex) => {
      state.answers[idx] = optIndex
      if (idx < QUESTIONS.length - 1) {
        state.qIndex += 1
        renderQuestion()
      } else {
        goResult()
      }
    })
  }

  const resetIngredient = () => {
    drag = null
    homeIngredient?.classList.remove("dragging")
    homePot?.classList.remove("armed")
    if (homeIngredient) homeIngredient.style.transform = homeIngredientRestTransform
    if (homeHint) homeHint.textContent = "点击黄色按钮“开启今日风味”开始答题"
  }

  const startQuiz = () => {
    if (state.screen !== "home" || state.startingQuiz) return
    state.startingQuiz = true
    homePot?.classList.add("armed")
    homeHint && (homeHint.textContent = "正在进入答题")
    screens.home.classList.add("leaving")
    window.setTimeout(() => {
      screens.home.classList.remove("leaving")
      goQuiz()
    }, 220)
  }

  const updateIngredientDrag = (clientX, clientY) => {
    if (!drag || !homeIngredient) return
    const dx = clientX - drag.startX
    const dy = clientY - drag.startY
    const angle = Math.max(-12, Math.min(12, dx * 0.05))
    homeIngredient.style.transform = `translate(${dx}px, ${dy}px) rotate(${6 + angle}deg)`
    const hit = homePot && isRectOverlap(homeIngredient.getBoundingClientRect(), homePot.getBoundingClientRect())
    homePot?.classList.toggle("armed", Boolean(hit))
    if (homeHint) homeHint.textContent = "点击黄色按钮“开启今日风味”开始答题"
  }

  const endIngredientDrag = () => {
    if (!drag || !homeIngredient) return
    const hit = homePot && isRectOverlap(homeIngredient.getBoundingClientRect(), homePot.getBoundingClientRect())
    const pointerId = drag.pointerId
    drag = null
    try {
      homeIngredient.releasePointerCapture(pointerId)
    } catch {}
    if (hit) startQuiz()
    else resetIngredient()
  }

  homeIngredient?.addEventListener("pointerdown", (event) => {
    if (state.screen !== "home" || state.startingQuiz) return
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    }
    homeIngredient.setPointerCapture(event.pointerId)
    homeIngredient.classList.add("dragging")
  })

  window.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return
    updateIngredientDrag(event.clientX, event.clientY)
  })

  window.addEventListener("pointerup", (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return
    endIngredientDrag()
  })

  window.addEventListener("pointercancel", () => {
    if (!drag) return
    resetIngredient()
  })

  btnStart?.addEventListener("click", startQuiz, { passive: true })
  btnRestart?.addEventListener("click", goQuiz, { passive: true })

  btnPrev?.addEventListener(
    "click",
    () => {
      if (state.qIndex <= 0) return
      state.qIndex -= 1
      renderQuestion()
    },
    { passive: true },
  )

  const onResize = () => {
    syncVh()
    resize()
  }

  window.addEventListener("resize", onResize, { passive: true })
  window.addEventListener("orientationchange", onResize, { passive: true })
  window.visualViewport?.addEventListener("resize", onResize, { passive: true })
  window.visualViewport?.addEventListener("scroll", onResize, { passive: true })

  resetIngredient()

  const loop = (t) => {
    if (stopped) return
    try {
      renderer.draw(t)
    } catch (e) {
      showError()
      return
    }
    requestAnimationFrame(loop)
  }

  syncVh()
  resize()
  goHome()
  requestAnimationFrame(loop)

  window.addEventListener("error", showError, { passive: true })
  window.addEventListener("unhandledrejection", showError, { passive: true })
}

try {
  main()
} catch (e) {
  const err = document.getElementById("error")
  if (err) err.classList.remove("hidden")
}
