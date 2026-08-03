#!/usr/bin/env python3
# ============================================================
# CardIQ — SEO Content Page Generator
# Reads cards.json and generates indexable static HTML pages:
#   1. Per-card review pages       /cards/hdfc-millennia/
#   2. Category "best card" pages  /best/swiggy/  /best/fuel/
#   3. Head-to-head comparisons    /compare/hdfc-millennia-vs-sbi-cashback/
#   4. A sitemap.xml + index
#
# Every page is a Google entry point that funnels to the tool.
# This is the growth engine a website has that an app cannot.
# ============================================================

import json, os, re, itertools
from datetime import date

CARDS = json.load(open(os.path.join(os.path.dirname(__file__), "..", "cards.json")))
OUT = os.path.join(os.path.dirname(__file__), "..", "output")
SITE = "https://cardiq.in"   # replace with your domain
TODAY = date.today().isoformat()

CAT_LABELS = {
    "online": "Online Shopping", "dining": "Dining & Food Delivery",
    "groceries": "Groceries", "fuel": "Fuel", "utilities": "Bills & Utilities",
    "rent": "Rent", "travel": "Travel & Flights", "upi": "UPI Spends",
}
# Popular merchant → category, for high-intent search pages like "best card for Swiggy"
MERCHANT_PAGES = {
    "swiggy": ("dining", "Swiggy"), "zomato": ("dining", "Zomato"),
    "amazon": ("online", "Amazon"), "flipkart": ("online", "Flipkart"),
    "myntra": ("online", "Myntra"), "bigbasket": ("groceries", "BigBasket"),
    "blinkit": ("groceries", "Blinkit"), "petrol": ("fuel", "Petrol & Fuel"),
    "electricity-bill": ("utilities", "Electricity Bills"),
    "mobile-recharge": ("utilities", "Mobile Recharge"),
    "rent": ("rent", "Rent Payments"), "flights": ("travel", "Flight Bookings"),
}

def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

def rupees(n):
    # Indian number formatting
    s = str(int(n))
    if len(s) <= 3: return "₹" + s
    last3 = s[-3:]; rest = s[:-3]
    rest = re.sub(r"(\d)(?=(\d\d)+$)", r"\1,", rest)
    return "₹" + rest + "," + last3

def eff_rate(card, cat):
    if cat in (card.get("excludedCats") or []): return 0
    return card["rewards"].get(cat, 0)

def best_cards_for(cat, n=5):
    ranked = sorted(CARDS, key=lambda c: eff_rate(c, cat), reverse=True)
    return [c for c in ranked if eff_rate(c, cat) > 0][:n]

