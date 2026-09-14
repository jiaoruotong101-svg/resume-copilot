# 求职 Copilot · V0.2.2

![Resume Copilot](public/icons/icon-128.png)

扩展图标为原创矢量设计：简历纸张与勾形向上箭头。源文件位于 `public/icons/icon.svg`；16、32、48、128 像素 PNG 已随包提供。重新生成可运行 `node scripts/icons.mjs`（需要已安装 Edge，或设置 `COPILOT_BROWSER_PATH`）。

本次更新：修复空教育字段串行解析、多行描述丢失；增加拟填写内容预览和待处理筛选，优化侧栏配色和阅读体验。27 项单元测试通过。自定义下拉、日期弹层及真实登录页的完整适配仍需后续验证。

本地优先的 Chrome / Edge Manifest V3 扩展。维护一份纯文字简历内容库，读取华为招聘当前页面结构，匹配并填写已有信息。

## 安装与使用

1. 打开 Chrome 的 `chrome://extensions` 或 Edge 的 `edge://extensions`。
2. 开启「开发者模式」，点击「加载已解压的扩展程序」。
3. 选择本项目 **dist** 文件夹（不是项目根目录）。
4. 在华为招聘官网 `https://career.huawei.com` 自行登录，点击浏览器工具栏上的扩展图标，打开右侧面板。首次安装或从 V0.1 更新后，请接受仅针对 `career.huawei.com` 的网站访问权限。
5. 进入「简历内容库」，点击「补全通用模板」并按“字段名：内容”填写；补全操作会保留已有内容，只增加缺少字段。点击「解析并预览」，核对后保存。
6. 在招聘网页展开要填写的编辑区。页面上的重复经历数量、顺序需与内容库一致。
7. 先点击「扫描并匹配当前页面」，核对结果，再点击「填写已匹配字段」。手动处理所有「需确认」和「手动填写」项。
8. 最终提交由你在招聘网页上主动操作。扩展没有提交申请的代码。

扩展只声明 `https://career.huawei.com/*` 的网站访问权限，不读取其他网站。若浏览器曾手动限制该权限，请在扩展管理页把本扩展的「网站访问权限」设为允许 `career.huawei.com`。Side Panel 必须通过浏览器用户操作打开，不会强制弹出。

## 已实现

- MV3 后台、React Side Panel、按操作注入的 Content Script。
- 可长期维护的纯文字简历内容库；内置基本信息、求职意向、教育、工作、项目、校园经历、技能与成果模板。
- 明确标签的姓名、联系方式及教育字段结构化解析；其他字段使用章节、经历顺序、同义词和唯一高相似候选进行受控匹配。
- `chrome.storage.local` 保存，不使用云同步；仅受信任的扩展上下文可以直接读取存储。
- 独立 HuaweiAdapter：递归读取开放 Shadow DOM，并通过 label、ARIA、华为 AUI 表单容器、placeholder、name、id 做本地规则映射。
- 标准输入框、文本域、原生 select、month/date 输入；React 原生 setter 加 input/change/blur 事件。
- 明确分组的重复教育记录；映射置信度；保留网页已有值；检查缺失、与档案不一致、日期倒序、重复教育记录。
- 不自动填写敏感项、授权复选框、单选项和未知控件，不绕过登录或验证码。

## 当前限制：请先阅读

这是一版可构建、可加载、已在模拟表单上验证的实现，**尚未在华为真实登录后的简历表单上验证**，不能承诺“绝大多数字段已适配”。HuaweiAdapter 当前采用可维护的语义标签与常见表单容器规则，没有编造华为专用 CSS 选择器。

- 内容库依赖明确的“字段名：内容”格式，但网页字段名无需完全一致。同名或相近字段如果存在多个不同值会被视为歧义，不会自动填写；多段经历按章节和网页顺序匹配后仍需人工核对。
- 暂不执行远程 LLM；不存在虚假的 AI 解析或评分。规则置信度是规则等级，未经统计校准。
- 自定义 combobox、日期弹层、级联地区/学校选择器、只读控件、iframe 内字段、Shadow DOM 需手动填写。
- 不自动点击“新增经历”。未明确分组的重复字段跳过；分组按 DOM 顺序与内容库逐段对应。新增后须确认两边顺序一致。
- 只有年月时不会捏造具体日；学历与学位不混用。单选、复选等选项保留给用户处理。
- 检查只覆盖当前可见主页面字段，不保证网页保存后的服务器状态；提交前仍须人工核对。
- V0.2 不含 JD 分析、岗位推荐、开放题生成或投递记录。
- 本地存储不加密。JSON 导出文件包含个人信息，请自行妥善保存；不保存招聘账号密码。

## 开发与验证

Node.js 24，依赖版本由 package-lock.json 锁定。

```powershell
cd D:\projects\Study\job-copilot
npm ci
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run dev` 只提供界面预览，不具备浏览器扩展 API。`dist` 是可加载扩展。

端到端测试使用独立临时浏览器档案、虚构候选人和拦截到本机的模拟华为 URL。测试直接验证生产 manifest 声明的单一华为招聘域名权限，不再在测试副本中额外补权限。真实 Side Panel 展开仍需按安装步骤手动验收。

本次验证：25 项单元测试通过，TypeScript 检查与生产构建通过，依赖审计 0 个已知漏洞。浏览器测试已在本机 Edge 中验证内容库持久化、开放 Shadow DOM 扫描、Content Script 通信、React 表单、重复经历顺序、同义词与唯一高相似候选、歧义拒绝、敏感字段保护及禁止提交。可指定已安装的 Edge：

```powershell
$env:COPILOT_BROWSER_PATH='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
npm run test:e2e
```

## 文件与架构

| 文件 | 职责 |
| --- | --- |
| public/manifest.json、src/background.ts | 权限、Side Panel 初始化、存储访问范围 |
| src/App.tsx、src/style.css | 侧边栏、档案编辑、导入、结果呈现 |
| src/profile.ts、src/storage.ts | 标准数据结构、校验、本地持久化 |
| src/parser.ts | 通用文字模板、键值字段与教育经历解析 |
| src/adapter.ts | HuaweiAdapter、同义词映射、填写与检查 |
| src/content.ts | 消息校验、注入防重复、单次填写互斥 |
| tests/core.test.ts、tests/fixture.tsx | 保护规则与模拟 React 招聘表单 |
| scripts/build.mjs、scripts/e2e.mjs | 构建、浏览器集成验证 |

下一阶段先在华为真实编辑页核对字段和 DOM 分组，再添加有证据的站点专属规则及对应回归测试；优先校准自定义学校、学历与日期控件，再扩展项目和实习经历。

官方接口参考：[Chrome Side Panel](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)、[脚本注入与权限](https://developer.chrome.com/docs/extensions/reference/api/scripting)。
