import re

with open('/workspace/src/components/TripPlanner.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 添加MapPin到导入语句
content = re.sub(
    r"import \{ Plus, Edit2, Save, Car, Plane, Train, Bus, UtensilsCrossed, Coffee, Sun, Moon, BedDouble, Trash2, ArrowRight, X, Clock, Calendar, Footprints \} from 'lucide-react';",
    "import { Plus, Edit2, Save, Car, Plane, Train, Bus, UtensilsCrossed, Coffee, Sun, Moon, BedDouble, Trash2, ArrowRight, X, Clock, Calendar, Footprints, MapPin } from 'lucide-react';",
    content
)

# 替换位置图标
content = re.sub(
    r"📍 \{activity.location\}",
    "<MapPin className=\"w-3 h-3 inline mr-1\" /> {activity.location}",
    content
)

with open('/workspace/src/components/TripPlanner.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("修改完成！")