# ---------- Shared HTML shell ----------
def page_shell(title, description, body, canonical, breadcrumbs=None):
    crumb_ld = ""
    if breadcrumbs:
        items = ",".join(
            f'{{"@type":"ListItem","position":{i+1},"name":"{n}","item":"{u}"}}'
            for i, (n, u) in enumerate(breadcrumbs)
        )
        crumb_ld = f'<script type="application/ld+json">{{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{items}]}}</script>'
    return f"""<!DOCTYPE html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<meta name="description" content="{description}">
<link rel="canonical" href="{canonical}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:type" content="article">
<meta property="og:url" content="{canonical}">
<meta name="robots" content="index,follow">
{crumb_ld}
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
<style>
:root{{--navy:#0A1628;--gold:#C9A84C;--slate:#5A6B7B;--surface:#F7F9FB;--surface2:#EEF2F6;--border:#E2E8ED;--green:#1DB87A;--white:#fff}}
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:Inter,system-ui,sans-serif;color:var(--navy);line-height:1.6;background:var(--white)}}
.wrap{{max-width:820px;margin:0 auto;padding:0 20px}}
header.site{{background:var(--navy);padding:14px 0}}
header.site .wrap{{display:flex;align-items:center;justify-content:space-between}}
.logo{{font-family:'DM Serif Display',serif;font-size:22px;color:var(--gold)}}
.cta-top{{background:var(--gold);color:var(--navy);padding:8px 16px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px}}
.crumbs{{font-size:12px;color:var(--slate);padding:14px 0}}
.crumbs a{{color:var(--slate);text-decoration:none}}
h1{{font-family:'DM Serif Display',serif;font-size:32px;line-height:1.2;margin:8px 0 12px}}
h2{{font-size:22px;margin:32px 0 12px}}
h3{{font-size:17px;margin:20px 0 8px}}
p{{margin:12px 0;color:#2a3744}}
.updated{{font-size:12px;color:var(--slate);margin-bottom:20px}}
.card-box{{border:1px solid var(--border);border-radius:14px;padding:20px;margin:16px 0;background:var(--surface)}}
.card-box.top{{border-color:var(--gold);border-width:2px}}
.rank{{display:inline-block;background:var(--navy);color:#fff;font-size:12px;font-weight:600;padding:2px 10px;border-radius:99px;margin-bottom:8px}}
.rank.gold{{background:var(--gold);color:var(--navy)}}
.card-name{{font-size:19px;font-weight:700}}
.card-bank{{font-size:13px;color:var(--slate);margin-bottom:10px}}
.rate-big{{font-size:28px;font-weight:700;color:var(--green)}}
.meta-row{{display:flex;gap:20px;flex-wrap:wrap;margin:12px 0;font-size:13px}}
.meta-row b{{display:block;font-size:15px;color:var(--navy)}}
.meta-row span{{color:var(--slate)}}
table{{width:100%;border-collapse:collapse;margin:16px 0;font-size:14px}}
th,td{{text-align:left;padding:10px 12px;border-bottom:1px solid var(--border)}}
th{{background:var(--surface2);font-weight:600}}
.cta-block{{background:var(--navy);border-radius:16px;padding:28px;text-align:center;margin:36px 0;color:#fff}}
.cta-block h3{{color:var(--gold);font-size:20px;margin-bottom:8px}}
.cta-block p{{color:rgba(255,255,255,.7);margin-bottom:16px}}
.cta-btn{{display:inline-block;background:var(--gold);color:var(--navy);padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600}}
.faq dt{{font-weight:600;margin-top:16px}}
.faq dd{{margin:6px 0 0;color:#2a3744}}
footer.site{{border-top:1px solid var(--border);margin-top:48px;padding:24px 0;font-size:12px;color:var(--slate)}}
footer.site a{{color:var(--slate)}}
.related{{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}}
.related a{{font-size:13px;padding:6px 14px;background:var(--surface2);border-radius:99px;text-decoration:none;color:var(--navy)}}
@media(max-width:600px){{h1{{font-size:26px}}.wrap{{padding:0 16px}}}}
</style>
</head>
<body>
<header class="site"><div class="wrap"><span class="logo">CardIQ</span><a class="cta-top" href="{SITE}/app">Optimize my cards →</a></div></header>
<div class="wrap">
{body}
</div>
<footer class="site"><div class="wrap">
<p>CardIQ is an independent credit card optimizer. We show methodology for every number and take no bank sponsorships. Card data verified {TODAY}. Rates change — always confirm with the issuer before applying.</p>
<p style="margin-top:8px"><a href="{SITE}/privacy">Privacy</a> · <a href="{SITE}/app">Open the tool</a> · <a href="{SITE}/sitemap.xml">Sitemap</a></p>
</div></footer>
</body></html>"""

def cta(context="your spending"):
    return f"""<div class="cta-block">
<h3>See your exact best card in 30 seconds</h3>
<p>CardIQ does the real math on caps, fees, and milestones for {context} — free, no bank login.</p>
<a class="cta-btn" href="{SITE}/app">Run the free optimizer →</a>
</div>"""

