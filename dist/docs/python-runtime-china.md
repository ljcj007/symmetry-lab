# 本站托管的 Python 运行时

计算所用的解释器、标准库与 NumPy、SymPy、mpmath、PyYAML 均随网站放在 `vendor/pyodide/314.0.7/`。中文和英文入口共享这份运行时。首次计算只向当前网站下载资源，不再请求 jsDelivr。保持 Pyodide 314.0.7、CPython 3.14.2 和 `pyemscripten_2026_0` ABI，避免改换镜像时引入解释器或轮子版本不兼容。

`python-runtime.mjs` 显式设置同源的 `indexURL`、`packageBaseUrl`、`stdLibURL`，并传入仅含四个已提供包的锁文件。锁中的包路径必须为本地文件名，依赖必须在白名单内；完整上游锁另存为 `upstream-lock.json`。Pyodide 的包校验保留开启。包缺失时报告错误，不回退境外源。解释器加载限时为 120 秒；失败和超时不会永久缓存失败的 Promise，下一次计算可以重试。Worker 中的请求依次执行。

2026-11-24 实际 GET 核查：中国 [npmmirror 镜像站](https://npmmirror.com/)提供的 [pyodide 314.0.7 npm 包](https://registry.npmmirror.com/pyodide/-/pyodide-314.0.7.tgz)返回 HTTP 200，重定向至其 `cdn.npmmirror.com/packages/` 路径，并允许本站 Origin 的跨域读取。其完整性匹配固定 npm SHA-512；四个核心文件与原保留缓存逐字节相同。常见猜测的 `npmmirror.com/mirrors/pyodide/v314.0.7/full/pyodide.mjs` 实测返回 404，不能直接用替换域名的方法配置。npm 包只含核心文件，科学计算轮子须同时提供。

现有缓存的三个轮子与原上游锁 SHA-256 相符；缺少的 PyYAML 6.0.3 轮子实际从固定上游获取，HTTP 200、CORS `*`，SHA-256 也与原锁相符。这是构建时获取来源；学生计算时全部通过本站获取。逐文件来源、大小、哈希和 HTTP 记录见 [runtime-manifest.json](../vendor/pyodide/314.0.7/runtime-manifest.json)，版权与源码地址见 [NOTICE.txt](../vendor/pyodide/314.0.7/NOTICE.txt)。运行时资源及已抽出的许可证约 21.37 MB（十进制，未压缩静态文件），不包含整站其他资源。

离线校验与维护命令：

```powershell
python scripts/vendor-python-runtime.py --check
node scripts/test-python-runtime.mjs
node scripts/test-python-runtime-browser.mjs "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
```

首个命令只读并核查保存的全部资源，不联网。浏览器测试使用新的隐藏 Chromium/Edge 配置，禁止境外网络；实际执行双阱驻点、NumPy 声子本征问题和 PyYAML Phonopy 导入，同时注入解释器导入失败及轮子下载失败，检查同一 Worker 可以重试。重新获取固定资源可运行 `python scripts/vendor-python-runtime.py --cache <现有固定缓存目录>`；省略缓存目录则从固定上游获取轮子。脚本校验固定 tarball、锁和所有轮子哈希，不会升级版本。

这项修改消除第三方运行时域名的首次加载依赖。正式网站所在域名仍须在访问者网络可达；本轮没有在中国大陆各省运营商网络实测，也没有因此完成部署或宣称现有 GitHub Pages 在所有大陆网络稳定可达。可将相同静态网站整体托管在学校或中国大陆可达的服务器，资源路径无需再次改写。服务器应返回 `.mjs` 的 JavaScript 类型和 `.wasm` 的 `application/wasm` 类型，保持相对目录。官方部署与配置依据：[固定版本 JavaScript API](https://pyodide.org/en/314.0.7/usage/api/js-api.html)、[Pyodide 部署说明](https://pyodide.org/en/stable/usage/downloading-and-deploying.html)。
