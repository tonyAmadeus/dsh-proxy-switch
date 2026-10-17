# dsh-proxy-switch

DeepSeek Harness（DSH）的出站代理开关。**Clash 开着就走 Clash，关掉就自动直连，界面上一键切换，不用重启 DSH。**

Outbound proxy switch for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness):
a local router picks Clash or direct per mode, with an in-UI switch. No DSH restart.

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

副作用是好的：DSH 看到 `HTTPS_PROXY` 就会走代理，并**跳过私有地址校验**（域名交给代理解析），
所以像 Clash TUN + fake-ip 环境下 `web_fetch` 报 "non-public IP" 的情况也一并解决了。

---

## 安装

```powershell
# 从 GitHub（推荐用 commit 锁定）
dsh plugin add "git+https://github.com/<you>/dsh-proxy-switch.git#<commit>"

# 或从 npm（发布后）
dsh plugin add dsh-proxy-switch@0.1.0
```

然后在 `~/.dsh/.env`（Windows：`C:\Users\<user>\.dsh\.env`）里加上：

```ini
http_proxy=http://127.0.0.1:17897
https_proxy=http://127.0.0.1:17897
```

重启一次 DSH（`.env` 只在启动时读取）。之后就不用管了。

> 端口 `17897` 可以用插件配置里的 `routerPort` 改，改完 `.env` 同步改。

---

## 使用

对话输入框旁会多一个 **🌐** 按钮：

| 模式 | 行为 |
|---|---|
| **自动**（默认） | 探测 Clash（1 秒缓存）：在线 → 走 Clash；离线 → 直连 |
| **直连** | 一律直连 |
| **走 Clash** | 一律走 Clash，不自动回退 |

切换即时生效（路由器每条连接都重读模式文件）。

---

## 配置

在 profile 的 `cordis.patch.yml` 里（或插件页的设置）覆盖 `cordis.patch.yml` 中的配置项：

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

# 日志
Get-Content "$env:USERPROFILE\.dsh\dsh-proxy-switch.log" -Tail 20

# 手动经路由器抓网页（应返回 200）
curl.exe -sS -x http://127.0.0.1:17897 -o NUL -w "%{http_code}`n" https://example.com

# 强制切直连
Set-Content -NoNewline "$env:USERPROFILE\.dsh\proxy-mode.txt" direct
```

- **DSH 启动头一两秒有报错**：正常。插件拉起路由器需要约 1–2 秒，之后自愈。
- **日志出现 `owner process ... gone, exiting`**：上一轮 DSH 退出后路由器按约定自我清理，属正常。
- **一直连不上**：确认 `.env` 指向 `17897`、模式不是「走 Clash」而 Clash 没开。

---

## 已知限制

- **不代理 SOCKS**：DSH 只支持 http/https 代理；本路由器只处理 HTTP 与 CONNECT。
- **启动窗口**：DSH 启动后约 1–2 秒内端口可能尚未监听，期间请求会失败一次，随后自动恢复。
- **Clash 端口随客户端不同**：Clash Verge Rev 用 7897，原版 Clash 常见 7890 —— 请按自己的客户端改 `clashPort`。
- **DSH 升级**：插件通过 profile 依赖加载，升级后仍在；DSH 行为变化可能导致需要更新插件。
- **路由器进程**：由插件用 `ELECTRON_RUN_AS_NODE` 拉起，DSH 退出约 2 秒后自行退出。

---

## 致谢 / 参考

- DSH 代理策略：`@deepseek-ai/dsh-http-proxy`（启动器一次性安装，插件不可改）
- 市场索引格式：`@deepseek-ai/dsh-plugin-market-index`

## License

MIT
