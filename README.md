# 只因快跑 · Zhiyin Run

一款原创像素小鸡无限跑酷网页游戏。自动奔跑，跳过地面障碍、蹲过低飞小鸟，收集玉米和特殊道具，挑战最高距离。

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/gofish040821/zhiyin-run)

## 操作

| 设备 | 操作 |
| --- | --- |
| 电脑 | `Space` / `↑` 跳跃，按住 `↓` 下蹲，`P` / `Esc` 暂停，`R` 在结束后重开，`M` 静音 |
| 手机 | 轻点游戏画面跳跃，向下滑动下蹲；页面按钮控制暂停、静音和重开 |

## 玩法

- 八种原创像素障碍：木箱、栏杆、石头、稻草堆、篮球、低飞小鸟、音箱、路障。
- 随距离平滑加速；障碍间隔在高速时仍留出反应和跳跃空间。
- 玉米加分；贴近障碍安全通过可获得 `PERFECT` 与 Combo 倍率。
- 拾取特殊道具进入无敌 2.5 秒模式；集齐「唱、跳、RAP、篮」进入全能练习生模式。
- 最高距离保存在浏览器 `localStorage`。
- 原创程序绘制像素贴图和 Web Audio 合成音效，没有使用真人录音、歌曲、视频或照片。

## 本地运行

需要 Node.js 20.19+ 或 22.12+。

```bash
npm ci
npm run dev
```

打开终端显示的本地地址。生产构建：

```bash
npm run build
npm run preview
```

## Render 部署

创建 **Static Site**，连接 `gofish040821/zhiyin-run` 的 `main` 分支：

| 设置 | 值 |
| --- | --- |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |
| Auto Deploy | 开启 |

仓库中的 `render.yaml` 也提供了相同的静态站点设置。游戏不需要后端或环境变量。

## 项目结构

```text
src/
  main.ts                         页面 UI、输入、Phaser 初始化
  style.css                       响应式布局
  game/
    config/GameConfig.ts          速度、重力、概率、分数、音量等参数
    objects/PixelArt.ts           原创像素贴图生成
    scenes/RunScene.ts            场景、动画、障碍、碰撞、收集物
    systems/AudioSystem.ts        原创合成音效
    systems/RunEvents.ts          游戏状态与页面 UI 通信
    utils/storage.ts              最高纪录持久化
index.html
render.yaml
```

## 技术与素材

TypeScript、Phaser 3、Vite、HTML、CSS。画面和音效均在运行时程序生成，代码和资源可以直接公开到 GitHub。首次点击开始后浏览器才会启用声音，以遵守自动播放限制。
