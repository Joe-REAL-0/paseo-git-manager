# Paseo Git Manager

按 [开发规划](docs/开发规划.md) 搭建的 TypeScript 插件基础框架。当前实现 P1 的只读工作区面板，尚未完成 P0/P1 的 Paseo 实机验收。

## 已实现

- React Native 工作区面板和命令中心入口，支持宿主主题及窄屏纵向布局。
- `git.status` / `git.diff`：共享 Zod 契约，客户端通过 workspace ID 请求，daemon 侧解析宿主目录。
- 未暂存、已暂存、未跟踪、冲突列表；同文件可同时出现在已暂存和未暂存列表。
- 区分工作目录及暂存区 diff；显示 Git 的二进制提示；未跟踪文件与冲突提供明确提示。
- 当前仓库的真实 worktree 列表，不推断任务目标分支，不自动接管或清理。
- 任务记录 schema、存储接口及操作记录类型，为后续阶段预留边界。

目前没有提交、合并、推送、归档、创建任务或删除资源入口，也不会覆盖 Paseo 内置 Git 按钮。

## 本地开发

需要 Node.js 22.13+、npm 和系统 Git。SDK 固定为 `@getpaseo/plugin@0.15.2`，完整依赖由 `package-lock.json` 固定。

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
# 或运行全部检查
npm run check
```

依赖仅供开发和类型检查；Paseo 在运行时提供 SDK、React、React Native、TanStack Query 与 Zod。无需运行独立 Web 服务，也不生成独立网页。

## 安装到 Paseo（待实机验证）

先核对客户端和 daemon 版本，填写 [兼容性验证记录](docs/兼容性验证.md)。manifest 暂时只放行 `0.15.2`，这是源码类型基线，**不是已经通过测试的兼容承诺**。其他版本需核对匹配 SDK 后再调整。

确认目标 daemon 已由你启用插件功能，再执行：

```sh
paseo plugin install /absolute/path/to/paseo-git-manager
paseo plugin ls
```

进入一个 Git 工作区，在命令中心选择“查看 Git 变更”。修改代码后：

```sh
npm run check
paseo plugin reload paseo-git-manager
paseo plugin logs paseo-git-manager
```

也可在目标 host 的 Settings → Plugins 中填入项目绝对路径。当前工作目录最初不是 Git 仓库；安装插件目录本身无需是仓库，但要在另一个实际 Git 工作区测试面板。

## 代码结构

```text
paseo-plugin.json       插件标识与版本限制
index.client.tsx       面板及命令中心注册
index.server.ts        daemon RPC 注册与宿主适配
client/components/    文件列表
client/panels/        只读 Git 面板
client/queries/       RPC 查询、刷新及缓存
server/git/           命令执行、NUL 输出解析、仓库读取
server/tasks/         workspace 到真实仓库的解析边界
server/storage/       后续持久化接口（尚未实现）
server/lifecycle/     后续生命周期接入约束（尚未实现）
shared/contracts/     已实现的 RPC 契约
shared/schemas/       Git DTO 和任务记录 schema
tests/                临时真实 Git 仓库集成测试及解析测试
docs/                 规划、兼容性和实施记录
```

## 当前限制

- 状态每 10 秒轮询，也支持手动刷新；尚无共享文件 watcher、宿主订阅和完整后台/重连生命周期适配。
- 每个面板独立 QueryClient，查询键含 host、workspace、文件及比较范围；diff 随状态快照刷新。没有跨面板共享缓存。
- Git 命令使用参数数组、字面 pathspec，禁用外部 diff 和 textconv；不执行 shell。单命令 15 秒超时、2 MiB 输出上限，超限显示错误而非不完整成功结果。
- 文件路径必须是仓库内相对路径；当前保守拒绝反斜杠路径。非 UTF-8 文件名和子模块内部 diff 尚未专门支持。
- 大文件、未跟踪内容、冲突编辑器、语法高亮、按行暂存尚未实现。只读查询不构成 Git 的原子快照，外部修改后需要刷新。
- worktree 仅展示 Git 发现结果；尚未关联仓库全部 Paseo workspace、识别共享使用者或持久化任务。
- 存储只有接口，尚未选择宿主私有数据目录、实现原子写入/迁移/损坏恢复；不生成虚假的任务或操作成功记录。

## 后续接入顺序

1. P0：记录目标版本与真实按钮路径，验证安装、面板、RPC 和宿主生命周期。
2. P1：补全 workspace/worktree 关联、任务总览和订阅机制。
3. P2：引入工作区写入队列、持久化操作 ID 和失败恢复，再接暂存/取消暂存/连续本地提交。
4. P3–P5：创建与接管、预览绑定 OID 的合并、明确 refspec 的目标推送、分步归档清理。

接口依据：[官方插件入门](https://paseo.sh/docs/plugins)、[插件参考](https://paseo.sh/docs/plugins/reference) 和安装到本地的 `0.15.2` SDK 类型。滚动文档不替代发行版验证。
