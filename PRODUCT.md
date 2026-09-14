# 求职 Copilot
<!-- impeccable:product-schema 1 -->
## Platform
web
## Stack
Manifest V3、React、TypeScript、Vite；本地 Chrome Storage。
## Users
需要反复填写公司官网简历的校招、实习及社招求职者。
## Product Purpose
维护一份标准简历，辅助填写华为招聘页面并检查结果。
## Capabilities and Constraints
V0.2：纯文字简历内容库、通用模板、当前页面结构扫描、明确同义词与精确自定义字段匹配。不得自动提交，不猜测敏感字段，不上传内容库，不调用第三方模型。
## Evidence on Hand
用户提供了完整需求与侧边栏布局草图；没有提供真实华为登录后 DOM 或测试简历。
## Product Principles
准确率、安全、稳定性优先。未知数据留空，已有内容保留。真实站点适配必须有实测证据。