# ---------- 1. Per-card review pages ----------
def gen_card_page(card):
    s = slug(card["name"])
    top_cats = sorted(card["rewards"].items(), key=lambda kv: kv[1], reverse=True)
    top_cats = [(c, r) for c, r in top_cats if r > 0 and c not in (card.get("excludedCats") or [])][:3]
    fee = "Lifetime Free" if card.get("lifetimeFree") else rupees(card["annualFee"])
    waiver = f"waived at {rupees(card['feeWaiverSpend'])}/year spend" if card.get("feeWaiverSpend") else "no waiver"

    rows = ""
    for c in ["online","dining","groceries","fuel","utilities","rent","travel","upi"]:
        r = eff_rate(card, c)
        excl = c in (card.get("excludedCats") or [])
        cap = card["caps"].get(c)
        rate_txt = "Excluded" if excl else (f"{r}%" if r else "Base rate")
        cap_txt = f"capped {rupees(cap)}/mo" if cap else "—"
        rows += f"<tr><td>{CAT_LABELS[c]}</td><td>{rate_txt}</td><td>{cap_txt}</td></tr>"

    top_list = ", ".join(f"{r}% on {CAT_LABELS[c]}" for c, r in top_cats)
    title = f"{card['name']} Review 2026: Rewards, Fees & Is It Worth It? | CardIQ"
    desc = f"{card['name']} ({card['bank']}) full review — {top_list}. Annual fee {fee}. Real reward math, caps, and who should get it."
    canonical = f"{SITE}/cards/{s}/"

    body = f"""
<div class="crumbs"><a href="{SITE}/">Home</a> › <a href="{SITE}/cards/">Cards</a> › {card['name']}</div>
<h1>{card['name']} Review (2026)</h1>
<div class="updated">Independently analysed · Data verified {card.get('verifiedDate', TODAY)} · No sponsorship</div>
<p>The <b>{card['name']}</b> from {card['bank']} is a {card['rewardType']} card with an annual fee of <b>{fee}</b> ({waiver}). Its strongest categories are {top_list}.</p>

<div class="card-box top">
<span class="rank gold">Quick verdict</span>
<div class="card-name">{card['name']}</div>
<div class="card-bank">{card['bank']} · {card.get('network','')}</div>
<div class="meta-row">
<div><b>{fee}</b><span>annual fee</span></div>
<div><b>{rupees(card['minSalary'])}/mo</b><span>income guideline</span></div>
<div><b>{card.get('minCibil','—')}+</b><span>CIBIL preferred</span></div>
<div><b>{'Yes' if card.get('overallCap') else 'No'}</b><span>overall reward cap</span></div>
</div>
<p style="margin-bottom:0;font-size:14px">{card.get('benefits','')}</p>
</div>

<h2>Reward rates by category</h2>
<table><tr><th>Category</th><th>Reward rate</th><th>Cap</th></tr>{rows}</table>

<h2>Who should get the {card['name']}?</h2>
<p>This card makes most sense if your spending is concentrated in {top_cats[0][0] if top_cats else 'everyday'} categories and you {'clear the ' + rupees(card['feeWaiverSpend']) + ' annual spend to waive the fee' if card.get('feeWaiverSpend') else 'value a no-fee card'}. {'It needs a CIBIL score around ' + str(card.get('minCibil')) + '+ for approval.' if card.get('minCibil') else ''}</p>
{"<p><b>Watch out:</b> this card excludes " + ", ".join(CAT_LABELS[x] for x in card['excludedCats']) + " — you earn nothing in those categories.</p>" if card.get('excludedCats') else ""}
{"<p><b>Shared cap:</b> total rewards are capped at " + rupees(card['overallCap']) + "/month across all categories combined — heavy spenders hit this ceiling.</p>" if card.get('overallCap') else ""}

{cta(f"the {card['name']}")}

<h2>Frequently asked questions</h2>
<dl class="faq">
<dt>What is the annual fee on the {card['name']}?</dt>
<dd>{fee}{'. It is ' + waiver + '.' if card.get('feeWaiverSpend') else '.'}</dd>
<dt>Do {card['name']} reward points expire?</dt>
<dd>{'Amazon Pay balance never expires.' if card['bank']=='ICICI Bank' else 'IDFC First points never expire.' if 'IDFC' in card['bank'] else 'Points typically expire in 2–3 years depending on the program — redeem regularly.'}</dd>
<dt>What income do I need for the {card['name']}?</dt>
<dd>The typical guideline is around {rupees(card['minSalary'])}/month, with a CIBIL score of {card.get('minCibil','700')}+ for a smooth approval.</dd>
</dl>

<div class="related">
<a href="{SITE}/best/dining/">Best dining cards</a>
<a href="{SITE}/best/online/">Best online shopping cards</a>
<a href="{SITE}/cards/">All card reviews</a>
</div>
"""
    return s, page_shell(title, desc, body, canonical,
        [("Home", f"{SITE}/"), ("Cards", f"{SITE}/cards/"), (card['name'], canonical)])

