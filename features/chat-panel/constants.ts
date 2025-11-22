import { FileText, Settings, Zap } from "lucide-react";

import type { QuickActionDefinition } from "@/components/quick-action-bar";
import type { FlowPilotBriefState } from "@/components/flowpilot-brief";
import type { ToolPanel, ToolbarActionDefinition } from "./types";

export const FLOWPILOT_AI_CALIBRATION_PROMPT = `### FlowPilot 校准舱 · AI 重排指令
我们需要在不改变节点语义的前提下，利用当前 draw.io XML 对图表做一次「版式重排」。目标：保持单页展示 (x:0-800, y:0-600)，让主流程更突出、泳道/分区更规整，箭头间距更干净。

硬性要求：
1. 保留全部节点、标签与图标，只有在完全重叠或内容为空时才能合并，绝不新增业务含义。
2. 若原图存在泳道/分组/容器，沿用它们并保持 64px 垂直间距，内部子节点水平间距 56-80px、垂直间距 64-96px，容器 padding ≥ 24px。
3. 所有节点对齐到 24px 网格，避免出现负坐标或跨页；必要时统一节点宽度或高度以获得更好的列对齐。节点与标签周围至少留出 12-16px 避让空间。
4. 连接线必须使用 orthogonalEdgeStyle、rounded=1、endArrow=block、strokeColor=#1f2937，尽量减少交叉，允许添加/调整拐点；严禁穿过节点或遮挡标签，必要时增加中继点绕行。
5. 至少强调一条「主流程」路径，可通过加粗箭头或淡色背景突出，但绝不改动文字内容，同时保持不遮挡其他节点。
6. 提交前自检：无元素越界、无重叠、无孤立箭头或断开的连线，线条不压住文字，所有节点和箭头均在视口内。

执行策略：
- 如果只是部分细节调整，可用 edit_diagram 进行批量替换；若布局极度混乱，请直接用 display_diagram 返回全新的 <root>，并在 0-800 × 0-600 内排布。
- 维持既有配色/主题（如 AWS 图标、泳道色块等），只整理结构与间距。

请根据上述要求返回最终 XML，只能通过合适的工具调用输出，勿在文本中粘贴 XML。`;

export const TOOLBAR_ACTIONS: Record<ToolPanel, ToolbarActionDefinition> = {
    brief: {
        label: "配置",
        icon: Settings,
        description: "调整 FlowPilot Brief 偏好",
    },
    calibration: {
        label: "校准",
        icon: Zap,
        description: "触发画布整理与布局建议",
    },
    actions: {
        label: "模板",
        icon: FileText,
        description: "调用灵感与述职模板",
    },
};

export const TOOLBAR_PANELS: ToolPanel[] = ["brief", "calibration", "actions"];

export const QUICK_ACTIONS: QuickActionDefinition[] = [
    {
        id: "aws-refresh",
        title: "重建这张 AWS 架构图",
        description: "使用最新版 AWS 图标与规范化间距重新规划画布。",
        prompt:
            "请读取当前架构图，在 800x600 画布范围内，使用 2025 版 AWS 图标、简洁标签与均衡间距重新绘制。",
        badge: "架构",
        attachment: {
            path: "/architecture.png",
            fileName: "architecture.png",
            mime: "image/png",
        },
    },
    {
        id: "journey",
        title: "客户旅程地图",
        description: "展示四个阶段的目标、触点与情绪。",
        prompt:
            "请绘制一个包含发现、考虑、采用、支持四个阶段的客户旅程图，并加入目标、触点、情绪泳道以及各阶段之间的箭头。",
        badge: "策略",
    },
    {
        id: "polish",
        title: "润色当前图表",
        description: "优化间距、对齐节点并突出主流程。",
        prompt:
            "请检查当前图表，整理布局、对齐相关节点，并为每条泳道添加淡色区分，保持原有内容不变。",
        badge: "整理",
    },
    {
        id: "explain",
        title: "解释当前图表",
        description: "总结结构并提出下一步优化建议。",
        prompt:
            "请阅读当前图表 XML，为产品经理总结其结构，并给出一条影响最大的改进建议，暂不修改图表。",
        badge: "洞察",
    },
    {
        id: "sequence-handoff",
        title: "核心服务时序",
        description: "生成跨服务请求-响应链路。",
        prompt:
            "以 PlantUML 时序图风格重现“用户下单→风控→库存→支付→通知”链路，为每个角色添加生命线与异步回调标记，突出超时/重试分支。",
        badge: "时序",
    },
    {
        id: "activity-risk",
        title: "风控活动流",
        description: "展示策略引擎的分支逻辑。",
        prompt:
            "请绘制一个包含“信号采集→打分→决策→处置”主干，并包含人工复核与自动放行支线的 Activity Diagram，标注入口/出口条件。",
        badge: "活动",
    },
    {
        id: "component-contract",
        title: "组件依赖矩阵",
        description: "理清子系统与 API 契约。",
        prompt:
            "请输出组件图，包含网关、身份、订单、库存、计费、通知六个组件，标出同步/异步调用方向并注明协议（REST、gRPC、MQ）。",
        badge: "组件",
    },
    {
        id: "deployment-layers",
        title: "多环境部署拓扑",
        description: "展示区域/可用区/服务实例。",
        prompt:
            "用部署图描述“用户 > 边缘 CDN > 入口网关 > 应用层 > 数据层”的拓扑，区分生产/预发，并标注安全域与端口策略。",
        badge: "部署",
    },
    {
        id: "mindmap-workshop",
        title: "工作坊思维导图",
        description: "快速整理灵感簇。",
        prompt:
            "请生成一张以“AI 增长策略”为中心的思维导图，分支包括获客、活跃、留存、变现、组织，二级节点写出具体举措并保持草稿质感。",
        badge: "灵感",
    },
];

