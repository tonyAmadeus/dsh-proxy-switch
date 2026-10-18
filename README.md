# dsh-proxy-switch

<p align="center">
  <a href="https://github.com/tonyAmadeus/dsh-proxy-switch/releases"><img alt="version" src="https://img.shields.io/github/v/tag/tonyAmadeus/dsh-proxy-switch?label=version&color=38bdf8"></a>
  <a href="https://github.com/tonyAmadeus/dsh-proxy-switch/stargazers"><img alt="stars" src="https://img.shields.io/github/stars/tonyAmadeus/dsh-proxy-switch?color=22d3ee"></a>
  <a href="https://www.npmjs.com/package/dsh-proxy-switch"><img alt="npm" src="https://img.shields.io/npm/v/dsh-proxy-switch?color=cb3837"></a>
  <a href="https://github.com/tonyAmadeus/dsh-proxy-switch/blob/main/LICENSE"><img alt="license" src="https://img.shields.io/github/license/tonyAmadeus/dsh-proxy-switch?color=22d3ee"></a>
  <img alt="DSH" src="https://img.shields.io/badge/DSH-0.2.x-4B9CD3">
  <img alt="dsh-plugin" src="https://img.shields.io/badge/dsh--plugin-%E2%9C%93-2ea44f">
</p>

DeepSeek Harness锛圖SH锛夌殑鍑虹珯浠ｇ悊寮€鍏炽€?*Clash 寮€鐫€灏辫蛋 Clash锛屽叧鎺夊氨鑷姩鐩磋繛锛岀晫闈笂涓€閿垏鎹紝涓嶇敤閲嶅惎 DSH銆?*

Outbound proxy switch for DeepSeek Harness: a local router picks Clash or direct per mode, with an in-UI switch. No DSH restart.

- 浠撳簱锛歨ttps://github.com/tonyAmadeus/dsh-proxy-switch
- 娴嬭瘯鐜锛欴SH 妗岄潰鐗?`0.2.1-rc.2`锛圵indows 11锛?- 璁稿彲璇侊細MIT

---

## 涓轰粈涔堥渶瑕佸畠

DSH 鐨勪唬鐞嗙瓥鐣ユ槸**鍚姩鍣ㄥ湪鎻掍欢鍔犺浇涔嬪墠**浠?`.env` 涓€娆℃€у畨瑁呯殑锛?
- 濡傛灉浣犳妸 `.env` 鍐欐垚 `https_proxy=http://127.0.0.1:7897`锛圕lash锛夛紝閭?**Clash 涓€鍏筹紝DSH 鍏ㄧ嚎鏂綉**锛?- 鎻掍欢鍔犺浇寰楁瘮杩欐櫄锛屾敼涓嶄簡宸茬粡瑁呭ソ鐨勭瓥鐣ャ€?
鏈彃浠惰 `.env` 鎸囧悜瀹冭嚜宸辩殑**鏈湴璺敱鍣?*锛岀敱璺敱鍣ㄥ湪姣忔杩炴帴鏃跺喅瀹氬嚭鍙ｏ細

```
.env 鈹€鈹€鈻?127.0.0.1:17897锛堟湰鎻掍欢鐨勮矾鐢卞櫒锛?                              鈹溾攢 auto   : Clash 鍙揪 鈫?璧?Clash锛涗笉鍙揪 鈫?鐩磋繛
                              鈹溾攢 direct : 鐩磋繛
                              鈹斺攢 clash  : 璧?Clash锛堜笉鑷姩鍥為€€锛?```

椤哄甫鐨勫ソ澶勶細DSH 鐪嬪埌 `HTTPS_PROXY` 灏变細璧颁唬鐞嗭紝骞?*璺宠繃绉佹湁鍦板潃鏍￠獙**锛堝煙鍚嶄氦缁欎唬鐞嗚В鏋愶級锛?鎵€浠?Clash TUN + fake-ip 鐜涓?`web_fetch` 鎶?`non-public IP` 鐨勯棶棰樹篃涓€骞惰В鍐充簡銆?
---

## 瀹夎

### 1. 瀹夎鎻掍欢

浠?npm 瀹夎锛堟帹鑽愶紝鏈€绠€鍗曪級锛?
```powershell
dsh plugin add dsh-proxy-switch@0.1.0
```

涔熷彲浠ョ洿鎺ラ攣瀹?git tag锛堜笉渚濊禆 npm锛夛細

```powershell
dsh plugin add "git+https://github.com/tonyAmadeus/dsh-proxy-switch.git#v0.3.1"
```

