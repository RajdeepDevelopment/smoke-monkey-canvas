#!/usr/bin/env python3
"""Build the Babur Biyer Expense shopping workbook."""

import re
import time
from collections import Counter, OrderedDict
from concurrent.futures import ThreadPoolExecutor
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from openpyxl import Workbook
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

from shopping_data_ab import ITEMS_AB
from shopping_data_c import ITEMS_C

ITEMS = ITEMS_AB + ITEMS_C
OUT = "Babur_Biyer_Expense_Shopping_List.xlsx"

# ---------- palette ----------
INK = "14141F"
INK_2 = "2A2A3C"
GOLD = "C8A24A"
CREAM = "FBF7EE"
SAND = "F1E7D3"
ROSE = "F6E3E3"
GREEN_BG = "E3F2E6"
AMBER_BG = "FDF0D5"
RED_BG = "FBE0E0"
WHITE = "FFFFFF"

HDR_FONT = Font(name="Calibri", size=10, bold=True, color=WHITE)
BODY_FONT = Font(name="Calibri", size=10, color="222222")
SMALL_FONT = Font(name="Calibri", size=9, color="444444")
MONO = Font(name="Consolas", size=9, color="222222")
THIN = Side(style="thin", color="D9D2C5")
GRID = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)


def flatten():
    rows = []
    for item in ITEMS:
        for v in item["variants"]:
            variant, product, price, verified, link, store, country, ptype, spec, color, tier, notes, pick = v
            rows.append(dict(
                sec=item["sec"], item=item["item"], qty=item["qty"], target=item["target"],
                covers=item["covers"], variant=variant, product=product, price=price,
                verified=verified, link=link, store=store, country=country, type=ptype,
                spec=spec, color=color, tier=tier, notes=notes, pick=pick,
            ))
    return rows


ROWS = flatten()
URLS = sorted({r["link"] for r in ROWS if r["link"]})


def practical_min(item):
    """Cheapest variant that is actually a usable solution, not a single component."""
    variants = item["variants"]
    if item["target"]:
        floor = item["target"] * 0.4
        candidates = [v for v in variants if v[2] >= floor] or variants
        best = min(candidates, key=lambda v: v[2])
    else:
        best = min(variants, key=lambda v: v[2])
    picks = [v for v in variants if v[12]]
    if picks and picks[0][2] < best[2]:
        best = picks[0]
    return best
LINK_STATUS = {}


HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IN,en-GB;q=0.9,en;q=0.8",
}


def check(url):
    """Return an HTTP code, or the string BLOCKED / ERR.

    Marketplace sites answer 403/429/503 to non-browser traffic and 404 to
    geo-blocked product pages, so those are retried before being reported.
    """
    last = "ERR"
    for attempt in range(3):
        try:
            with urlopen(Request(url, headers=HEADERS), timeout=15) as resp:
                return resp.status
        except HTTPError as e:
            last = e.code
            if e.code in (403, 429, 500, 503) or (e.code == 404 and attempt < 2):
                time.sleep(1.5 * (attempt + 1))
                continue
            return e.code
        except Exception:
            last = "ERR"
            time.sleep(1.2)
    return last


def classify(status):
    s = str(status)
    if s.startswith("2") or s == "200":
        return "OK"
    if s == "404":
        return "404"
    if s in ("403", "429", "500", "503"):
        return "BLOCKED"
    if s.startswith("3"):
        return "OK"
    return "CHECK"


print(f"Checking {len(URLS)} links ...")
with ThreadPoolExecutor(max_workers=20) as ex:
    for url, status in zip(URLS, ex.map(check, URLS)):
        LINK_STATUS[url] = status
ok = sum(1 for v in LINK_STATUS.values() if str(v).startswith("2"))
print(f"  reachable: {ok}/{len(URLS)}")

wb = Workbook()

# ============================================================ README
ws = wb.active
ws.title = "READ ME"
ws.sheet_view.showGridLines = False
widths = {"A": 3, "B": 34, "C": 100}
for col, w in widths.items():
    ws.column_dimensions[col].width = w

