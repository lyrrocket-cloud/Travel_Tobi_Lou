import re

with open('/workspace/src/components/TripPlanner.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 修改导入语句，添加Footprints
content = re.sub(
    r"import \{ Plus, Edit2, Save, Car, Plane, Train, Bus, UtensilsCrossed, Coffee, Sun, Moon, BedDouble, Trash2, ArrowRight, X, Clock, Calendar \} from 'lucide-react';",
    "import { Plus, Edit2, Save, Car, Plane, Train, Bus, UtensilsCrossed, Coffee, Sun, Moon, BedDouble, Trash2, ArrowRight, X, Clock, Calendar, Footprints } from 'lucide-react';",
    content
)

# 修改walk的图标为Footprints
content = re.sub(
    r"walk: <ArrowRight className=\"w-4 h-4\" />,",
    "walk: <Footprints className=\"w-4 h-4\" />,",
    content
)

with open('/workspace/src/components/TripPlanner.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("修改完成！")