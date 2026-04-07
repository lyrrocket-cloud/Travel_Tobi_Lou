# Tab 按钮样式规范 (shadcn/ui)

## 完整代码示例

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
  <TabsList className="grid w-full grid-cols-3 lg:w-[500px] lg:mx-auto bg-black/40 backdrop-blur-sm border border-[#CEA472]/20">
    <TabsTrigger 
      value="overview" 
      className="data-[state=active]:text-[#CEA472] data-[state=active]:bg-black/60 text-[#FFFFFF]/60 hover:text-[#FFFFFF]/80 transition-all duration-300"
    >
      概览
    </TabsTrigger>
    <TabsTrigger 
      value="add-driver" 
      className="data-[state=active]:text-[#CEA472] data-[state=active]:bg-black/60 text-[#FFFFFF]/60 hover:text-[#FFFFFF]/80 transition-all duration-300"
    >
      驾驶员
    </TabsTrigger>
    <TabsTrigger 
      value="add-log" 
      className="data-[state=active]:text-[#CEA472] data-[state=active]:bg-black/60 text-[#FFFFFF]/60 hover:text-[#FFFFFF]/80 transition-all duration-300"
    >
      驾驶记录
    </TabsTrigger>
  </TabsList>

  <TabsContent value="overview">
    {/* 内容 */}
  </TabsContent>
  <TabsContent value="add-driver">
    {/* 内容 */}
  </TabsContent>
  <TabsContent value="add-log">
    {/* 内容 */}
  </TabsContent>
</Tabs>
```

## 样式详解

### TabsList 容器样式

| 样式类 | 说明 |
|--------|------|
| `grid` | 使用 CSS Grid 布局 |
| `w-full` | 宽度 100%（移动端自适应） |
| `grid-cols-3` | 3 列网格布局 |
| `lg:w-[500px]` | 大屏幕下固定宽度 500px |
| `lg:mx-auto` | 大屏幕下居中显示 |
| `bg-black/40` | 半透明黑色背景（60% 不透明度） |
| `backdrop-blur-sm` | 毛玻璃模糊效果（8px） |
| `border border-[#CEA472]/20` | 金色边框，20% 透明度 |

### TabsTrigger 按钮样式

| 状态 | 样式类 | 说明 |
|------|--------|------|
| **默认** | `text-[#FFFFFF]/60` | 白色文字，60% 透明度 |
| **选中** | `data-[state=active]:text-[#CEA472]` | 金色文字（#CEA472） |
| **选中** | `data-[state=active]:bg-black/60` | 更深的黑色背景（40% 不透明度） |
| **悬浮** | `hover:text-[#FFFFFF]/80` | 白色文字，80% 透明度 |

### 通用过渡效果

| 样式类 | 说明 |
|--------|------|
| `transition-all duration-300` | 所有属性 300ms 过渡动画 |

## 设计特点

### 1. 暗色主题
- 深色背景 (`bg-black/40`) 配合金色点缀 (`#CEA472`)
- 白色文字提供良好的可读性

### 2. 毛玻璃效果
- `backdrop-blur-sm` 创建半透明模糊背景
- 增加视觉层次感和现代感

### 3. 状态区分
- 通过颜色变化区分激活/非激活状态
- 激活状态：金色文字 + 更深背景
- 非激活状态：半透明白色文字

### 4. 响应式设计
- 移动端：三栏等宽分布
- 大屏幕：居中显示，固定宽度

## 颜色变量参考

```css
/* 本项目使用的颜色变量 */
--color-primary: #CEA472;      /* 金色 - 用于激活状态 */
--color-background: #0a0a0f;    /* 深黑背景 */
--color-text: #FFFFFF;          /* 白色文字 */
```

## 适用场景

- 深色主题的 Web 应用
- 需要毛玻璃效果的现代 UI
- 金色/暗色配色的设计系统
- 移动端适配的响应式布局