ws.merge_cells("B2:C2")
ws["B2"] = "BABUR BIYER EXPENSES  —  SHOPPING RESEARCH WORKBOOK"
ws["B2"].font = Font(name="Calibri", size=20, bold=True, color=INK)
ws["B2"].alignment = Alignment(vertical="center")
ws.row_dimensions[2].height = 34

ws.merge_cells("B3:C3")
ws["B3"] = "Every line item from your list researched online · 5 purchase options each · lowest → mid budget"
ws["B3"].font = Font(name="Calibri", size=11, italic=True, color=INK_2)
ws.row_dimensions[3].height = 20

ws.merge_cells("B4:C4")
ws["B4"] = f"{len(ITEMS)} line items   ·   {len(ROWS)} product options   ·   price checked {len(URLS)} links"
ws["B4"].font = Font(name="Calibri", size=10, bold=True, color=GOLD)

blocks = [
    ("HOW TO USE THIS FILE", [
        ("1.  Shopping List", f"All {len(ROWS)} options in one filterable table. Filter Item = what you need, then buy the row marked YES."),
        ("2.  Shopping Checklist", "One row per line item with the recommended buy + link. Print this and take it to the market."),
        ("3.  Budget vs Target", "Your budget next to the cheapest and recommended option. Green = under budget, red = over."),
        ("4.  Section Summary", "Rolls up to the exact totals from your list, plus what it costs if you buy the recommended picks."),
        ("5.  Vendor Directory", "Who sells what, how many options, and which country they ship from."),
        ("6.  Link Check", "Live HTTP result for every URL so you know which links are actually reachable."),
    ]),
    ("THE 'DELIVERY' REALITY — READ BEFORE YOU PAY", [
        ("Bangladesh sellers ship to you", "Daraz, Shareez, BaazPakhi, Neel Churi, Lungi Mart, Bunon Fashion, Swadeshi Uddakta, Bata BD, Chaldal, BirthdayFancy, Humayra, Gari Vara — normal BD delivery (Dhaka 1-3 days, outside 2-5 days)."),
        ("Amazon.in / Flipkart / Myntra / Ajio do NOT ship to Bangladesh", "These are India-only. To buy them you need a package forwarder (ShoppRe, MyUS, eZee, or a travelling relative). Budget +18-30% for forwarding + international shipping + possible duty, and 2-4 weeks lead time."),
        ("IndiaMART / Justdial vendors are quote-based", "They rarely publish a checkout price and usually serve their own city. Treat those prices as benchmarks, then negotiate with a local Dhaka vendor."),
        ("Wedding services are offline-first", "Pandal, decorator, dhaki, fatka, venue, caterer, cameraman: the links are rate cards / directories. Call 3 vendors, get written quotes, pay 30% advance."),
    ]),
    ("PRICE & CURRENCY NOTES", [
        ("Currency", "All prices shown in BDT (৳). Indian listings were converted at ₹1 ≈ ৳1.31. Re-check the rate on the day you buy — a 5% FX move changes the totals."),
        ("'Price Verified' column", "Page = the price was read off the live product page. Snippet = taken from the search listing. Estimate = market rate for a service/bundle, not a single product. Always re-check before paying."),
        ("Coupons", "Daraz campaign days and Flipkart/Amazon bank offers routinely cut 10-25%. Wait for a campaign if you can."),
        ("Sizes", "Sarees are usually 12 hand (≈5.5 m). Blouse pieces are unstitched unless stated. Shoes and innerwear need your own size chart."),
    ]),
    ("BUDGET RECONCILIATION — TWO THINGS TO CONFIRM", [
        ("Chandrimar line items add to ৳29,100, not ৳27,600", "There is a ৳1,500 gap somewhere in the bride's list. The file keeps every item as-written; tell me which item should drop by ৳1,500 (my guess: the ৳1,500 Nitkone hair set, or a quantity) and I'll correct the target."),
        ("Babur", "৳31,420 as written — matches exactly."),
        ("Your wedding + food total", "৳342,500 (logistics/decor) + ৳25,000 (external food) = ৳367,500. The 13 Section C targets in this file add to ৳308,500 — the remaining ৳34,000 was unallocated in your list."),
        ("Grand total", "Bride + Groom ৳60,000 (as you rounded) + Wedding/Food ৳367,500 = ৳427,500. This file treats them as two separate pots, exactly as you wrote them. If the ৳60,000 was meant to sit inside the ৳367,500, tell me and I'll re-cut the summary."),
    ]),
]

