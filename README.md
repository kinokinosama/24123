# 纸上小厨房（离线心理测验）说明文档

这是一款纯前端、纯离线运行的竖屏心理测验。用户用 1–3 分钟回答 12 道“离谱但精准”的问题，系统根据选项累计的情绪维度分数，选出分数最高的两个维度，用它们的组合命中 15 种“食物心境”，输出一段具有强共鸣的解读文本与一张对应食物图片。

## 1. 玩法设计

1. 打开首页，将“今日情绪食材”拖进锅里，或点击“直接开始测验”。
2. 进入答题页，共 12 题；每题 4 个选项。
3. 点击选项立即进入下一题；支持“上一题”返回重选；支持“重来”清空本次作答并回到首页。
4. 完成第 12 题后自动进入结果页。

产品希望营造的是“轻量但有击中感”的体验：题目不追求严谨量表，而是用更日常、带戏剧性的情境触发用户的共性矛盾与自我投射，最终在结果页完成一次“被看见”的情绪镜像。

## 2. 计分维度与规则

### 2.1 六个维度（内部计分用，不在作答界面展示）

项目内部以 6 个维度累计分数（见 [questions.js](file:///c:/Users/wei/Desktop/canvas_food_quiz/js/questions.js) 的 `DIM_KEYS` 与各题 `effects`）：

- spicy（辣）：高唤醒、焦躁、想硬刚、想马上解决
- bitter（苦）：压力压抑、迷茫失控、扛着走
- sour（酸）：失落、落空、委屈、被辜负/想念
- sweet（甜）：正向满足、被认可、被奖励、回甘
- salty（咸）：疲惫、萎靡不振、麻木的“撑着”
- mint（清爽）：清晰、笃定、边界感、降噪、低功耗运行

每个选项会对其中 1–2 个维度加分，采用整数累加（如 +2、+1）。最终得到一个 6 维分数向量。

### 2.2 结果选择（C(6,2)=15）

结果匹配规则非常直观：

1. 统计 6 个维度总分。
2. 找出分数最高的两个维度；若出现同分，则随机打破平局；若极端情况下总分全 0，则触发隐藏彩蛋结果。
3. 用“最高两维的组合”命中 15 种食物之一（6 选 2 共 15 种组合）。

实现逻辑位于 [main.js](file:///c:/Users/wei/Desktop/canvas_food_quiz/js/main.js) 的 `pickBestArchetype()`。

### 2.3 选项注释（只用于制作/校对，不对用户展示）

题目文本里你会看到类似“【酸:2 咸:1】（……）”的标注，这些信息用于创作与回溯心理含义。

在代码里这些内容被保存为 `memo` 字段，但 UI 不会渲染该字段；用户界面只看到题干与选项文本。

## 3. 文案设计（为什么会“像监控”）

结果文案刻意面向巴纳姆效应做了“共性矛盾”的结构设计：

- 外在表现：像很强、很硬、很能扛/很清醒/很洒脱
- 内在真实：焦虑、失落、疲惫、害怕失控、需要被理解
- 行为补偿：忙、硬刚、躺平、切割、用甜奖励自己、用清爽拉边界

每个结果由 4 段组成（见 [questions.js](file:///c:/Users/wei/Desktop/canvas_food_quiz/js/questions.js) 的 `ARCHETYPES[].reading/soul`）：

- 为什么是这道菜？：给一个“像”的理由，把情绪和食物结构对齐
- 内心戏：用一句带戏的自我独白触发共鸣
- 建议：不说教，用“可执行的小动作”给用户退路
- 最后一句“灵魂侧写”：更狠、更准、更像监控的一刀；在 UI 中以小字斜体、虚化显示，弱化存在但强化余味

## 4. UI 与视觉设计

### 4.1 整体风格

- 目标风格：治愈、极简、纸张质感 + 少量水彩纹理
- 结构策略：让“图片 + 结论（你是——X）”成为视觉锚点，正文分段卡片化，降低长文阅读疲劳
- 细节策略：轻阴影、柔边框、低对比留白，避免强烈 UI 噪音

### 4.2 结果页排版策略

- 顶部食物图片：优先使用本地图片，保证与食物一致，便于分享
- 主标题：字号更大、颜色更深，形成第一视觉焦点
- 正文分段：每段用小卡片承载（胶囊小标题 + 正文），增强层级感
- 末尾侧写：不使用卡片，不写“灵魂侧写”标题，只用 `------` 作为分隔线，并用小字斜体呈现

### 4.3 图片来源与展示方式

项目支持两种“食物图”来源：

1. 本地图片（优先）：放在 `images/` 目录下，图片文件名统一使用英文小写，结果原型通过 `image` 字段指定路径。
2. 程序绘制（兜底）：当没有配置 `image` 时，会用 Canvas 生成一张手绘风简笔食物图（用于开发期或缺图时）。

图片展示遵循：

- 1:1 方形容器（统一视觉）
- `object-fit: contain`（不裁切、不拉伸，尽量保持原图色彩与比例）

对应实现：

- 路径配置：[questions.js](file:///c:/Users/wei/Desktop/canvas_food_quiz/js/questions.js) 的 `ARCHETYPES[].image`
- 结果页赋值：[main.js](file:///c:/Users/wei/Desktop/canvas_food_quiz/js/main.js) 的 `resultFood.src = ...`
- 展示样式：[style.css](file:///c:/Users/wei/Desktop/canvas_food_quiz/css/style.css) 的 `#result-food`

## 5. 项目结构与主要文件

- [index.html](file:///c:/Users/wei/Desktop/canvas_food_quiz/index.html)：页面结构（首页/答题/结果三屏切换）
- [css/style.css](file:///c:/Users/wei/Desktop/canvas_food_quiz/css/style.css)：视觉样式（纸张、按钮、结果排版等）
- [js/main.js](file:///c:/Users/wei/Desktop/canvas_food_quiz/js/main.js)：状态机、答题流程、计分、结果渲染
- [js/questions.js](file:///c:/Users/wei/Desktop/canvas_food_quiz/js/questions.js)：题库、选项计分、15 种结果文案、结果图片路径
- [js/render.js](file:///c:/Users/wei/Desktop/canvas_food_quiz/js/render.js)：Canvas 背景与兜底食物图生成
- `images/`：结果食物对应的本地 PNG

## 6. 离线运行与打开方式

由于项目使用 ES Module，浏览器直接用 `file://` 打开可能导致脚本被拦截，推荐用本地静态服务打开：

- 双击 [serve.cmd](file:///c:/Users/wei/Desktop/canvas_food_quiz/serve.cmd)
- 或运行 [serve.ps1](file:///c:/Users/wei/Desktop/canvas_food_quiz/serve.ps1)

打开后访问：`http://localhost:8000/`

## 7. 可调参数（给后续迭代）

你后续最常改的地方是：

- 题库与计分：`QUESTIONS[].options[].effects`（决定更容易命中哪两维）
- 结果文案：`ARCHETYPES[].reading` 与 `ARCHETYPES[].soul`
- 图片映射：`ARCHETYPES[].image`（更换文件名/换图只改这里）
- 结果页排版与间距：`style.css` 里的 `.result-name/.block/.block-body/.soul-text` 等
