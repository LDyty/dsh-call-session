# 规格说明: 同级会话两级钻取发现与纯切片引用规范

## Problem Statement

在多智能体协作与多工作区并行开发中，用户在输入框键入 @ 符号时，常面临两类严重阻抗：
第一，若会话直接在首屏平铺，会导致不同工程的会话相互混杂，不仅破坏工作区物理边界，还会因加载过多无关历史而拖慢界面响应；
第二，下钻工作区后，若列表充斥着大量内部临时子智能体与已归档的任务死会话，用户不仅难以分辨哪些是当前真正自治协作的同级根会话，还会在存在同名会话时产生严重的选定歧义，甚至担忧输入框引用会意外触发外部调度或污染协作看板连线。

## Solution

在客户端提供轻量自内聚的输入触发源，实现清晰的两级钻取架构：
一级阶段仅暴露可访问的工作区入口，明确物理工程边界，当前工作区自动置顶；
二级阶段进入选定工作区后，提供纯净的扁平同级会话列表，严格剔除所有内部从属的子代理任务与已归档终态会话；
二级会话执行两级确定性排序：优先置顶曾参与单播调度与黑板发布的协同会话，次级按最新更新时间倒序；
候选项集成前置井号 8 位规范短 ID 徽标与三态状态，实现直观消歧；
选定后生成标准原子胶囊卡片，消息提交严格复用原生只读切片机制，协作看板调度连线计数严格恒等于 0，不越界唤醒对端；
确立单帧 5 毫秒以内的纯内存刷新性能预算与 50 条上限约束，保障界面流畅。

## User Stories

1. As a collaborative developer, I want typing @ in the composer to present only a list of accessible workspaces at the top level, so that my candidate menu remains concise and workspace boundaries are never breached.
2. As a project owner, I want the current workspace automatically pinned to the top of the workspace list, so that I can immediately drill into my local working directory without searching.
3. As an engineer drilling into a workspace, I want the secondary list to strictly exclude all internal subagents and pipeline worker tasks, so that I only see autonomous root sessions capable of peer collaboration.
4. As an engineer inspecting a workspace, I want the secondary list to completely filter out archived or terminated sessions, so that dead tasks never clutter my active selection surface.
5. As a collaborator in multi-agent workflows, I want sessions registered with call-session to be prioritized at the very top of the secondary list, so that active collaborators are instantly reachable.
6. As a multi-session user, I want secondary sessions with the same registration priority to be sorted strictly by latest native update timestamp, so that recently active sessions appear before older ones.
7. As a developer managing parallel tasks with identical titles, I want candidate rows to display an 8-character canonical short ID badge, so that I can disambiguate duplicate session names at a single glance.
8. As a system observer, I want candidate rows to present native three-state execution status indicators, so that I know whether each peer session is running, idle, or in an error state.
9. As a keyboard-first developer, I want Tab or Enter on a workspace row to drill down smoothly, and Escape to dismiss without modifying my draft, so that navigation is completely fluid without a mouse.
10. As a multi-workspace user, I want a breadcrumb trail at the top of the drilled menu showing Workspace Root / <workspace-name>, so that I can return to the top-level workspace list with a single action.
11. As a composer user, I want selecting a session to insert a clean inline chip showing only the session icon and title, so that my prompt draft stays compact and readable.
12. As an engineer verifying references, I want hovering over an inserted chip to reveal a tooltip displaying the full workspace path, short ID, session ID, and status, so that I can confirm target details before submission.
13. As an architect enforcing boundary constraints, I want session mentions in the composer to act strictly as pure read-only background text slices, so that no external agent wakeup or unicast dispatch is triggered.
14. As an architect protecting telemetry integrity, I want text-based peer references to leave collaboration canvas connections strictly untouched with activeCalls remaining 0, so that canvas edges strictly reflect physical call telemetry.
15. As a performance-conscious engineer, I want the candidate filtering and sorting pipeline to execute within a 5-millisecond in-memory SLA budget and clamp at 50 items, so that the autocomplete popup renders at 60 frames per second without frame drops.
16. As a bilingual user, I want all section titles, breadcrumbs, and status labels symmetrically localized in Simplified Chinese and English, so that interface copy matches my language preference.

## Implementation Decisions

### 钻取架构

功能完全收敛在插件客户端输入源契约中，命名为 peer-session，触发字符为 @，排序权重配置为 5。
- 一级未下钻状态：仅输出工作区目录，声明 drill 为 true，图元为文件夹，分组为本地化工作区词条；
- 二级已下钻状态：按目标工程目录展开扁平列表，不设微小节微分类，保持单层结构；
- 层级导航条契约：下钻后顶栏发布两级导航条，激活根节点重置为一级列表。

### 会话清洗

彻底剔除两类非协同实体：
- 严格过滤子会话：断言来源为 subagent、具备 parentSession 或 parentId 关联引用、delegationDepth 大于 0、或标题包含 subagent 等内部特征的会话直接忽略；
- 严格过滤归档会话：断言标记为 archived 或状态为 archived、dismissed、deleted 的会话直接忽略。

### 排序契约

二级展开时严格按照两级逻辑排序：
- 第一优先级：检查调用连线记录与黑板存储，凡参与过单播调用呼入呼出、发布过黑板条目、或由同级工厂创建的会话集合判定为已注册，优先置首；
- 第二优先级：按会话原生 updatedAt 或 createdAt 降序排列。

```typescript
// 提取自原型与生产验证的排序模型
interface PeerCandidateSortingModel {
  isRegisteredWithCallSession: boolean;
  timestamp: number;
}
```

### 零越界

- 看板零连线不变式：全流程中 activeCalls 严格恒等于 0，不向环形缓冲区写入调用记录，不向黑板写入数据；
- 纯切片不变式：输出标准规范 dsh-session 引用，由底层原生预处理服务解码并以只读方式注入 Referenced sessions，绝不跨越插件边界探测宿主私有对象。

### 性能指标

遵循 ADR-0020 资源预算规范：
- 一级工作区发现与过滤延迟 P99 小于等于 2 毫秒；
- 二级会话过滤与排序延迟 P99 小于等于 5 毫秒；
- 全流程纯内存求值，零磁盘 I/O，零网络开销；
- 二级展现结果硬性截断上限为 50 条，杜绝超长列表引起界面卡顿。

## Testing Decisions

### 质量标准

测试严格面向外部可观测行为，运行于 Node VM 沙箱隔离环境中。测试必须验证：
- 一级菜单仅包含工作区条目，零会话暴露；
- 下钻后二级会话列表无微小节干扰，排除自身、排除子代理、排除归档会话；
- 已协作会话严格置于未协作会话之上，同组内按时间倒序；
- 8 位规范短 ID 徽标格式固定为井号加 8 位小写字母数字；
- 协作看板调用连线计数在全流程中严格恒等于 0。

### 测试模块

- 测试文件：tests/peer-session-reference.test.mjs；
- 参考 tests/helpers/canvas-harness.mjs 中的沙箱模块加载器与上下文隔离机制。

## Out of Scope

- 绝不通过猴子补丁或进程外侵入篡改宿主原生 reference 源的一级输出；
- 不在协作看板上为输入框文本引用绘制连线；
- 不对被引用的会话进行物理生命周期干预或强制唤醒。

## Further Notes

该规范的所有原则、不变式与排序模型已在 ADR-0034 中正式归档，并在真实 DSH Web 宿主环境中完成全流程实测验证。
