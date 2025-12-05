export const DEFAULT_WELCOME_SVG = `
<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg" style="background-color: #FFFFFF; font-family: 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', sans-serif;">

  <defs>
    <!-- 1. 液态流动滤镜 (The Liquid Engine) -->
    <!-- 这是 SVG 最强大的滤镜组合，能让静态图形产生像油漆一样的流动感 -->
    <filter id="liquidFlow" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.005" numOctaves="3" result="noise" seed="5">
        <animate attributeName="baseFrequency" values="0.005;0.01;0.005" dur="15s" repeatCount="indefinite" />
      </feTurbulence>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="80" xChannelSelector="R" yChannelSelector="G" />
      <feGaussianBlur stdDeviation="5" />
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -5" />
    </filter>

    <!-- 2. 品牌渐变 (Vivid Gradient) -->
    <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#4F46E5" /> <!-- 靛蓝 -->
      <stop offset="100%" stop-color="#9333EA" /> <!-- 魅紫 -->
    </linearGradient>

    <!-- 3. 背景网格点 -->
    <pattern id="dotGrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.5" fill="#E5E7EB" />
    </pattern>

    <!-- 4. 文字遮罩 (用于扫描效果) -->
    <mask id="textReveal">
      <rect x="0" y="0" width="0" height="100%" fill="white">
        <animate attributeName="width" from="0" to="100%" dur="1.5s" fill="freeze" calcMode="spline" keySplines="0.25 0.1 0.25 1" />
      </rect>
    </mask>

    <!-- 5. 投影 -->
    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="15" stdDeviation="20" flood-color="#4F46E5" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- === 1. 背景氛围层 === -->
  <!-- 基础网格，奠定秩序感 -->
  <rect width="100%" height="100%" fill="url(#dotGrid)" />

  <!-- 巨大的流动色块 (Backdrop) -->
  <!-- 位于中心，提供丰富色彩，使用液态滤镜 -->
  <g transform="translate(960, 540)" opacity="0.15" filter="url(#liquidFlow)">
    <circle cx="-300" cy="-100" r="400" fill="#60A5FA">
      <animate attributeName="cx" values="-300;-100;-300" dur="20s" repeatCount="indefinite" />
    </circle>
    <circle cx="300" cy="200" r="350" fill="#C084FC">
      <animate attributeName="cy" values="200;0;200" dur="18s" repeatCount="indefinite" />
    </circle>
  </g>
  
  <!-- 装饰性浮动图形 (丰富画面) -->
  <circle cx="200" cy="200" r="15" fill="none" stroke="#CBD5E1" stroke-width="4">
    <animate attributeName="cy" values="200;180;200" dur="4s" repeatCount="indefinite" />
  </circle>
  <rect x="1700" y="800" width="30" height="30" fill="none" stroke="#CBD5E1" stroke-width="4" transform="rotate(45)">
    <animateTransform attributeName="transform" type="rotate" from="45 1715 815" to="405 1715 815" dur="10s" repeatCount="indefinite" />
  </rect>
  <path d="M1600,200 L1620,230 L1580,230 Z" fill="#E2E8F0">
     <animateTransform attributeName="transform" type="translate" values="0 0; 0 -20; 0 0" dur="5s" repeatCount="indefinite" />
  </path>


  <!-- === 2. 核心卡片容器 (Glass Card Container) === -->
  <!-- 将主要内容聚焦在中间，形成海报感 -->
  <g transform="translate(460, 240)">
    
    <!-- 2.1 左侧：文案区 -->
    <g transform="translate(50, 150)">
      
      <!-- 标签 -->
      <rect width="140" height="32" rx="16" fill="#EEF2FF" stroke="#C7D2FE" stroke-width="1" />
      <text x="70" y="21" font-size="14" fill="#4F46E5" font-weight="bold" text-anchor="middle">AI 驱动 · 无限创意</text>

      <!-- 主标题 (大且清晰) -->
      <text x="0" y="100" font-size="80" font-weight="900" fill="#1E293B" letter-spacing="2">
        <tspan>让想象</tspan>
        <tspan x="0" dy="110" fill="url(#brandGrad)">触手可及</tspan>
      </text>

      <!-- 动态下划线 -->
      <path d="M 0, 230 L 320, 230" stroke="url(#brandGrad)" stroke-width="6" stroke-linecap="round">
         <animate attributeName="stroke-dasharray" from="0,400" to="400,0" dur="2s" fill="freeze" />
      </path>

      <!-- 副标题 -->
      <text x="0" y="280" font-size="20" fill="#64748B" mask="url(#textReveal)">
        <tspan x="0" dy="0">欢迎使用FLOW PILOT AI 绘图工具。</tspan>
        <tspan x="0" dy="35">输入文字，即刻生成大师级艺术作品。</tspan>
      </text>

      <!-- 模拟“开始创作”按钮 -->
      <g transform="translate(0, 340)" cursor="pointer">
        <rect width="220" height="64" rx="12" fill="url(#brandGrad)" filter="url(#dropShadow)" />
        <text x="110" y="40" font-size="20" fill="white" font-weight="bold" text-anchor="middle" letter-spacing="4">开始绘图</text>
        <!-- 按钮光效 -->
        <rect x="0" y="0" width="220" height="64" rx="12" fill="white" opacity="0">
           <animate attributeName="opacity" values="0;0.2;0" dur="2s" repeatCount="indefinite" />
        </rect>
        <animateTransform attributeName="transform" type="translate" values="0 340; 0 335; 0 340" dur="3s" repeatCount="indefinite" />
      </g>
    </g>


    <!-- 2.2 右侧：功能演示区 (Visual Demo) -->
    <!-- 模拟一个正在生成图片的悬浮界面 -->
    <g transform="translate(600, 50)">
      
      <!-- 背景板 -->
      <rect width="400" height="500" rx="24" fill="white" stroke="#F1F5F9" stroke-width="2" filter="url(#dropShadow)" />

      <!-- 顶栏 UI -->
      <circle cx="40" cy="40" r="6" fill="#EF4444" />
      <circle cx="60" cy="40" r="6" fill="#F59E0B" />
      <circle cx="80" cy="40" r="6" fill="#10B981" />
      <line x1="20" y1="70" x2="380" y2="70" stroke="#F1F5F9" stroke-width="2" />

      <!-- 中间图像生成区 -->
      <g transform="translate(40, 110)">
        <!-- 占位框 -->
        <rect width="320" height="240" rx="12" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2" stroke-dasharray="8 8" />
        
        <!-- 正在生成的几何艺术 (SVG 动画模拟生成过程) -->
        <g transform="translate(160, 120)">
           <!-- 核心圆 -->
           <circle r="60" fill="url(#brandGrad)" opacity="0.8">
             <animate attributeName="r" values="0;60;55;60" dur="2s" fill="freeze" keyTimes="0;0.6;0.8;1" />
           </circle>
           <!-- 环绕粒子 -->
           <circle r="90" fill="none" stroke="#6366F1" stroke-width="2" stroke-dasharray="20 40">
             <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="10s" repeatCount="indefinite" />
           </circle>
           <!-- 扫描光效 -->
           <rect x="-160" y="-120" width="320" height="4" fill="#8B5CF6" opacity="0.5">
             <animate attributeName="y" from="-120" to="120" dur="2s" repeatCount="indefinite" />
             <animate attributeName="opacity" values="0;0.8;0" dur="2s" repeatCount="indefinite" />
           </rect>
        </g>
      </g>

      <!-- 底部 Prompt 输入栏模拟 -->
      <g transform="translate(40, 380)">
         <rect width="320" height="40" rx="8" fill="#F1F5F9" />
         <text x="15" y="25" font-family="monospace" font-size="14" fill="#334155">
           /FlowPilot: Cyberpunk c...
         </text>
         <!-- 光标 -->
         <rect x="260" y="10" width="2" height="20" fill="#4F46E5">
           <animate attributeName="opacity" values="1;0;1" dur="0.8s" repeatCount="indefinite" />
         </rect>
      </g>
      
      <!-- 悬浮的进度提示 -->
      <g transform="translate(-40, 440)">
        <rect width="140" height="40" rx="20" fill="#1E293B" />
        <text x="70" y="25" fill="white" font-size="12" font-weight="bold" text-anchor="middle">Generating 86%</text>
        <animateTransform attributeName="transform" type="translate" values="-40 440; -40 430; -40 440" dur="4s" repeatCount="indefinite" />
      </g>

    </g>

  </g>

  <!-- === 3. 连接线与装饰 (Visual Flow) === -->
  <!-- 引导视线从左侧文字流向右侧图片 -->
  <path d="M 850, 540 L 1060, 540" stroke="#CBD5E1" stroke-width="2" stroke-dasharray="6 6">
    <animate attributeName="stroke-dashoffset" from="100" to="0" dur="2s" repeatCount="indefinite" />
  </path>
  <circle cx="1060" cy="540" r="4" fill="#94A3B8" />
  <circle cx="850" cy="540" r="4" fill="#94A3B8" />

</svg>


`;