r = 6
for title, lines in blocks:
    ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=3)
    c = ws.cell(row=r, column=2, value=title)
    c.font = Font(name="Calibri", size=11, bold=True, color=WHITE)
    c.fill = PatternFill("solid", fgColor=INK_2)
    c.alignment = Alignment(vertical="center", indent=1)
    ws.row_dimensions[r].height = 24
    r += 1
    for head, body in lines:
        a = ws.cell(row=r, column=2, value=head)
        a.font = Font(name="Calibri", size=10, bold=True, color=INK)
        a.alignment = Alignment(vertical="top", wrap_text=True)
        b = ws.cell(row=r, column=3, value=body)
        b.font = BODY_FONT
        b.alignment = Alignment(vertical="top", wrap_text=True)
        ws.row_dimensions[r].height = max(30, 15 * (len(body) // 95 + 1))
        r += 1
    r += 1

# ============================================================ SHOPPING LIST
ws = wb.create_sheet("Shopping List")
HEADERS = [
    ("#", 5), ("Section", 26), ("Item (Your List)", 30), ("Variant", 24),
    ("Product / Service", 54), ("Unit Price\n(BDT)", 12), ("Qty", 6),
    ("Covers\n(Your Qty)", 20), ("Line Total\n(BDT)", 13), ("Target\nBudget (BDT)", 13),
    ("Variance\n(BDT)", 12), ("Variance\n%", 9), ("Link", 10), ("Store / Vendor", 22),
    ("Country", 12), ("Type", 14), ("Spec / Fabric / Contents", 42), ("Colour", 18),
    ("Quality\nTier", 11), ("Price\nVerified", 10), ("Link\nCheck", 11), ("Notes", 60),
    ("Buy\nThis?", 6),
]
for i, (h, w) in enumerate(HEADERS, 1):
    c = ws.cell(row=1, column=i, value=h)
    c.font = HDR_FONT
    c.fill = PatternFill("solid", fgColor=INK)
    c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    c.border = GRID
    ws.column_dimensions[get_column_letter(i)].width = w
ws.row_dimensions[1].height = 34
ws.freeze_panes = "C2"

sec_fill = {
    "Chandrimar Barir Tato": "FDF6EC",
    "Babur Tato": "EDF4FB",
    "Wedding Logistics & Decoration": "F1F7EE",
}

for n, r in enumerate(ROWS, start=2):
    line_total = r["price"] * r["qty"]
    vals = [
        n - 1, r["sec"], r["item"], r["variant"], r["product"], r["price"], r["qty"],
        r["covers"], None, r["target"] or None, None, None,
        "Open", r["store"], r["country"], r["type"], r["spec"], r["color"],
        r["tier"], r["verified"], classify(LINK_STATUS.get(r["link"], "-")), r["notes"],
        "YES" if r["pick"] else "",
    ]
    for i, v in enumerate(vals, 1):
        c = ws.cell(row=n, column=i, value=v)
        c.font = BODY_FONT
        c.border = GRID
        c.alignment = Alignment(vertical="top", wrap_text=(i in (2, 3, 4, 5, 8, 17, 18, 22)))
    # formulas
    ws.cell(row=n, column=9, value=f"=F{n}*G{n}")
    ws.cell(row=n, column=11, value=f"=IF(J{n}=\"\",\"\",I{n}-J{n})")
    ws.cell(row=n, column=12, value=f"=IF(J{n}=\"\",\"\",(I{n}-J{n})/J{n})")
    for col in (6, 9, 10, 11):
        ws.cell(row=n, column=col).number_format = '#,##0'
        ws.cell(row=n, column=col).alignment = Alignment(horizontal="right", vertical="top")
    ws.cell(row=n, column=12).number_format = '+0%;-0%;0%'
    ws.cell(row=n, column=12).alignment = Alignment(horizontal="center", vertical="top")
    ws.cell(row=n, column=7).alignment = Alignment(horizontal="center", vertical="top")
    ws.cell(row=n, column=19).alignment = Alignment(horizontal="center", vertical="top")
    ws.cell(row=n, column=20).alignment = Alignment(horizontal="center", vertical="top")
    ws.cell(row=n, column=21).alignment = Alignment(horizontal="center", vertical="top")
    ws.cell(row=n, column=23).alignment = Alignment(horizontal="center", vertical="top")

    # hyperlink
    link_cell = ws.cell(row=n, column=13)
    link_cell.hyperlink = r["link"]
    link_cell.value = "Open"
    link_cell.font = Font(name="Calibri", size=10, color="0B6E99", underline="single")
    link_cell.alignment = Alignment(horizontal="center", vertical="top")

    # section tint
    tint = sec_fill.get(r["sec"], WHITE)
    for i in range(1, 24):
        if i not in (13,):
            ws.cell(row=n, column=i).fill = PatternFill("solid", fgColor=tint)

    if r["pick"]:
        for i in range(1, 24):
            ws.cell(row=n, column=i).font = Font(name="Calibri", size=10, bold=True, color=INK)

last = len(ROWS) + 1
ws.auto_filter.ref = f"A1:W{last}"

# conditional formatting on variance %
rng = f"L2:L{last}"
ws.conditional_formatting.add(rng, FormulaRule(formula=[f'AND(ISNUMBER(L2),L2>0.25)'],
                                               fill=PatternFill("solid", bgColor=RED_BG)))
ws.conditional_formatting.add(rng, FormulaRule(formula=[f'AND(ISNUMBER(L2),L2<=0.25,L2>0.05)'],
                                               fill=PatternFill("solid", bgColor=AMBER_BG)))
ws.conditional_formatting.add(rng, FormulaRule(formula=[f'AND(ISNUMBER(L2),L2<=0.05)'],
                                               fill=PatternFill("solid", bgColor=GREEN_BG)))
ws.conditional_formatting.add(f"U2:U{last}", FormulaRule(
    formula=['U2="OK"'], fill=PatternFill("solid", bgColor=GREEN_BG),
    font=Font(bold=True, color="1B6B2F")))
ws.conditional_formatting.add(f"U2:U{last}", FormulaRule(
    formula=['AND(U2<>"OK",U2<>"")'], fill=PatternFill("solid", bgColor=AMBER_BG),
    font=Font(bold=True, color="8A5A00")))

# price data bars
from openpyxl.formatting.rule import DataBarRule
ws.conditional_formatting.add(f"F2:F{last}", DataBarRule(start_type="num", start_value=0,
                                                         end_type="num", end_value=12000,
                                                         color=GOLD))

# ============================================================ CHECKLIST
ws = wb.create_sheet("Shopping Checklist")
hdr = [("#", 5), ("Section", 26), ("Item", 30), ("Buy Qty", 9), ("Covers", 22),
       ("Recommended Product", 52), ("Price (BDT)", 12), ("Line Total", 12),
       ("Store", 20), ("Country", 12), ("Link", 10), ("Why this one", 60)]
for i, (h, w) in enumerate(hdr, 1):
    c = ws.cell(row=1, column=i, value=h)
    c.font = HDR_FONT
    c.fill = PatternFill("solid", fgColor=INK)
    c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    c.border = GRID
    ws.column_dimensions[get_column_letter(i)].width = w
ws.row_dimensions[1].height = 30
ws.freeze_panes = "A2"

n = 2
for item in ITEMS:
    picks = [v for v in item["variants"] if v[12]]
    if not picks:
        picks = sorted(item["variants"], key=lambda v: v[2])[:1]
    v = picks[0]
    variant, product, price, verified, link, store, country, ptype, spec, color, tier, notes, _ = v
    vals = [n - 1, item["sec"], item["item"], item["qty"], item["covers"], product, price,
            None, store, country, "Open", notes]
    for i, val in enumerate(vals, 1):
        c = ws.cell(row=n, column=i, value=val)
        c.font = BODY_FONT
        c.border = GRID
        c.alignment = Alignment(vertical="top", wrap_text=(i in (3, 5, 6, 12)))
    ws.cell(row=n, column=8, value=f"=G{n}*D{n}").number_format = '#,##0'
    ws.cell(row=n, column=7).number_format = '#,##0'
    lc = ws.cell(row=n, column=11)
    lc.hyperlink = link
    lc.value = "Open"
    lc.font = Font(name="Calibri", size=10, color="0B6E99", underline="single")
    n += 1

total_row = n
ws.cell(row=total_row, column=6, value="TOTAL (all sections)").font = Font(bold=True, size=10)
ws.cell(row=total_row, column=6).alignment = Alignment(horizontal="right")
ws.cell(row=total_row, column=8, value=f"=SUM(H2:H{total_row-1})").font = Font(bold=True, size=11, color=INK)
ws.cell(row=total_row, column=8).number_format = '#,##0'
for i in range(1, 13):
    ws.cell(row=total_row, column=i).fill = PatternFill("solid", fgColor=SAND)
    ws.cell(row=total_row, column=i).border = GRID

# ============================================================ BUDGET VS TARGET
ws = wb.create_sheet("Budget vs Target")
hdr = [("Section", 26), ("Item", 32), ("Qty", 7), ("Target\n(BDT)", 12),
       ("Cheapest\nProduct", 46), ("Cheapest\nUnit", 12), ("Cheapest\nTotal", 13),
       ("Recommended\nProduct", 46), ("Rec.\nTotal", 13), ("Saving vs\nTarget", 13),
       ("Status", 14), ("Note", 48)]
for i, (h, w) in enumerate(hdr, 1):
    c = ws.cell(row=1, column=i, value=h)
    c.font = HDR_FONT
    c.fill = PatternFill("solid", fgColor=INK)
    c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    c.border = GRID
    ws.column_dimensions[get_column_letter(i)].width = w
ws.row_dimensions[1].height = 32
ws.freeze_panes = "C2"

n = 2
for item in ITEMS:
    variants = item["variants"]
    cheap = practical_min(item)
    picks = [v for v in variants if v[12]] or [cheap]
    rec = picks[0]
    cheap_total = cheap[2] * item["qty"]
    rec_total = rec[2] * item["qty"]
    tgt = item["target"]
    saving = (tgt - rec_total) if tgt else ""
    if tgt:
        status = "UNDER" if rec_total <= tgt else "OVER"
    else:
        status = "NO TARGET"
    vals = [item["sec"], item["item"], item["qty"], tgt or "", cheap[1], cheap[2],
            cheap_total, rec[1], rec_total, saving, status, ""]
    for i, val in enumerate(vals, 1):
        c = ws.cell(row=n, column=i, value=val)
        c.font = BODY_FONT
        c.border = GRID
        c.alignment = Alignment(vertical="top", wrap_text=(i in (1, 2, 5, 8)))
    for col in (4, 6, 7, 9, 10):
        ws.cell(row=n, column=col).number_format = '#,##0'
        ws.cell(row=n, column=col).alignment = Alignment(horizontal="right", vertical="top")
    ws.cell(row=n, column=3).alignment = Alignment(horizontal="center", vertical="top")
    ws.cell(row=n, column=11).alignment = Alignment(horizontal="center", vertical="top")
    n += 1

tr = n
ws.cell(row=tr, column=2, value="TOTAL").font = Font(bold=True, size=11)
ws.cell(row=tr, column=4, value=f"=SUM(D2:D{tr-1})").number_format = '#,##0'
ws.cell(row=tr, column=7, value=f"=SUM(G2:G{tr-1})").number_format = '#,##0'
ws.cell(row=tr, column=9, value=f"=SUM(I2:I{tr-1})").number_format = '#,##0'
ws.cell(row=tr, column=10, value=f"=IF(D{tr}=0,\"\",D{tr}-I{tr})").number_format = '#,##0'
for i in range(1, 13):
    ws.cell(row=tr, column=i).font = Font(bold=True, size=11, color=INK)
    ws.cell(row=tr, column=i).fill = PatternFill("solid", fgColor=SAND)
    ws.cell(row=tr, column=i).border = GRID

# ============================================================ SECTION SUMMARY
ws = wb.create_sheet("Section Summary")
ws.sheet_view.showGridLines = False
for col, w in {"A": 3, "B": 44, "C": 20, "D": 18, "E": 18, "F": 20}.items():
    ws.column_dimensions[col].width = w

ws.merge_cells("B2:F2")
ws["B2"] = "SECTION SUMMARY"
ws["B2"].font = Font(name="Calibri", size=16, bold=True, color=INK)
ws.row_dimensions[2].height = 28

rows = [("Section", "Line Items", "Your Budget", "Lowest Practical", "Recommended", "Delta (Rec. − Budget)")]
sections = OrderedDict()
for item in ITEMS:
    sections.setdefault(item["sec"], []).append(item)

r = 4
for i, h in enumerate(rows[0], 2):
    c = ws.cell(row=r, column=i, value=h)
    c.font = HDR_FONT
    c.fill = PatternFill("solid", fgColor=INK)
    c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    c.border = GRID
r += 1

grand = [0, 0, 0]
for sec, items in sections.items():
    budget = sum(i["target"] for i in items)
    cheap = sum(practical_min(i)[2] * i["qty"] for i in items)
    rec = sum(([v for v in i["variants"] if v[12]] or [min(i["variants"], key=lambda v: v[2])])[0][2] * i["qty"]
              for i in items)
    grand[0] += budget
    grand[1] += cheap
    grand[2] += rec
    vals = [sec, len(items), budget, cheap, rec, rec - budget]
    for i, val in enumerate(vals, 2):
        c = ws.cell(row=r, column=i, value=val)
        c.font = BODY_FONT
        c.border = GRID
        if i >= 4:
            c.number_format = '#,##0'
            c.alignment = Alignment(horizontal="right")
        if i == 3:
            c.alignment = Alignment(horizontal="center")
    r += 1

vals = ["GRAND TOTAL", len(ITEMS), grand[0], grand[1], grand[2], grand[2] - grand[0]]
for i, val in enumerate(vals, 2):
    c = ws.cell(row=r, column=i, value=val)
    c.font = Font(name="Calibri", size=11, bold=True, color=INK)
    c.fill = PatternFill("solid", fgColor=SAND)
    c.border = GRID
    if i >= 4:
        c.number_format = '#,##0'
        c.alignment = Alignment(horizontal="right")

r += 3
notes = [
    ("Your original figures", ""),
    ("Chandrimar Barir Tato — as you stated", "৳27,600"),
    ("Chandrimar — sum of line items here", "৳29,100"),
    ("Babur Tato", "৳31,420"),
    ("Bride + Groom (you rounded to ৳60,000)", "৳59,020"),
    ("Wedding + decoration + food", "৳367,500"),
    ("Grand total (if both pots are separate)", "৳427,500"),
    ("Section C unallocated (342,500 − 308,500)", "৳34,000"),
]
for k, v in notes:
    a = ws.cell(row=r, column=2, value=k)
    a.font = Font(size=10, bold=(v == ""), color=INK)
    a.alignment = Alignment(wrap_text=True, vertical="top")
    b = ws.cell(row=r, column=3, value=v)
    b.font = Font(size=10, bold=(v != ""), color=INK)
    b.alignment = Alignment(horizontal="right")
    r += 1

# ============================================================ VENDOR DIRECTORY
ws = wb.create_sheet("Vendor Directory")
hdr = [("Vendor / Store", 32), ("Country", 14), ("Options Listed", 14), ("Categories", 52),
       ("Ordering", 40), ("Homepage", 14)]
for i, (h, w) in enumerate(hdr, 1):
    c = ws.cell(row=1, column=i, value=h)
    c.font = HDR_FONT
    c.fill = PatternFill("solid", fgColor=INK)
    c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    c.border = GRID
    ws.column_dimensions[get_column_letter(i)].width = w
ws.freeze_panes = "A2"

info = {
    "Daraz": ("Bangladesh", "Online checkout, bKash/COD, 1-3 days Dhaka"),
    "Shareez": ("Bangladesh", "Online checkout, own delivery"),
    "Baaz Pakhi": ("Bangladesh", "Online / WhatsApp 01748305979"),
    "Neel Churi": ("Bangladesh", "Online checkout, BD delivery"),
    "Lungi Mart": ("Bangladesh", "Online checkout, BD delivery"),
    "Bunon Fashion": ("Bangladesh", "Online checkout, BD delivery"),
    "Swadeshi Uddakta": ("Bangladesh", "Online checkout, BD delivery"),
    "Bata BD": ("Bangladesh", "Online + retail stores"),
    "BirthdayFancy": ("Bangladesh", "Online booking, hotline 01874577883, Wari Dhaka"),
    "Humayra": ("Bangladesh", "Online booking, Rampura Dhaka"),
    "Amazon.in": ("India", "India-only; needs forwarder to reach BD"),
    "Flipkart": ("India", "India-only; needs forwarder to reach BD"),
    "IndiaMART": ("India", "B2B quote-based"),
    "Justdial": ("India", "Directory / quote-based"),
}
counts = Counter()
cats = {}
for r in ROWS:
    key = r["store"].split(" + ")[0]
    counts[key] += 1
    cats.setdefault(key, set()).add(r["type"])

n = 2
for vendor, cnt in counts.most_common():
    country, ordering = info.get(vendor, ("Mixed", "Check vendor site"))
    vals = [vendor, country, cnt, ", ".join(sorted(cats.get(vendor, []))), ordering, ""]
    ws.cell(row=n, column=1, value=vendor).font = Font(bold=True, size=10, color=INK)
    ws.cell(row=n, column=2, value=country).font = BODY_FONT
    ws.cell(row=n, column=3, value=cnt).font = BODY_FONT
    ws.cell(row=n, column=4, value=vals[3]).font = SMALL_FONT
    ws.cell(row=n, column=5, value=ordering).font = SMALL_FONT
    ws.cell(row=n, column=3).alignment = Alignment(horizontal="center")
    ws.cell(row=n, column=4).alignment = Alignment(wrap_text=True, vertical="top")
    ws.cell(row=n, column=5).alignment = Alignment(wrap_text=True, vertical="top")
    for i in range(1, 7):
        ws.cell(row=n, column=i).border = GRID
    n += 1

# ============================================================ LINK CHECK
ws = wb.create_sheet("Link Check")
hdr = [("#", 5), ("Status", 14), ("HTTP", 12), ("Link", 110), ("Used By", 50)]
for i, (h, w) in enumerate(hdr, 1):
    c = ws.cell(row=1, column=i, value=h)
    c.font = HDR_FONT
    c.fill = PatternFill("solid", fgColor=INK)
    c.alignment = Alignment(horizontal="center", vertical="center")
    c.border = GRID
    ws.column_dimensions[get_column_letter(i)].width = w
ws.freeze_panes = "A2"

by_url = {}
for r in ROWS:
    by_url.setdefault(r["link"], set()).add(r["item"])

n = 2
reach = 0
for url in URLS:
    st = str(LINK_STATUS.get(url, "-"))
    label = classify(st)
    okk = label == "OK"
    reach += 1 if okk else 0
    vals = [n - 1, label, st, url, "; ".join(sorted(by_url[url])[:3])]
    for i, v in enumerate(vals, 1):
        c = ws.cell(row=n, column=i, value=v)
        c.font = MONO if i == 4 else BODY_FONT
        c.border = GRID
    c = ws.cell(row=n, column=4)
    c.hyperlink = url
    c.font = Font(name="Consolas", size=8, color="0B6E99", underline="single")
    color = GREEN_BG if okk else AMBER_BG
    for i in range(1, 6):
        ws.cell(row=n, column=i).fill = PatternFill("solid", fgColor=color)
    n += 1

ws.conditional_formatting.add(f"B2:B{n-1}", FormulaRule(
    formula=['B2="OK"'], fill=PatternFill("solid", bgColor=GREEN_BG),
    font=Font(bold=True, color="1B6B2F")))
ws.conditional_formatting.add(f"B2:B{n-1}", FormulaRule(
    formula=['B2<>"OK"'], fill=PatternFill("solid", bgColor=AMBER_BG),
    font=Font(bold=True, color="8A5A00")))

wb.save(OUT)
print(f"Saved {OUT}")
print(f"Rows: {len(ROWS)} | Items: {len(ITEMS)} | Links: {len(URLS)} | Reachable: {reach}")
print(f"Budget total (your targets): {sum(i['target'] for i in ITEMS):,}")
print(f"Cheapest practical total: {sum(practical_min(i)[2]*i['qty'] for i in ITEMS):,}")
print(f"Recommended total: {sum(([v for v in i['variants'] if v[12]] or [min(i['variants'],key=lambda v:v[2])])[0][2]*i['qty'] for i in ITEMS):,}")
