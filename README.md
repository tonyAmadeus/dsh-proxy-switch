# dsh-proxy-switch

<p align="center">
  <a href="https://github.com/tonyAmadeus/dsh-proxy-switch/releases"><img alt="version" src="https://img.shields.io/github/v/tag/tonyAmadeus/dsh-proxy-switch?label=version&color=38bdf8"></a>
  <a href="https://github.com/tonyAmadeus/dsh-proxy-switch/stargazers"><img alt="stars" src="https://img.shields.io/github/stars/tonyAmadeus/dsh-proxy-switch?color=22d3ee"></a>
  <a href="https://www.npmjs.com/package/dsh-proxy-switch"><img alt="npm" src="https://img.shields.io/npm/v/dsh-proxy-switch?color=cb3837"></a>
  <a href="https://github.com/tonyAmadeus/dsh-proxy-switch/blob/main/LICENSE"><img alt="license" src="https://img.shields.io/github/license/tonyAmadeus/dsh-proxy-switch?color=22d3ee"></a>
  <img alt="DSH" src="https://img.shields.io/badge/DSH-0.2.x-4B9CD3">
  <img alt="dsh-plugin" src="https://img.shields.io/badge/dsh--plugin-%E2%9C%93-2ea44f">
</p>

DeepSeek Harness（DSH）的出站代理开关。**Clash 开着就走 Clash，关掉就自动直连，界面上一键切换，不用重启 DSH。**

Outbound proxy switch for DeepSeek Harness: a local router picks Clash or direct per mode, with an in-UI switch. No DSH restart.

- 仓库：https://github.com/tonyAmadeus/dsh-proxy-switch
- 测试环境：DSH 桌面版 `0.2.1-rc.2`（Windows 11）
- 许可证：MIT

---

## 为什么需要它

DSH 的代理策略是**启动器在插件加载之前**从 `.env` 一次性安装的：

- 如果你把 `.env` 写成 `https_proxy=http://127.0.0.1:7897`（Clash），那 **Clash 一关，DSH 全线断网**；
- 插件加载得比这晚，改不了已经装好的策略。

本插件让 `.env` 指向它自己的**本地路由器**，由路由器在每次连接时决定出口：

```
.env ──▶ 127.0.0.1:17897（本插件的路由器）
                              ├─ auto   : Clash 可达 → 走 Clash；不可达 → 直连
                              ├─ direct : 直连
                              └─ clash  : 走 Clash（不自动回退）
```

顺带的好处：DSH 看到 `HTTPS_PROXY` 就会走代理，并**跳过私有地址校验**（域名交给代理解析），
所以 Clash TUN + fake-ip 环境下 `web_fetch` 报 `non-public IP` 的问题也一并解决了。

---

## 安装

### 1. 安装插件

从 npm 安装（推荐，最简单）：

```powershell
dsh plugin add dsh-proxy-switch@0.1.0
```

也可以直接锁定 git tag（不依赖 npm）：

```powershell
dsh plugin add "git+https://github.com/tonyAmadeus/dsh-proxy-switch.git#v0.2.0"
```

想要更严格，可以把 `#` 后面换成仓库首页显示的 commit hash，commit 完全不可变。

### 2. 让 DSH 走这个路由器

编辑 `~/.dsh/.env`（Windows：`C:\Users\<user>\.dsh\.env`），加入：

```ini
http_proxy=http://127.0.0.1:17897
https_proxy=http://127.0.0.1:17897
```

然后**重启一次 DSH**（`.env` 只在启动时读取）。

> 这两行是**必须的**：不配的话插件不会参与选路，Clash 关掉时 DSH 照样断网。
> 端口 `17897` 若在插件配置里改过，这里要同步改。

---

## 使用

打开 **设置**，左侧导航里会多出一节 **代理**（英文界面为 **Proxy**）：

| 模式 | 行为 | 何时用 |
|---|---|---|
| **自动**（默认） | 探测 Clash（1 秒缓存）：在线 → 走 Clash；离线 → 直连 | 日常 |
| **直连** | 一律直连 | 明确不开 Clash |
| **走 Clash** | 一律走 Clash，不自动回退 | 必须确保走节点 |

切换即时生效——路由器在每条连接上重读模式文件，不需要重启 DSH。
状态行会显示 `Clash 在线/未运行`、`路由器在线/离线` 与当前模式文件路径。

---

## 配置

默认配置在插件的 `cordis.patch.yml`。要覆盖，在 profile 的 `cordis.patch.yml`
里加一条**同 id** 的 patch 条目（profile 是 `~/.dsh/profiles/<名字>/`）：

```yaml
- id: dsh-proxy-switch
  config:
    routerPort: 17897
    clashPort: 7897
```

| 字段 | 默认值 | 说明 |
|---|---|---|
| `routerPort` | `17897` | 本地路由器监听端口（`.env` 要指向它） |
| `clashPort` | `7897` | Clash / Mihomo 的混合端口（Clash Verge Rev 默认 7897，原版 Clash 常见 7890） |
| `modeFile` | `$DSH_HOME/proxy-mode.txt` | 模式文件（`auto` / `direct` / `clash`） |
| `logFile` | `$DSH_HOME/dsh-proxy-switch.log` | 运行日志（超 512KB 自动截断） |

`$DSH_HOME` 默认是 `~/.dsh`，可用环境变量覆盖。

---

## 排障

```powershell
# 路由器是否在监听
Get-NetTCPConnection -LocalPort 17897 -State Listen

# 日志（Windows 默认路径）
Get-Content "$env:USERPROFILE\.dsh\dsh-proxy-switch.log" -Tail 20

# 手动经路由器抓网页（应返回 200）
curl.exe -sS -x http://127.0.0.1:17897 -o NUL -w "%{http_code}`n" https://example.com

# 强制切直连
Set-Content -NoNewline "$env:USERPROFILE\.dsh\proxy-mode.txt" direct
```

- **DSH 启动头一两秒有报错**：正常。插件拉起路由器需要约 1–2 秒，之后自愈。
- **日志出现 `owner process ... gone, exiting`**：上一轮 DSH 退出后路由器按约定自我清理，属正常。
- **一直连不上**：先确认 `.env` 里那两行在；再确认模式不是「走 Clash」而 Clash 没开。
- **设置里看不到「代理」这一节**：说明插件没加载成功，看 DSH 插件页的错误信息与上面的日志。

### 卸载

```powershell
dsh plugin remove dsh-proxy-switch
```

然后删掉 `.env` 里那两行并重启 DSH。

---

## 已知限制

- **只支持 HTTP/HTTPS 代理**：DSH 不支持 SOCKS；本路由器只处理 HTTP 与 CONNECT。
- **启动窗口**：DSH 启动后约 1–2 秒内端口可能尚未监听，期间请求会失败一次，随后自动恢复。
- **Clash 端口因客户端而异**：Clash Verge Rev 用 7897，原版 Clash 常见 7890 —— 按自己的客户端改 `clashPort`。
- **DSH 升级**：插件经 profile 依赖加载，升级后一般仍在；DSH 行为若变化可能需要更新插件。
- **路由器进程**：由插件用 `ELECTRON_RUN_AS_NODE` 拉起，DSH 退出约 2 秒后自行退出，不留孤儿进程。

---

## 参考

- DSH 代理策略：`@deepseek-ai/dsh-http-proxy`（启动器一次性安装，插件不可改）
- 市场索引格式：`@deepseek-ai/dsh-plugin-market-index`

## License

MIT © 2026 tonyAmadeus
