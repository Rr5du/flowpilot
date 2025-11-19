# 超时时间调整说明

## 变更历史

1. **初始值**：30秒
2. **第一次调整**：60秒（用户反馈30秒太短）
3. **最终值**：**5分钟**（300秒）⭐

## 最终设置原因

- **30秒/60秒都太短**：
  - 复杂图表生成可能需要较长时间
  - 某些大模型（如 Claude-3.5）响应较慢
  - 网络波动时容易误触发
  
- **5分钟更合理**：
  - 给予模型充足的响应时间
  - 几乎不会误触发超时提示
  - 仍然能在真正异常时提供保护
  - 用户体验更友好

## 修改内容

### 代码修改

**文件**：`components/chat-message-display-optimized.tsx`

```diff
+ // 智能图表生成超时检测时间（毫秒）- 5分钟
+ const DIAGRAM_GENERATION_TIMEOUT_MS = 300000;

- // 超时检测机制（30秒）
+ // 超时检测机制（5分钟）
  useEffect(() => {
      // ...
      const timer = setTimeout(() => {
          const elapsed = Date.now() - (streamingStartTimeRef.current || 0);
-         if (elapsed >= 30000 && localState === "input-streaming") {
+         if (elapsed >= DIAGRAM_GENERATION_TIMEOUT_MS && localState === "input-streaming") {
-             // 30秒后仍在 streaming 状态，显示超时提示
+             // 5分钟后仍在 streaming 状态，显示超时提示
              setShowTimeoutHint(true);
          }
-     }, 30000);
+     }, DIAGRAM_GENERATION_TIMEOUT_MS);
      // ...
  }, [localState]);
```

### 文档更新

批量更新了以下文档中的超时时间说明：

- ✅ `docs/fix-summary.md`
- ✅ `docs/issues-analysis-and-fixes.md`
- ✅ `docs/quick-reference.md`
- ✅ `FIX_README.md`
- ✅ `CHANGES.md`

## 配置说明

超时时间现在通过常量配置，方便后续调整：

```typescript
// 在文件顶部定义
const DIAGRAM_GENERATION_TIMEOUT_MS = 300000; // 5分钟

// 使用常量
setTimeout(() => {
    // ...
}, DIAGRAM_GENERATION_TIMEOUT_MS);
```

**优点**：
- 集中管理，易于修改
- 代码可读性更好
- 便于后续添加用户自定义配置

## 用户体验改进

### 调整前（30秒）

```
0s ────────────── 30s ────────────── 60s
│                  │                  │
生成中             超时提示❌          可能还在正常生成
                   (误触发)
```

### 调整后（5分钟）

```
0s ────────────── 30s ────────────── 60s ────────────── 90s
│                  │                  │                  │
生成中             正常生成中          超时提示✅          真的超时了
                                     (合理触发)
```

## 建议的超时时间

根据实际使用场景：

| 网络状况 | 模型类型 | 建议超时时间 |
|---------|---------|------------|
| 快速网络 | 轻量模型（GPT-4o-mini） | 30-45秒 |
| 正常网络 | 标准模型（GPT-4o） | **5分钟** ⭐ |
| 慢速网络 | 大型模型（Claude-3.5） | 90-120秒 |

**当前配置：5分钟** - 适用于大多数场景

## 后续优化方向

### 短期
- 监控实际超时触发频率
- 收集用户反馈

### 中期
- 根据网络状况动态调整
- 根据选择的模型自动调整

### 长期
- 添加用户自定义配置
- 提供"永不超时"选项

## 测试建议

### 正常场景
```
测试步骤：
1. 发送复杂图表请求
2. 观察 40-50秒内完成
3. 确认不会触发超时提示
```

### 真实超时场景
```
测试步骤：
1. 使用网络限速工具（Chrome DevTools → Network → Slow 3G）
2. 发送图表请求
3. 等待 5分钟
4. 确认显示超时提示
5. 点击"应用当前图表"按钮
```

## 验证

- ✅ TypeScript 编译通过
- ✅ 无语法错误
- ✅ 所有文档已更新
- ✅ 常量配置正确

---

**修改日期**：2025-11-19  
**修改原因**：用户反馈 30秒太短  
**新超时时间**：5分钟  
**状态**：✅ 已完成
