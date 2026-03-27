# Tobi Lou UI 设计规范 - 实战总结

## 🎯 核心理念

Tobi Lou 设计风格以**高端黑色主题 + 金色点缀**为核心，通过**毛玻璃效果**营造层次感，适用于现代化、高品质的Web应用。

**设计哲学**：Dark, Gold, Glass, Elegance

---

## 🎨 核心色彩系统

### 主色调（不可变）

| 颜色 | 色值 | 应用场景 |
|------|------|----------|
| **主背景** | `#0a0a0f` | 页面整体背景 |
| **主强调色** | `#CEA472` | 重要按钮、图标衬底、hover状态、标签 |
| **主文字** | `#FFFFFF` | 所有正文、标题、按钮文字 |
| **图标线框色** | `#0a0a0f` | 金色衬底上的图标颜色 |

### 半透明色系（核心）

**背景色 - 半透明黑色**
```css
bg-black/40   /* 卡片背景 - 轻微透明 */
bg-black/60   /* 次要按钮背景 - 中等透明 */
bg-black/80   /* 弹窗背景 - 深色透明 */
```

**文字色 - 半透明白色**
```css
text-[#FFFFFF]        /* 主要文字 - 不透明 */
text-[#FFFFFF]/80     /* 次要文字 - 80%透明度 */
text-[#FFFFFF]/60     /* 描述性文字 - 60%透明度 */
text-[#FFFFFF]/50     /* 弱化文字/占位符 - 50%透明度 */
```

**边框色 - 半透明金色**
```css
border-[#CEA472]/10   /* 卡片/容器边框 - 弱边框 */
border-[#CEA472]/20   /* 金色按钮边框 - 浅边框 */
border-[#CEA472]/30   /* 输入框/组件边框 - 中等边框 */
border-[#CEA472]/50   /* hover边框 - 较强边框 */
border-[#CEA472]/60   /* 按钮边框 - 强边框（重要！） */
```

---

## 📐 页面整体布局

### 页面背景设置

```tsx
<div className="min-h-screen" style={{
  backgroundColor: '#0a0a0f',
  backgroundImage: `linear-gradient(rgba(10, 10, 15, 0.85), rgba(10, 10, 15, 0.85)), url('/europe-mountain.jpg')`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat'
}}>
```

**背景层级说明**：
- **底色**：`#0a0a0f`（纯黑色兜底）
- **背景图片**：`/europe-mountain.jpg`（欧洲山峰图）
- **覆盖层**：`rgba(10, 10, 15, 0.85)` - 85%黑色覆盖，让背景图隐约可见（15%可见度）

**设计目的**：
- 营造高端氛围
- 弱化背景干扰
- 突出前景内容

### 容器布局

```tsx
<div className="container mx-auto px-4 py-8">
  {/* 页面内容 */}
</div>
```

---

## 🏷️ 标题区域设计

### 完整标题结构

```tsx
{/* 标题区域 */}
<div className="text-center mb-8">
  <div className="flex flex-col items-center justify-center gap-4 mb-4">
    {/* 图标容器 - 金色衬底 + 黑色线框 */}
    <div className="w-20 h-20 flex items-center justify-center rounded-2xl" style={{
      backgroundColor: '#CEA472',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)'
    }}>
      <Car className="w-10 h-10" style={{ color: '#0a0a0f' }} />
    </div>
    {/* 主标题 */}
    <h1 className="text-5xl font-bold text-[#FFFFFF] drop-shadow-lg">今天谁开车</h1>
  </div>
  {/* 副标题 */}
  <p className="text-[#FFFFFF] font-normal">系统记录驾驶记录，合理分配驾驶任务</p>
</div>
```

### 图标容器设计规范

**尺寸**：`w-20 h-20` (80px × 80px)

**配色方案**：
- **衬底色**：`#CEA472`（金色）⭐ 品牌
- **图标色**：`#0a0a0f`（黑色线框）
- **对比效果**：金色衬底 + 黑色线框，高对比度