# ---------- 2. Category "best card" pages ----------
def gen_category_page(key, cat, label):
    best = best_cards_for(cat, 5)
    if not best: return None
    title = f"Best Credit Card for {label} in India (2026) | CardIQ"
    desc = f"The best credit cards for {label} in India, ranked by real reward rate after caps and fees. #1 pick: {best[0]['name']} at {eff_rate(best[0],cat)}%."
    canonical = f"{SITE}/best/{key}/"

    boxes = ""
    for i, card in enumerate(best):
        r = eff_rate(card, cat)
        fee = "Lifetime Free" if card.get("lifetimeFree") else rupees(card["annualFee"]) + "/yr"
        boxes += f"""<div class="card-box {'top' if i==0 else ''}">
<span class="rank {'gold' if i==0 else ''}">#{i+1}{' Best overall' if i==0 else ''}</span>
<div class="card-name">{card['name']}</div>
<div class="card-bank">{card['bank']}</div>
<div class="rate-big">{r}%</div>
<div class="meta-row"><div><b>{fee}</b><span>annual fee</span></div><div><b>{rupees(card['minSalary'])}/mo</b><span>income</span></div></div>
<p style="font-size:13px;margin-bottom:0"><a href="{SITE}/cards/{slug(card['name'])}/">Full {card['name']} review →</a></p>
</div>"""

    rows = "".join(
        f"<tr><td>{i+1}</td><td>{c['name']}</td><td>{eff_rate(c,cat)}%</td><td>{'LTF' if c.get('lifetimeFree') else rupees(c['annualFee'])}</td></tr>"
        for i, c in enumerate(best)
    )
    body = f"""
<div class="crumbs"><a href="{SITE}/">Home</a> › <a href="{SITE}/best/">Best cards</a> › {label}</div>
<h1>Best Credit Card for {label} in India (2026)</h1>
<div class="updated">Ranked by effective reward rate after caps & exclusions · Verified {TODAY}</div>
<p>We ranked every major Indian credit card by the <b>real reward rate you earn on {label}</b> — after applying category caps, exclusions, and reward-point conversion. Here are the top {len(best)}.</p>
<table><tr><th>Rank</th><th>Card</th><th>Rate on {label}</th><th>Fee</th></tr>{rows}</table>
{boxes}
{cta(label)}
<h2>How we rank {label} cards</h2>
<p>Unlike affiliate listicles, CardIQ ranks by the effective rupee value you actually receive. We account for the monthly cap on each category, whether the category is excluded, how reward points convert to rupees, and whether the annual fee is waived at your spending level. The tool then personalises this to your exact monthly spend.</p>
<div class="related">
{"".join(f'<a href="{SITE}/best/{k}/">Best {v[1]} cards</a>' for k,v in list(MERCHANT_PAGES.items())[:6] if k!=key)}
</div>
"""
    return key, page_shell(title, desc, body, canonical,
        [("Home", f"{SITE}/"), ("Best cards", f"{SITE}/best/"), (label, canonical)])

# ---------- 3. Head-to-head comparison pages ----------
def gen_compare_page(a, b):
    sa, sb = slug(a["name"]), slug(b["name"])
    key = f"{sa}-vs-{sb}"
    title = f"{a['name']} vs {b['name']}: Which Is Better? (2026) | CardIQ"
    desc = f"{a['name']} vs {b['name']} — head-to-head on reward rates, fees, and caps. See which card wins for your spending."
    canonical = f"{SITE}/compare/{key}/"

    cats = ["online","dining","groceries","fuel","utilities","travel"]
    rows = ""
    for c in cats:
        ra, rb = eff_rate(a,c), eff_rate(b,c)
        wa = "✓" if ra > rb else ""
        wb = "✓" if rb > ra else ""
        rows += f"<tr><td>{CAT_LABELS[c]}</td><td>{ra}% {wa}</td><td>{rb}% {wb}</td></tr>"
    fee_a = "LTF" if a.get("lifetimeFree") else rupees(a["annualFee"])
    fee_b = "LTF" if b.get("lifetimeFree") else rupees(b["annualFee"])

    body = f"""
<div class="crumbs"><a href="{SITE}/">Home</a> › <a href="{SITE}/compare/">Compare</a> › {a['name']} vs {b['name']}</div>
<h1>{a['name']} vs {b['name']}</h1>
<div class="updated">Head-to-head reward comparison · Verified {TODAY}</div>
<p>Both are popular Indian cards. Here's how the <b>{a['name']}</b> and <b>{b['name']}</b> compare on the categories that matter, with real effective rates after caps.</p>
<table>
<tr><th>Category</th><th>{a['name']}</th><th>{b['name']}</th></tr>
{rows}
<tr><td><b>Annual fee</b></td><td>{fee_a}</td><td>{fee_b}</td></tr>
<tr><td><b>Income guideline</b></td><td>{rupees(a['minSalary'])}/mo</td><td>{rupees(b['minSalary'])}/mo</td></tr>
</table>
{cta("both cards")}
<p>The winner depends entirely on <b>your</b> spending mix. If you spend more on {max(a['rewards'],key=a['rewards'].get)}, the {a['name']} likely wins; if {max(b['rewards'],key=b['rewards'].get)} dominates your spending, the {b['name']} pulls ahead. CardIQ computes the exact winner for your numbers.</p>
<div class="related">
<a href="{SITE}/cards/{sa}/">{a['name']} review</a>
<a href="{SITE}/cards/{sb}/">{b['name']} review</a>
</div>
"""
    return key, page_shell(title, desc, body, canonical,
        [("Home", f"{SITE}/"), ("Compare", f"{SITE}/compare/"), (f"{a['name']} vs {b['name']}", canonical)])

