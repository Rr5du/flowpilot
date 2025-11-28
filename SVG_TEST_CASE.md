# SVG解析渲染测试用例

## 测试SVG 1（原始大模型输出）
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><defs><linearGradient xmlns="http://www.w3.org/2000/svg" id="headerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#4A90E2;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#5BA0F2;stop-opacity:1"/>
    </linearGradient>
    <pattern xmlns="http://www.w3.org/2000/svg" id="asyncPattern" patternUnits="userSpaceOnUse" width="8" height="8">
      <rect width="8" height="8" fill="none"/>
      <line x1="0" y1="4" x2="8" y2="4" stroke="#E74C3C" stroke-width="1" stroke-dasharray="2,2"/>
    </pattern></defs><rect id="bJsIpT-6vhB5VYbIkFVT2" x="0" y="0" width="800" height="600" fill="#FAFBFC" />
<rect id="EtUooVyLD_z9E7UmVP3OQ" x="24" y="24" width="752" height="40" rx="8" fill="url(#headerGrad)" />
<text id="RcXOiGOQVOcAIRmyVwoR1" x="400" y="48" font-size="18" font-weight="bold" font-family="Arial, sans-serif" text-anchor="middle" fill="white">三层架构组件图</text>
<rect id="bIlEk0Q990ZCerZCQtcfX" x="48" y="88" width="704" height="120" rx="8" fill="#F8F9FA" stroke="#E9ECEF" stroke-width="1.6" />
<text id="3fU5bgUGzYqg7vmZkL3j1" x="72" y="112" font-size="16" font-weight="bold" font-family="Arial, sans-serif"  fill="#2C3E50">接入层 (Access Layer)</text>
<rect id="D5SpLq5F97LnZc2HoNRNI" x="72" y="128" width="160" height="64" rx="8" fill="#4A90E2" stroke="#357ABD" stroke-width="1.6" />
<text id="bJTyWApzY-lfZP_GV8Ix-" x="152" y="152" font-size="14" font-weight="bold" font-family="Arial, sans-serif" text-anchor="middle" fill="white">API网关</text>
<text id="wOe_gWQPtCXp80UOw_g_f" x="152" y="168" font-size="12"  font-family="Arial, sans-serif" text-anchor="middle" fill="white">Gateway</text>
<rect id="bCyACmq2rAgJprMHW3lxe" x="256" y="128" width="160" height="64" rx="8" fill="#4A90E2" stroke="#357ABD" stroke-width="1.6" />
<text id="QQ_B9m1pWtPR4m3UjHsQK" x="336" y="152" font-size="14" font-weight="bold" font-family="Arial, sans-serif" text-anchor="middle" fill="white">负载均衡</text>
<text id="277O7mDSDACPCirHdmt6I" x="336" y="168" font-size="12"  font-family="Arial, sans-serif" text-anchor="middle" fill="white">Load Balancer</text>
<rect id="ZFJiB8fhwzQBl84Hc4Yt6" x="440" y="128" width="160" height="64" rx="8" fill="#4A90E2" stroke="#357ABD" stroke-width="1.6" />
<text id="ufRjDsNzXLenUEEUX09Xp" x="520" y="152" font-size="14" font-weight="bold" font-family="Arial, sans-serif" text-anchor="middle" fill="white">认证服务</text>
<text id="saFudmjqmysrZ_WP40Tau" x="520" y="168" font-size="12"  font-family="Arial, sans-serif" text-anchor="middle" fill="white">Auth Service</text>
<rect id="_PINH8onDmXbroAzl2YlW" x="48" y="232" width="704" height="184" rx="8" fill="#F8F9FA" stroke="#E9ECEF" stroke-width="1.6" />
<text id="aBYev0B75Z3OEiL0aOLys" x="72" y="256" font-size="16" font-weight="bold" font-family="Arial, sans-serif"  fill="#2C3E50">业务服务层 (Business Service Layer)</text>
<rect id="a61uCW-wVPqc7N6_Wr8BH" x="72" y="272" width="120" height="56" rx="8" fill="#27AE60" stroke="#229954" stroke-width="1.6" />
<text id="Ei3k4-jVxJogbaBtaxIhg" x="132" y="296" font-size="14" font-weight="bold" font-family="Arial, sans-serif" text-anchor="middle" fill="white">订单服务</text>
<text id="7P_SlrWAoVgj0H7NtoQ2v" x="132" y="312" font-size="12"  font-family="Arial, sans-serif" text-anchor="middle" fill="white">Order</text>
<rect id="udpDMwK50y-nZmiKT07Nu" x="216" y="272" width="120" height="56" rx="8" fill="#27AE60" stroke="#229954" stroke-width="1.6" />
<text id="YaXmFR_shBtDwGgLOucuL" x="276" y="296" font-size="14" font-weight="bold" font-family="Arial, sans-serif" text-anchor="middle" fill="white">库存服务</text>
<text id="vdkEO72uY0sj37vxbwwAb" x="276" y="312" font-size="12"  font-family="Arial, sans-serif" text-anchor="middle" fill="white">Inventory</text>
<rect id="Xu7ozpDOfwwpViAtY5YPk" x="360" y="272" width="120" height="56" rx="8" fill="#27AE60" stroke="#229954" stroke-width="1.6" />
<text id="Y-iPxnjAWFoQCZiggGmJF" x="420" y="296" font-size="14" font-weight="bold" font-family="Arial, sans-serif" text-anchor="middle" fill="white">计费服务</text>
<text id="V1liSYe4pkM8QONeEdnxm" x="420" y="312" font-size="12"  font-family="Arial, sans-serif" text-anchor="middle" fill="white">Billing</text>
<rect id="iNBG5lXU0VtsMFxVV-UTX" x="504" y="272" width="120" height="56" rx="8" fill="#27AE60" stroke="#229954" stroke-width="1.6" />
<text id="GYQ_7UqZV5AfAkgVBwsVN" x="564" y="296" font-size="14" font-weight="bold" font-family="Arial, sans-serif" text-anchor="middle" fill="white">通知服务</text>
<text id="4Xm7x83r7j6ey-9Ownjx1" x="564" y="312" font-size="12"  font-family="Arial, sans-serif" text-anchor="middle" fill="white">Notification</text>
<rect id="MKr1KMs8YnMKGE6btamSm" x="216" y="352" width="264" height="48" rx="8" fill="#F39C12" stroke="#E67E22" stroke-width="1.6" />
<text id="UvEcgCzaQ9TI7BcpDf5bu" x="348" y="372" font-size="14" font-weight="bold" font-family="Arial, sans-serif" text-anchor="middle" fill="white">消息队列 (Message Queue)</text>
<text id="gkhRbLcWXLWVcKLE0M-xa" x="348" y="388" font-size="12"  font-family="Arial, sans-serif" text-anchor="middle" fill="white">RabbitMQ / Kafka</text>
<rect id="sPC5jzevPM5SZoh7MEmRI" x="48" y="440" width="704" height="136" rx="8" fill="#F8F9FA" stroke="#E9ECEF" stroke-width="1.6" />
<text id="_paoV7KvX1mx-jxq9oQOA" x="72" y="464" font-size="16" font-weight="bold" font-family="Arial, sans-serif"  fill="#2C3E50"></text></svg>
```

## 预期结果

解析后应该得到：
- 47个元素（计数所有rect和text）
- 2个defs定义（linearGradient和pattern）
- 所有元素都应该可见
- gradient应该正确应用到header
- 最后一个text虽然内容为空，但应该被解析

## 常见问题

1. **元素缺失**：检查是否被walker重复添加导致ID冲突
2. **gradient不显示**：检查defs是否在正确位置渲染
3. **transform不正确**：检查继承的transform是否正确合并