**圆角**：`rounded-2xl` (16px圆角)

**阴影效果**：双层阴影，悬浮感
```css
box-shadow: 
  0 4px 12px rgba(0, 0, 0, 0.3),  /* 主阴影 - 偏移4px，模糊12px */
  0 2px 4px rgba(0, 0, 0, 0.2);   /* 次阴影 - 偏移2px，模糊4px */
```

**图标尺寸**：`w-10 h-10` (40px)

### 主标题设计

- **字号**：`text-5xl` (48px)
- **字重**：`font-bold` (700)
- **颜色**：`text-[#FFFFFF]` (纯白色)
- **阴影**：`drop-shadow-lg` (文字阴影，增加立体感)

### 副标题设计

- **字号**：默认 (16px)
- **字重**：`font-normal` (400)
- **颜色**：`text-[#FFFFFF]` (纯白色)

---

## 🎰 抽签按钮区域

### 按钮组布局

```tsx
<div className="flex justify-center gap-6 mb-8">
  <Button className="bg-black/60 hover:bg-black/40 border border-[#CEA472]/30 text-[#FFFFFF]/80 hover:text-[#CEA472] hover:border-[#CEA472]/50 transition-all duration-500 px-12 py-8 text-xl font-semibold">
    <Shuffle className="h-6 w-6 mr-3 text-[#CEA472]" />
    随机模式
  </Button>
</div>
```

### 装饰性按钮规范

**背景**：`bg-black/60` (半透明黑色)

**边框**：`border border-[#CEA472]/30` (弱金色边框)

**文字**：
- 默认：`text-[#FFFFFF]/80`
- hover：`hover:text-[#CEA472]`

**尺寸**：
- 内边距：`px-12 py-8` (48px左右，32px上下)
- 字号：`text-xl` (20px)
- 图标：`h-6 w-6` (24px)

**图标颜色**：始终金色 `text-[#CEA472]`

---

## 📑 标签页设计

### 标签页列表

```tsx
<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
  <TabsList className="grid w-full grid-cols-3 lg:w-[500px] lg:mx-auto bg-black/40 backdrop-blur-sm border border-[#CEA472]/20">
    <TabsTrigger value="overview" className="
      data-[state=active]:text-[#CEA472] 
      data-[state=active]:bg-black/60 
      text-[#FFFFFF]/60 
      hover:text-[#FFFFFF]/80 
      transition-all duration-300
    ">
      概览
    </TabsTrigger>
  </TabsList>
</Tabs>
```

### TabsList 容器设计

- **布局**：`grid w-full grid-cols-3` (3列网格)
- **响应式**：`lg:w-[500px] lg:mx-auto` (桌面端居中，宽度500px)
- **背景**：`bg-black/40` (半透明黑色)
- **毛玻璃**：`backdrop-blur-sm`
- **边框**：`border border-[#CEA472]/20`

### TabsTrigger 设计

**激活状态** (`data-[state=active]`)：
- 文字：`text-[#CEA472]` (金色)
- 背景：`bg-black/60` (深色背景)

**默认状态**：
- 文字：`text-[#FFFFFF]/60`

**hover状态**：
- 文字：`hover:text-[#FFFFFF]/80`

**过渡动画**：`transition-all duration-300`

---

## 📊 统计卡片设计