export type FlowShowcasePreset = {
    id: string;
    title: string;
    description: string;
    caption: string;
    prompt: string;
    tags: string[];
    previewLabel: string;
    accent: {
        from: string;
        to: string;
    };
    brief: FlowPilotBriefState;
};

export const FLOW_SHOWCASE_PRESETS: FlowShowcasePreset[] = [
    {
        id: "sketch-strategy-canvas",
        title: "手绘战略蓝本",
        description: "旅程 + 思维导图组合，适合策略工作坊快速定调。",
        caption: "Journey × Mindmap",
        prompt:
            "请用 draw.io 草稿主题绘制一个“战略工作坊”样板：以客户旅程四阶段为主轴，在每个阶段下展开目标、关键触点、情绪、机会，用思维导图/便签表现发散要点，整体保持手写草稿质感。",
        tags: ["草稿风", "旅程", "导图"],
        previewLabel: "Sketch Playbook",
        accent: {
            from: "#fde68a",
            to: "#f97316",
        },
        brief: {
            intent: "draft",
            tone: "sketch",
            focus: ["hierarchy"],
            diagramTypes: ["journey", "mindmap"],
        },
    },
    {
        id: "enterprise-architecture-grid",
        title: "企业级组件样板",
        description: "三层组件 + 部署拓扑，突出依赖与安全域。",
        caption: "Component Grid",
        prompt:
            "请生成一张“数字体验平台”示例：上层为体验/渠道，中层为业务服务（会员、订单、库存、结算、推荐），下层为支撑（数据湖、消息总线、监控）。为每个组件标注 API/协议，并在右侧补充部署示意（公有云/私有云）。",
        tags: ["组件图", "部署", "企业风"],
        previewLabel: "Enterprise Blueprint",
        accent: {
            from: "#93c5fd",
            to: "#1d4ed8",
        },
        brief: {
            intent: "draft",
            tone: "enterprise",
            focus: ["flow", "clarity"],
            diagramTypes: ["component", "deployment"],
        },
    },
    {
        id: "customer-success-gallery",
        title: "客户成功续约剧本",
        description: "旅程健康度 + 机会矩阵的复合表达。",
        caption: "Journey Health",
        prompt:
            "请绘制一张客户成功样板：左侧是发现、上线、扩散、续约四阶段旅程（含目标、触点、情绪）；右侧是 2×3 增购机会矩阵（行=现有团队/新团队，列=功能深用/增值模块/服务包），并用连接线指出高优先级机会。",
        tags: ["CSM", "旅程", "续约"],
        previewLabel: "Success Studio",
        accent: {
            from: "#a5f3fc",
            to: "#14b8a6",
        },
        brief: {
            intent: "draft",
            tone: "balanced",
            focus: ["clarity"],
            diagramTypes: ["journey", "activity"],
        },
    },
    {
        id: "incident-response-loop",
        title: "应急指挥闭环",
        description: "指挥链、时间轴与 Runbook 多维一体。",
        caption: "Incident Loop",
        prompt:
            "请创建一个 SRE 战情室样板：上方为 4 阶段时间轴（检测、隔离、缓解、复盘），中间是指挥链泳道（指挥官、技术、业务、对外），下方列出自动化 Runbook 步骤与所用工具，突出升级阈值与沟通节点。",
        tags: ["SRE", "Runbook", "指挥链"],
        previewLabel: "War Room",
        accent: {
            from: "#c084fc",
            to: "#7c3aed",
        },
        brief: {
            intent: "polish",
            tone: "balanced",
            focus: ["flow", "clarity"],
            diagramTypes: ["activity", "state"],
        },
    },
];
