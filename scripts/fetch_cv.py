"""
Şu an kullanılmıyor — istatistikler index.html'de sabit olarak tutulmaktadır.
"""
import json, sys
from datetime import datetime

data = {
    "stats": {
        "citations": 645,
        "h_index":   12,
        "i10_index": 16,
        "updated":   datetime.now().strftime("%d.%m.%Y"),
    },
    "publications": [],
    "last_updated": datetime.now().isoformat(),
}

with open("data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("[OK] data.json yazıldı (sabit değerler)")