鎯宠鏇翠弗鏍硷紝鍙互鎶?`#` 鍚庨潰鎹㈡垚浠撳簱棣栭〉鏄剧ず鐨?commit hash锛宑ommit 瀹屽叏涓嶅彲鍙樸€?
### 2. 璁?DSH 璧拌繖涓矾鐢卞櫒

缂栬緫 `~/.dsh/.env`锛圵indows锛歚C:\Users\<user>\.dsh\.env`锛夛紝鍔犲叆锛?
```ini
http_proxy=http://127.0.0.1:17897
https_proxy=http://127.0.0.1:17897
```

鐒跺悗**閲嶅惎涓€娆?DSH**锛坄.env` 鍙湪鍚姩鏃惰鍙栵級銆?
> 杩欎袱琛屾槸**蹇呴』鐨?*锛氫笉閰嶇殑璇濇彃浠朵笉浼氬弬涓庨€夎矾锛孋lash 鍏虫帀鏃?DSH 鐓ф牱鏂綉銆?> 绔彛 `17897` 鑻ュ湪鎻掍欢閰嶇疆閲屾敼杩囷紝杩欓噷瑕佸悓姝ユ敼銆?
---

## 浣跨敤

鎻掍欢鎻愪緵涓や釜鍏ュ彛锛?
1. **璁剧疆 鈫?浠ｇ悊**锛堣嫳鏂囩晫闈?**Proxy**锛夆€斺€斿畬鏁磋缃〉锛氬嚭鍙ｆā寮忋€佽繍琛岀姸鎬併€佽亰澶╂鎸夐挳寮€鍏?2. **鑱婂ぉ杈撳叆妗嗗彸涓嬫柟鐨?馃寪 鎸夐挳**锛堥粯璁ゅ紑鍚級鈥斺€旈殢鎵嬬偣寮€鍗冲彲鍒囨崲妯″紡

| 妯″紡 | 琛屼负 | 浣曟椂鐢?|
|---|---|---|
| **鑷姩**锛堥粯璁わ級 | 鎺㈡祴 Clash锛? 绉掔紦瀛橈級锛氬湪绾?鈫?璧?Clash锛涚绾?鈫?鐩磋繛 | 鏃ュ父 |
| **鐩磋繛** | 涓€寰嬬洿杩?| 鏄庣‘涓嶅紑 Clash |
| **璧?Clash** | 涓€寰嬭蛋 Clash锛屼笉鑷姩鍥為€€ | 蹇呴』纭繚璧拌妭鐐?|

鍒囨崲鍗虫椂鐢熸晥鈥斺€旇矾鐢卞櫒鍦ㄦ瘡鏉¤繛鎺ヤ笂閲嶈妯″紡鏂囦欢锛屼笉闇€瑕侀噸鍚?DSH銆?鐘舵€佽浼氭樉绀?`Clash 鍦ㄧ嚎/鏈繍琛宍銆乣璺敱鍣ㄥ湪绾?绂荤嚎`銆?
### 鏄剧ず / 闅愯棌鑱婂ぉ妗嗘寜閽?
璁剧疆椤靛簳閮ㄦ湁 **銆屽湪鑱婂ぉ妗嗕笅鏂规樉绀烘彃浠舵寜閽€?* 寮€鍏筹紙榛樿寮€鍚級锛?
- **寮€鍚?*锛氳亰澶╄緭鍏ユ涓嬫柟鏄剧ず 馃寪 鎸夐挳锛堝拰浠ュ墠涓€鏍凤級
- **鍏抽棴**锛氳亰澶╁尯涓嶅啀鏄剧ず鎸夐挳锛屽彧淇濈暀璁剧疆椤佃繖涓€澶勫叆鍙?
寮€鍏崇姸鎬佷繚瀛樺湪 `$DSH_HOME/proxy-ui.json`锛岄噸鍚?DSH 鍚庝繚鎸侊紱涓ゅ鍏ュ彛鐨勬ā寮忕姸鎬佹槸鍏变韩鐨勩€?
---

## 閰嶇疆

榛樿閰嶇疆鍦ㄦ彃浠剁殑 `cordis.patch.yml`銆傝瑕嗙洊锛屽湪 profile 鐨?`cordis.patch.yml`
閲屽姞涓€鏉?*鍚?id** 鐨?patch 鏉＄洰锛坧rofile 鏄?`~/.dsh/profiles/<鍚嶅瓧>/`锛夛細

```yaml
- id: dsh-proxy-switch
  config:
    routerPort: 17897
    clashPort: 7897
```