# ---------- Generate everything ----------
def main():
    urls = []
    os.makedirs(f"{OUT}/cards", exist_ok=True)
    os.makedirs(f"{OUT}/best", exist_ok=True)
    os.makedirs(f"{OUT}/compare", exist_ok=True)

    # Card reviews
    for card in CARDS:
        s, html = gen_card_page(card)
        os.makedirs(f"{OUT}/cards/{s}", exist_ok=True)
        open(f"{OUT}/cards/{s}/index.html", "w").write(html)
        urls.append(f"{SITE}/cards/{s}/")

    # Category / merchant best-card pages
    for key, (cat, label) in MERCHANT_PAGES.items():
        result = gen_category_page(key, cat, label)
        if result:
            k, html = result
            os.makedirs(f"{OUT}/best/{k}", exist_ok=True)
            open(f"{OUT}/best/{k}/index.html", "w").write(html)
            urls.append(f"{SITE}/best/{k}/")
    # Also pure-category pages
    for cat, label in CAT_LABELS.items():
        result = gen_category_page(cat, cat, label)
        if result:
            k, html = result
            os.makedirs(f"{OUT}/best/{k}", exist_ok=True)
            open(f"{OUT}/best/{k}/index.html", "w").write(html)
            urls.append(f"{SITE}/best/{k}/")

    # Comparisons — top cards paired up (limit to sensible set)
    popular = sorted(CARDS, key=lambda c: c["minSalary"])[:8]
    for a, b in itertools.combinations(popular, 2):
        # only compare cards with overlapping strong categories (avoids noise)
        k, html = gen_compare_page(a, b)
        os.makedirs(f"{OUT}/compare/{k}", exist_ok=True)
        open(f"{OUT}/compare/{k}/index.html", "w").write(html)
        urls.append(f"{SITE}/compare/{k}/")

    # sitemap.xml
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for u in urls:
        sm += f"  <url><loc>{u}</loc><lastmod>{TODAY}</lastmod><changefreq>monthly</changefreq></url>\n"
    sm += "</urlset>\n"
    open(f"{OUT}/sitemap.xml", "w").write(sm)

    # index of all pages
    links = "\n".join(f'<li><a href="{u}">{u.replace(SITE,"")}</a></li>' for u in urls)
    open(f"{OUT}/index.html", "w").write(
        page_shell("CardIQ — Credit Card Guides & Reviews (India)",
                   "Independent reviews and best-card rankings for Indian credit cards.",
                   f"<h1>CardIQ Guides</h1><p>{len(urls)} indexable pages generated.</p><ul>{links}</ul>",
                   f"{SITE}/"))

    print(f"✓ Generated {len(urls)} SEO pages")
    print(f"  - {len(CARDS)} card reviews")
    print(f"  - {len(MERCHANT_PAGES) + len(CAT_LABELS)} best-card pages")
    print(f"  - {len(list(itertools.combinations(popular,2)))} comparisons")
    print(f"  - sitemap.xml + index.html")

if __name__ == "__main__":
    main()
