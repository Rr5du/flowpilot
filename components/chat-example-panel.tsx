type ExamplePanelProps = {
    setInput: (input: string) => void;
    setFiles: (files: File[]) => void;
};

type Example = {
    name: string;
    action?: () => Promise<void>;
    prompt?: string;
};

export default function ExamplePanel({
    setInput,
    setFiles,
}: ExamplePanelProps) {
    const handleReplicateFlowchart = async () => {
        setInput("请帮我复刻这张流程图。");
        try {
            const response = await fetch("/example.png");
            const blob = await response.blob();
            const file = new File([blob], "example.png", { type: "image/png" });
            setFiles([file]);
        } catch (error) {
            console.error("Error loading example image:", error);
        }
    };

    const handleReplicateArchitecture = async () => {
        setInput("请使用 AWS 设计风格复刻这张架构图。");
        try {
            const response = await fetch("/architecture.png");
            const blob = await response.blob();
            const file = new File([blob], "architecture.png", { type: "image/png" });
            setFiles([file]);
        } catch (error) {
            console.error("Error loading architecture image:", error);
        }
    };

    const categories: {
        title: string;
        badge?: string;
        examples: Example[];
    }[] = [
        {
            title: "业务流程",
            examples: [
                { name: "用户注册流程", prompt: "创建一个用户注册登录的业务流程图" },
                { name: "订单处理流程", prompt: "绘制电商订单处理流程，从下单到发货" },
            ],
        },
        {
            title: "系统架构",
            examples: [
                { name: "AWS 云架构", action: handleReplicateArchitecture },
                { name: "微服务架构", prompt: "画一个微服务架构图，包含网关、服务注册中心、配置中心" },
            ],
        },
        {
            title: "数据图表",
            examples: [
                { name: "ER 关系图", prompt: "绘制电商系统的 ER 图，包含用户、商品、订单实体" },
                { name: "组织架构", prompt: "绘制组织架构图，展示公司层级结构" },
            ],
        },
        {
            title: "SVG 可视化",
            badge: "热门",
            examples: [
                { name: "数据看板", prompt: "为 B2B SaaS 仪表盘生成 SVG 销售看板：包含月度 ARR 折线、区域营收占比环形图" },
                { name: "图标集", prompt: "为采购平台绘制特性图标：供应链、库存、合规、发票；统一风格、蓝灰配色" },
            ],
        },
    ];

    return (
        <div className="w-full px-6 py-8">
            <div className="max-w-3xl mx-auto">
                {/* 标题 */}
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-semibold text-slate-900 mb-2">快速开始</h2>
                    <p className="text-sm text-slate-500">选择场景模板或上传图片开始创作</p>
                </div>

                {/* 分类网格 */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    {categories.map((category, idx) => (
                        <div
                            key={idx}
                            className="group rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all p-4"
                        >
                            {/* 分类标题 */}
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-slate-900">
                                    {category.title}
                                </h3>
                                {category.badge && (
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                                        {category.badge}
                                    </span>
                                )}
                            </div>

                            {/* 示例列表 */}
                            <div className="space-y-2">
                                {category.examples.map((example, exIdx) => (
                                    <button
                                        key={exIdx}
                                        onClick={() => {
                                            if (example.action) {
                                                example.action();
                                            } else if (example.prompt) {
                                                setInput(example.prompt);
                                            }
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                                    >
                                        {example.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* 上传图片按钮 */}
                <div className="flex justify-center">
                    <button
                        onClick={handleReplicateFlowchart}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        上传图片转换为图表
                    </button>
                </div>
            </div>
        </div>
    );
}
