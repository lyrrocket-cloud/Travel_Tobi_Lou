import re

with open('/workspace/src/components/TripPlanner.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 添加 showTripEditor 状态
content = re.sub(
    r"  const \[showSchedule, setShowSchedule\] = useState\(\(\) => \{",
    """  const [showTripEditor, setShowTripEditor] = useState(true);
  const [showSchedule, setShowSchedule] = useState(() => {""",
    content
)

# 修改按钮点击事件，当展开日程表时折叠编辑器
content = re.sub(
    r"""        <Button
          onClick=\{\(\) => setShowSchedule\(!showSchedule\)\}
          className="w-full bg-\[#CEA472\] text-\[#0a0a0f\] hover:bg-\[#CEA472\]/80"
        >
          <span className="mr-2">📅</span>
          \{showSchedule \? '收起日程表' : '生成日程表'\}
        </Button>""",
    """        <Button
          onClick={() => {
            if (showSchedule) {
              setShowSchedule(false);
              setShowTripEditor(true);
            } else {
              setShowSchedule(true);
              setShowTripEditor(false);
            }
          }}
          className="w-full bg-[#CEA472] text-[#0a0a0f] hover:bg-[#CEA472]/80"
        >
          <span className="mr-2">📅</span>
          {showSchedule ? '编辑日程' : '生成日程表'}
        </Button>""",
    content
)

# 给 Tabs 区域添加条件渲染
content = re.sub(
    r"      <Tabs value=\{String\(selectedDay\)\} onValueChange=\{\(v\) => setSelectedDay\(Number\(v\)\)\} className=\"w-full\">",
    """      {showTripEditor && (
        <Tabs value={String(selectedDay)} onValueChange={(v) => setSelectedDay(Number(v))} className="w-full">""",
    content
)

# 找到 Tabs 的结束位置并添加闭合括号
content = re.sub(
    r"      </Tabs>",
    "</Tabs>\n      )}",
    content
)

with open('/workspace/src/components/TripPlanner.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("修改完成！")