### 总体统计卡片网格

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* 统计卡片 */}
</div>
```

**响应式布局**：
- 移动端：1列
- 平板：2列
- 桌面：4列

### 统计卡片样式

```tsx
<Card className="
  border-[#CEA472]/10 
  bg-black/40 
  backdrop-blur-sm 
  hover:border-[#CEA472]/50 
  hover:bg-black/60 
  transition-all duration-500
">
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium text-[#FFFFFF]/60">总里程</CardTitle>
    <Route className="h-4 w-4 text-[#CEA472]" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold text-[#FFFFFF]">{stats.total.totalDistance} 公里</div>
  </CardContent>
</Card>
```

**卡片容器**：
- 边框：`border-[#CEA472]/10`
- 背景：`bg-black/40` + `backdrop-blur-sm`
- hover：边框增强 `hover:border-[#CEA472]/50`，背景加深 `hover:bg-black/60`
- 动画：`transition-all duration-500`

**卡片标题**：
- 字号：`text-sm` (14px)
- 字重：`font-medium` (500)
- 颜色：`text-[#FFFFFF]/60`

**图标**：
- 尺寸：`h-4 w-4` (16px)
- 颜色：`text-[#CEA472]` (金色)

**数据展示**：
- 字号：`text-2xl` (24px)
- 字重：`font-bold` (700)
- 颜色：`text-[#FFFFFF]`

---

## 🔴 关键规则（实战经验总结）

### ⚠️ 规则1：按钮必须有背景色

**问题**：在黑色背景上使用透明背景的按钮会导致按钮不可见。

**错误示例**：
```tsx
// ❌ 错误 - 按钮与背景融合，不可见
<Button variant="outline" className="border-[#CEA472]/30 text-[#FFFFFF]">
  取消
</Button>
```

**正确示例**：
```tsx
// ✅ 正确 - 有明显背景色
<Button variant="outline" className="
  bg-black/60 
  border border-[#CEA472]/60 
  text-[#FFFFFF]
">
  取消
</Button>
```

---

### ⚠️ 规则2：按钮边框必须足够明显

**问题**：边框透明度过低会导致在深色背景上看不清楚。

**修复**：按钮边框透明度应使用 `60`（38%）

```tsx
// ❌ 错误
className="bg-black/60 border-[#CEA472]/30"

// ✅ 正确
className="bg-black/60 border-[#CEA472]/60"
```

---

### ⚠️ 规则3：弹框按钮顺序 - 主要操作在前

**正确示例**：
```tsx
<DialogFooter>
  <Button type="submit">保存</Button>
  <Button variant="outline">取消</Button>
</DialogFooter>
```

**规则**：所有弹框的按钮顺序应为：**[主要操作] [次要操作/取消]**

---

### ⚠️ 规则4：日期选择器必须使用深色主题

```css
input[type="date"] {
  color-scheme: dark;
}
```

---

### ⚠️ 规则5：图标容器配色 - 金色衬底 + 黑色线框

**正确配色**：
```tsx
<div style={{ backgroundColor: '#CEA472' }}>
  <Icon style={{ color: '#0a0a0f' }} />
</div>
```

**规则**：图标容器使用金色衬底时，图标必须是黑色线框。

---

### ⚠️ 规则6：Hover效果必须明显

**标准Hover效果**：
```tsx
className="
  hover:bg-[#CEA472]/10      /* 背景变为金色半透明 */
  hover:text-[#CEA472]        /* 文字变为金色 */
  hover:border-[#CEA472]      /* 边框变为金色 */
  transition-all duration-300 /* 平滑过渡 */
"
```

---

## 📦 标准组件模板

### 主要操作按钮

```tsx
<Button className="
  bg-[#CEA472] 
  hover:bg-[#CEA472]/80 
  text-[#0a0a0f] 
  border border-[#CEA472]/20 
  shadow-lg 
  font-semibold
">
  保存
</Button>
```

### 次要操作按钮

```tsx
<Button variant="outline" className="
  bg-black/60 
  hover:bg-[#CEA472]/10 
  border border-[#CEA472]/60 
  text-[#FFFFFF] 
  hover:text-[#CEA472]
  hover:border-[#CEA472]
">
  取消
</Button>
```

### 危险操作按钮

```tsx
<Button className="
  bg-red-600 
  hover:bg-red-700 
  text-white 
  border border-red-700/20 
  shadow-lg
">
  删除
</Button>
```

---

### 卡片

```tsx
<Card className="
  border-[#CEA472]/10 
  bg-black/40 
  backdrop-blur-sm 
  hover:border-[#CEA472]/50 
  hover:bg-black/60 
  transition-all duration-500
">
  <CardHeader>
    <CardTitle className="text-[#FFFFFF]">标题</CardTitle>
    <CardDescription className="text-[#FFFFFF]/60">描述</CardDescription>
  </CardHeader>
  <CardContent>内容</CardContent>
</Card>
```

---

### 输入框

```tsx
<Input
  placeholder="请输入..."
  className="
    bg-black/40 
    backdrop-blur-sm 
    border-[#CEA472]/30 
    text-[#FFFFFF] 
    placeholder:text-[#FFFFFF]/50 
    focus:border-[#CEA472]/50
    focus:ring-0
  "
/>
```

---

### 文本域

```tsx
<Textarea
  placeholder="添加备注信息..."
  rows={3}
  className="
    bg-black/40 
    backdrop-blur-sm 
    border-[#CEA472]/30 
    text-[#FFFFFF] 
    placeholder:text-[#FFFFFF]/50 
    focus:border-[#CEA472]/50
  "
/>
```

---

### 选择器

```tsx
<Select>
  <SelectTrigger className="
    bg-black/40 
    backdrop-blur-sm 
    border-[#CEA472]/30 
    text-[#FFFFFF] 
    focus:border-[#CEA472]/50
  ">
    <SelectValue placeholder="请选择" />
  </SelectTrigger>
  <SelectContent className="bg-black/60 backdrop-blur-sm border-[#CEA472]/30">
    <SelectItem value="1" className="
      text-[#FFFFFF] 
      hover:bg-black/40 
      data-[highlighted]:text-[#CEA472] 
      data-[state=checked]:text-[#CEA472]
    ">
      选项
    </SelectItem>
  </SelectContent>
</Select>
```

---

### 标签

```tsx
<Badge variant="outline" className="border-[#CEA472]/30 text-[#FFFFFF]/80">
  标签
</Badge>

<Label className="text-[#CEA472]">字段名称</Label>
```

---

## 💬 对话框设计

### 基础对话框

```tsx
<Dialog>
  <DialogContent className="bg-black/80 backdrop-blur-sm border-[#CEA472]/20">
    <DialogHeader>
      <DialogTitle className="text-[#FFFFFF]">标题</DialogTitle>
      <DialogDescription className="text-[#FFFFFF]/60">描述</DialogDescription>
    </DialogHeader>
    
    <form onSubmit={handleSubmit}>
      <div className="space-y-4 py-4">
        {/* 表单内容 */}
      </div>
      
      <DialogFooter>
        <Button type="submit" className="bg-[#CEA472] hover:bg-[#CEA472]/80 text-[#0a0a0f] shadow-lg font-semibold border border-[#CEA472]/20">
          保存
        </Button>
        <Button variant="outline" className="bg-black/60 hover:bg-[#CEA472]/10 border border-[#CEA472]/60 text-[#FFFFFF] hover:text-[#CEA472] hover:border-[#CEA472]">
          取消
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

**DialogContent 容器**：
- 背景：`bg-black/80` (深色半透明)
- 毛玻璃：`backdrop-blur-sm`
- 边框：`border-[#CEA472]/20`

### 确认对话框

```tsx
<AlertDialog>
  <AlertDialogContent className="bg-black/80 backdrop-blur-sm border-[#CEA472]/20">
    <AlertDialogHeader>
      <AlertDialogTitle className="text-[#FFFFFF]">确认删除</AlertDialogTitle>
      <AlertDialogDescription className="text-[#FFFFFF]/60">
        此操作无法撤销。
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white border border-red-700/20 shadow-lg">
        删除
      </AlertDialogAction>
      <AlertDialogCancel className="bg-black/60 hover:bg-[#CEA472]/10 border border-[#CEA472]/60 text-[#FFFFFF] hover:text-[#CEA472] hover:border-[#CEA472]">
        取消
      </AlertDialogCancel>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## 📝 表单设计

### 表单布局

```tsx
<form onSubmit={handleSubmit} className="space-y-4">
  <div className="space-y-2">
    <Label className="text-[#CEA472]">字段名称</Label>
    <Input className="..." />
  </div>
</form>
```

### 双列表单项

```tsx
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label className="text-[#CEA472]">字段1</Label>
    <Input className="..." />
  </div>
  <div className="space-y-2">
    <Label className="text-[#CEA472]">字段2</Label>
    <Input className="..." />
  </div>
</div>
```

---

## 🎨 毛玻璃效果规范

### 基础毛玻璃（卡片）
```tsx
className="backdrop-blur-sm bg-black/40 border-[#CEA472]/10"
```

### 深色毛玻璃（弹窗）
```tsx
className="backdrop-blur-sm bg-black/80 border-[#CEA472]/20"
```

---

## 🎭 交互效果规范

### 动画时长规范

| 动画类型 | 时长 | 示例 |
|---------|------|------|
| **快速** | 150ms | 按钮hover、输入框focus |
| **标准** | 300ms | 卡片hover、Tab切换 |
| **慢速** | 500ms | 页面过渡、复杂动画 |

---

## 📱 响应式规范

### 常用断点

| 断点 | 最小宽度 | 适用场景 |
|-----|---------|---------|
| **默认** | - | 移动端 |
| **md** | 768px | 平板 |
| **lg** | 1024px | 桌面 |
| **xl** | 1280px | 大屏桌面 |

### 响应式示例

```tsx
{/* 网格布局 */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* 内容 */}
</div>

{/* 弹窗宽度 */}
<DialogContent className="max-w-md lg:max-w-2xl">
  {/* 内容 */}
</DialogContent>
```

---

## ⚡ 快速检查清单

- [ ] 背景色是否使用 `#0a0a0f` 或半透明黑色？
- [ ] 强调色是否使用 `#CEA472`？
- [ ] 主要文字是否使用 `#FFFFFF`？
- [ ] 按钮是否有背景色？（**关键**）
- [ ] 按钮边框是否清晰可见？（使用 `border-[#CEA472]/60`）
- [ ] 弹框按钮顺序是否正确？（主要操作在前，取消在后）
- [ ] 所有可交互元素是否有hover效果？
- [ ] 日期选择器是否使用了深色主题？
- [ ] 是否使用了 `backdrop-blur-sm` 增强毛玻璃效果？
- [ ] 过渡动画时长是否合理？（300ms为标准）
- [ ] 图标容器是否使用金色衬底+黑色线框？

---

## 🚫 常见错误及修复

### 错误1：按钮不可见

**修复**：添加 `bg-black/60`

```tsx
// ❌ 错误
<Button variant="outline">取消</Button>

// ✅ 正确
<Button variant="outline" className="bg-black/60 border-[#CEA472]/60 text-[#FFFFFF]">取消</Button>
```

### 错误2：按钮边框太淡

**修复**：使用 `border-[#CEA472]/60`

### 错误3：日期选择器是亮色

**修复**：添加 `color-scheme: dark`

### 错误4：图标容器配色错误

**修复**：金色衬底必须搭配黑色线框

```tsx
// ✅ 正确
<div style={{ backgroundColor: '#CEA472' }}>
  <Icon style={{ color: '#0a0a0f' }} />
</div>
```

---

## 🎯 总结

Tobi Lou UI 设计的核心是：

1. **黑色背景**（#0a0a0f）+ **金色点缀**（#CEA472）
2. **毛玻璃效果**（backdrop-blur-sm + 半透明背景）
3. **清晰的层次**（通过边框透明度和背景透明度）
4. **明显的交互**（hover效果 + 平滑动画）
5. **统一的规范**（严格按照标准模板）
6. **品牌图标**（金色衬底 + 黑色线框）

---

## 📄 版本信息

**版本**: v2.0  
**日期**: 2026-03-12  
**基于**: "今天谁开车"应用实际开发经验  
**维护者**: Vibe Coding Team

**更新记录**：
- v2.0: 新增页面整体布局、标题区域、抽签按钮、统计卡片、表单设计、对话框设计等完整页面格式信息
- v1.0: 初始版本，基础组件规范