| 瀛楁 | 榛樿鍊?| 璇存槑 |
|---|---|---|
| `routerPort` | `17897` | 鏈湴璺敱鍣ㄧ洃鍚鍙ｏ紙`.env` 瑕佹寚鍚戝畠锛?|
| `clashPort` | `7897` | Clash / Mihomo 鐨勬贩鍚堢鍙ｏ紙Clash Verge Rev 榛樿 7897锛屽師鐗?Clash 甯歌 7890锛?|
| `modeFile` | `$DSH_HOME/proxy-mode.txt` | 妯″紡鏂囦欢锛坄auto` / `direct` / `clash`锛?|
| `logFile` | `$DSH_HOME/dsh-proxy-switch.log` | 杩愯鏃ュ織锛堣秴 512KB 鑷姩鎴柇锛?|

`$DSH_HOME` 榛樿鏄?`~/.dsh`锛屽彲鐢ㄧ幆澧冨彉閲忚鐩栥€?
---

## 鎺掗殰

```powershell
# 璺敱鍣ㄦ槸鍚﹀湪鐩戝惉
Get-NetTCPConnection -LocalPort 17897 -State Listen

# 鏃ュ織锛圵indows 榛樿璺緞锛?Get-Content "$env:USERPROFILE\.dsh\dsh-proxy-switch.log" -Tail 20

# 鎵嬪姩缁忚矾鐢卞櫒鎶撶綉椤碉紙搴旇繑鍥?200锛?curl.exe -sS -x http://127.0.0.1:17897 -o NUL -w "%{http_code}`n" https://example.com

# 寮哄埗鍒囩洿杩?Set-Content -NoNewline "$env:USERPROFILE\.dsh\proxy-mode.txt" direct
```

- **DSH 鍚姩澶翠竴涓ょ鏈夋姤閿?*锛氭甯搞€傛彃浠舵媺璧疯矾鐢卞櫒闇€瑕佺害 1鈥? 绉掞紝涔嬪悗鑷剤銆?- **鏃ュ織鍑虹幇 `owner process ... gone, exiting`**锛氫笂涓€杞?DSH 閫€鍑哄悗璺敱鍣ㄦ寜绾﹀畾鑷垜娓呯悊锛屽睘姝ｅ父銆?- **涓€鐩磋繛涓嶄笂**锛氬厛纭 `.env` 閲岄偅涓よ鍦紱鍐嶇‘璁ゆā寮忎笉鏄€岃蛋 Clash銆嶈€?Clash 娌″紑銆?- **璁剧疆閲岀湅涓嶅埌銆屼唬鐞嗐€嶈繖涓€鑺?*锛氳鏄庢彃浠舵病鍔犺浇鎴愬姛锛岀湅 DSH 鎻掍欢椤电殑閿欒淇℃伅涓庝笂闈㈢殑鏃ュ織銆?
### 鍗歌浇

```powershell
dsh plugin remove dsh-proxy-switch
```

鐒跺悗鍒犳帀 `.env` 閲岄偅涓よ骞堕噸鍚?DSH銆?
---

## 宸茬煡闄愬埗

- **鍙敮鎸?HTTP/HTTPS 浠ｇ悊**锛欴SH 涓嶆敮鎸?SOCKS锛涙湰璺敱鍣ㄥ彧澶勭悊 HTTP 涓?CONNECT銆?- **鍚姩绐楀彛**锛欴SH 鍚姩鍚庣害 1鈥? 绉掑唴绔彛鍙兘灏氭湭鐩戝惉锛屾湡闂磋姹備細澶辫触涓€娆★紝闅忓悗鑷姩鎭㈠銆?- **Clash 绔彛鍥犲鎴风鑰屽紓**锛欳lash Verge Rev 鐢?7897锛屽師鐗?Clash 甯歌 7890 鈥斺€?鎸夎嚜宸辩殑瀹㈡埛绔敼 `clashPort`銆?- **DSH 鍗囩骇**锛氭彃浠剁粡 profile 渚濊禆鍔犺浇锛屽崌绾у悗涓€鑸粛鍦紱DSH 琛屼负鑻ュ彉鍖栧彲鑳介渶瑕佹洿鏂版彃浠躲€?- **璺敱鍣ㄨ繘绋?*锛氱敱鎻掍欢鐢?`ELECTRON_RUN_AS_NODE` 鎷夎捣锛孌SH 閫€鍑虹害 2 绉掑悗鑷閫€鍑猴紝涓嶇暀瀛ゅ効杩涚▼銆?
---

## 鍙傝€?
- DSH 浠ｇ悊绛栫暐锛歚@deepseek-ai/dsh-http-proxy`锛堝惎鍔ㄥ櫒涓€娆℃€у畨瑁咃紝鎻掍欢涓嶅彲鏀癸級
- 甯傚満绱㈠紩鏍煎紡锛歚@deepseek-ai/dsh-plugin-market-index`

## License

MIT 漏 2026 tonyAmadeus
