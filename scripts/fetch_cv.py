"""
Google Scholar'dan atıf, h-indeks ve i10-indeks verilerini çeker.
requests + BeautifulSoup ile doğrudan HTML ayrıştırması kullanır.
Bot engellemesi durumunda mevcut data.json değerlerini korur.
"""
import json, re, sys, time
from datetime import datetime
from pathlib import Path

import requests
from bs4 import BeautifulSoup

SCHOLAR_ID = "-9oeVawAAAAJ"
SCHOLAR_URL = f"https://scholar.google.com/citations?user={SCHOLAR_ID}&hl=tr"
DATA_FILE   = Path(__file__).parent.parent / "data.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
}


def load_existing():
    try:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {"stats": {}, "publications": [], "last_updated": ""}


def parse_num(text: str) -> int:
    """'1.234' veya '1,234' formatındaki metni tam sayıya çevirir."""
    return int(re.sub(r"[^\d]", "", text))


def fetch_scholar() -> dict:
    resp = requests.get(SCHOLAR_URL, headers=HEADERS, timeout=20)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")

    # Tablo: td#gsc_rsb_st ile başlayan satırlar
    # Sıra: Atıf | h-indeks | i10-indeks
    cells = soup.select("td.gsc_rsb_std")
    if len(cells) < 6:
        raise ValueError(f"Beklenen tablo bulunamadı (hücre sayısı: {len(cells)})")

    # cells[0]=atıf toplam, cells[1]=son5yıl, cells[2]=h, cells[3]=h5, cells[4]=i10, cells[5]=i10_5
    return {
        "citations":  parse_num(cells[0].get_text()),
        "h_index":    parse_num(cells[2].get_text()),
        "i10_index":  parse_num(cells[4].get_text()),
    }


def main():
    existing = load_existing()
    today    = datetime.now().strftime("%d.%m.%Y")
    stats    = existing.get("stats", {})
    updated  = False

    for attempt in range(3):
        try:
            print(f"[{attempt+1}/3] Google Scholar'dan veri çekiliyor...")
            new_stats = fetch_scholar()
            stats  = {**new_stats, "updated": today}
            updated = True
            print(f"  Atıf: {stats['citations']}  h: {stats['h_index']}  i10: {stats['i10_index']}")
            break
        except Exception as e:
            print(f"  Hata: {e}", file=sys.stderr)
            if attempt < 2:
                time.sleep(12 * (attempt + 1))

    if not updated:
        print("[WARN] Veri çekilemedi, mevcut değerler korunuyor.", file=sys.stderr)
        stats["updated"] = stats.get("updated", today)

    data = {
        **existing,
        "stats": stats,
        "last_updated": datetime.now().isoformat(),
    }

    DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK] data.json güncellendi ({today})")
    sys.exit(0 if updated else 1)


if __name__ == "__main__":
    main()
