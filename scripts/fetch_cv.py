"""
Günlük çalışan veri çekici:
  - Google Scholar (scholarly) → atıf / h-indeks / i10-indeks
  - NKÜ AVES → son yayınlar listesi
Çıktı: data.json (repo kökünde)
"""

import json
import re
import sys
from datetime import datetime

import requests
from bs4 import BeautifulSoup
from scholarly import scholarly

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    )
}
TODAY = datetime.now().strftime("%d.%m.%Y")


# ── 1. Google Scholar → atıf istatistikleri ──────────────────────────────────
def fetch_scholar_stats():
    try:
        author = scholarly.search_author_id('-9oeVawAAAAJ')
        scholarly.fill(author, sections=['basics', 'indices'])
        return {
            "citations": author.get('citedby', 0),
            "h_index":   author.get('hindex', 0),
            "i10_index": author.get('i10index', 0),
            "updated":   TODAY,
        }
    except Exception as e:
        print(f"[Scholar] Hata: {e}", file=sys.stderr)
        return None


# ── 2. NKÜ AVES → yayın listesi ──────────────────────────────────────────────
def fetch_nku_publications():
    url = "https://asaygili.cv.nku.edu.tr/cv/yayinlar/"
    try:
        r = requests.get(url, headers=HEADERS, timeout=30)
        r.raise_for_status()
    except Exception as e:
        print(f"[NKÜ CV] Erişim hatası: {e}", file=sys.stderr)
        return None

    soup = BeautifulSoup(r.text, "html.parser")
    text = soup.get_text(separator="\n")

    publications = []
    seen = set()
    lines = [l.strip() for l in text.splitlines() if l.strip()]

    i = 0
    while i < len(lines):
        line = lines[i]
        # Yıl satırı mı?
        if re.fullmatch(r"20\d{2}|201\d", line):
            year = line
            # Sonraki satırlarda başlık ara
            for j in range(i + 1, min(i + 6, len(lines))):
                candidate = lines[j]
                # Uzun, anlamlı metin; meta etiket değil
                if (len(candidate) > 25
                        and not re.match(r"^(Özgün|Derleme|SCI|TR |Uluslararası|Ulusal|Hakemlik|Makale|Bildiri|Tam|Özet|Copyright)", candidate)
                        and re.search(r"[a-zA-ZğüşıöçĞÜŞİÖÇ]{4,}", candidate)):
                    key = candidate[:30].lower()
                    if key not in seen:
                        seen.add(key)
                        venue = lines[j + 1] if j + 1 < len(lines) else ""
                        pub_type = ""
                        for k in range(j + 1, min(j + 5, len(lines))):
                            if re.search(r"SCI|Scopus|TR DİZİN|Hakemli|ESCI", lines[k]):
                                pub_type = re.search(r"SCI-Expanded|SCI|Scopus|TR DİZİN|ESCI", lines[k])
                                pub_type = pub_type.group() if pub_type else ""
                                break
                        publications.append({
                            "year":  year,
                            "title": candidate,
                            "venue": venue,
                            "type":  pub_type,
                        })
                    break
        i += 1

    print(f"[NKÜ CV] {len(publications)} yayın bulundu.")
    return publications


# ── 3. Kaydet ─────────────────────────────────────────────────────────────────
def main():
    stats = fetch_scholar_stats()
    pubs  = fetch_nku_publications()

    # Mevcut data.json varsa oku (kısmi başarısızlıkta eski veriyi koru)
    try:
        with open("data.json", encoding="utf-8") as f:
            existing = json.load(f)
    except Exception:
        existing = {}

    data = {
        "stats":        stats        or existing.get("stats", {}),
        "publications": pubs         or existing.get("publications", []),
        "last_updated": datetime.now().isoformat(),
    }

    with open("data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[OK] data.json yazıldı — {TODAY}")


if __name__ == "__main__":
    main()
