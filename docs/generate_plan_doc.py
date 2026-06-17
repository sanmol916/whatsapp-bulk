"""
Generates the B2B WhatsApp Bulk Messaging Platform planning document (.docx).
Run: python docs/generate_plan_doc.py
"""

from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT

BRAND = RGBColor(0x12, 0x8C, 0x7E)      # teal
DARK = RGBColor(0x1F, 0x29, 0x37)
GRAY = RGBColor(0x55, 0x55, 0x55)

doc = Document()

# ---- base styles ----
normal = doc.styles["Normal"]
normal.font.name = "Calibri"
normal.font.size = Pt(11)
normal.font.color.rgb = DARK


def spacer(size=6):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(size)
    return p


def h1(text):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.bold = True
    r.font.size = Pt(18)
    r.font.color.rgb = BRAND
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(6)
    return p


def h2(text):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.bold = True
    r.font.size = Pt(13.5)
    r.font.color.rgb = DARK
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)
    return p


def para(text, italic=False, bold=False):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.italic = italic
    r.bold = bold
    p.paragraph_format.space_after = Pt(6)
    return p


def bullet(text, level=0):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.left_indent = Inches(0.25 + 0.25 * level)
    # support inline bold using **
    parts = text.split("**")
    for i, part in enumerate(parts):
        r = p.add_run(part)
        if i % 2 == 1:
            r.bold = True
    p.paragraph_format.space_after = Pt(2)
    return p


def numbered(text):
    p = doc.add_paragraph(style="List Number")
    parts = text.split("**")
    for i, part in enumerate(parts):
        r = p.add_run(part)
        if i % 2 == 1:
            r.bold = True
    p.paragraph_format.space_after = Pt(2)
    return p


def table(headers, rows):
    t = doc.add_table(rows=1, cols=len(headers))
    t.style = "Light Grid Accent 1"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = t.rows[0].cells
    for i, htext in enumerate(headers):
        hdr[i].paragraphs[0].add_run(htext).bold = True
    for row in rows:
        cells = t.add_row().cells
        for i, val in enumerate(row):
            cells[i].text = str(val)
    spacer(6)
    return t


# ============================================================
# COVER
# ============================================================
title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = title.add_run("Building a B2B WhatsApp Bulk Messaging Platform")
r.bold = True
r.font.size = Pt(26)
r.font.color.rgb = BRAND

sub = doc.add_paragraph()
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = sub.add_run("Research, Business Model, Architecture & Deployment Plan")
r.font.size = Pt(14)
r.font.color.rgb = GRAY

meta = doc.add_paragraph()
meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = meta.add_run("Benchmarked against AiSensy / WATI / Interakt  |  Prepared for review")
r.italic = True
r.font.size = Pt(10.5)
r.font.color.rgb = GRAY

spacer(10)
note = doc.add_paragraph()
note.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = note.add_run(
    "This is a planning document for review only. No platform code has been written yet. "
    "Once you approve the approach, we move to implementation."
)
r.italic = True
r.font.size = Pt(10)
r.font.color.rgb = GRAY

doc.add_page_break()

# ============================================================
# EXECUTIVE SUMMARY
# ============================================================
h1("Executive Summary")
para(
    "AiSensy, WATI and Interakt are all built on exactly the same foundation you already used: "
    "Meta's official WhatsApp Business Platform (Cloud API). They do not have any secret messaging "
    "channel. What they sell is a polished, multi-business software layer on top of that API, plus "
    "onboarding, compliance handling and support."
)
para("The opportunity for our platform comes down to three things:", bold=True)
bullet("**Software subscription** - businesses pay a monthly/yearly fee to use our dashboard, automations and analytics.")
bullet("**Messaging credits** - WhatsApp messages are paid per message; we can resell them at cost or with a small margin.")
bullet("**Done-for-you onboarding** - getting a business verified and live on WhatsApp API is painful; charging for that is real revenue.")
para(
    "The single most important technical decision is how businesses connect their own WhatsApp number "
    "to our platform. The professional answer (used by AiSensy) is Meta's Embedded Signup combined with "
    "the Tech Provider program. This document explains that and proposes a phased build so we can launch "
    "a free testable version first, then a paid multi-tenant version."
)

# ============================================================
# PART 1 - BUSINESS MODEL
# ============================================================
h1("Part 1 - How AiSensy Actually Works (Business Model)")

h2("1.1 What AiSensy is")
para(
    "AiSensy is an official Meta Business Solution Provider (BSP). Public marketing states it serves "
    "210,000+ businesses across 68+ countries. A BSP is a company Meta authorises to help other "
    "businesses get onto and use the WhatsApp Business API."
)
para("In plain terms, AiSensy sits in the middle:")
para("Meta (owns WhatsApp)  ->  AiSensy (software + reseller layer)  ->  Businesses (their customers)  ->  End customers", italic=True)

h2("1.2 How they make money - two revenue streams")
para("Stream 1 - Platform subscription (their main profit):")
bullet("A Free Forever plan to attract users (limited features).")
bullet("Paid tiers, roughly: Automation Lite around Rs699/month, Basic around Rs999-1,500/month, Pro around Rs3,200/month, with about 10% off on yearly billing.")
bullet("Higher tiers unlock chatbot/automation builders, broadcast scheduling, analytics, more agent seats and integrations.")
para("Stream 2 - WhatsApp Conversation Credits (the messaging cost):")
bullet("Every template message has a per-message cost set by Meta. Businesses pre-load credits to send.")
bullet("AiSensy publicly markets 0% markup on Meta's conversation charges - meaning they make their profit on the subscription, and pass messaging through at cost. Other providers add a margin instead.")

h2("1.3 Meta's underlying message pricing (India, effective Jan 1, 2026)")
para("This is the cost we and every provider pay Meta. Pricing is now per message delivered (it changed from the old per-24-hour-conversation model in 2025).")
table(
    ["Message category", "Cost per message (India)", "Notes"],
    [
        ["Marketing", "approx Rs1.09", "Promotions, offers - the expensive one"],
        ["Utility", "approx Rs0.145", "Order updates, alerts (cheaper)"],
        ["Authentication", "approx Rs0.145", "OTPs / login codes"],
        ["Service", "Free", "Replies inside the 24h customer window"],
    ],
)
para(
    "Key rule: when a customer messages the business first, a 24-hour service window opens. Replies "
    "inside that window (and utility templates within it) are free. This is why good two-way "
    "conversations are far cheaper than cold marketing blasts.",
    italic=True,
)

h2("1.4 The takeaway for us")
bullet("**The real, defensible profit is the software subscription**, not message markup.")
bullet("**A free tier is a customer-acquisition tool**, not charity - it pulls businesses in, then upgrades them.")
bullet("**Pricing must always cover Meta's per-message cost** so we never lose money on sends.")

# ============================================================
# PART 2 - NUMBER MANAGEMENT
# ============================================================
h1("Part 2 - How They Manage Mobile & Virtual Numbers")

h2("2.1 The 'clean number' rule")
para(
    "Every WhatsApp API number must be 'clean' - it must not currently be active on the regular "
    "WhatsApp or WhatsApp Business app. If a number is already on the app, it has to be deleted from "
    "there first (or migrated) before it can join the API."
)

h2("2.2 Can virtual / VoIP numbers be used?")
bullet("**Yes, conditionally.** A landline or VoIP/virtual number can be registered as long as it can receive the verification code by SMS or voice call.")
bullet("**Toll-free / 1-800 numbers behind an IVR usually fail**, because Meta's verification call cannot navigate the 'press 1' menu.")
bullet("**Practical approach:** most businesses bring their own existing mobile/landline number. Platforms like AiSensy generally do not hand out numbers; they guide the customer to use a number they control.")
para(
    "For our platform, the safest default is 'bring your own number' (BYON). Offering virtual numbers "
    "ourselves adds cost, trust risk and support load, so we treat it as a later, optional add-on.",
    italic=True,
)

h2("2.3 Who actually owns the number and the account")
para(
    "This is the part beginners miss. With Meta's Embedded Signup, the business customer owns their own "
    "WhatsApp Business Account (WABA) and phone number. They simply grant our platform shared access. "
    "We never 'hold' their number - we operate it on their behalf with a scoped access token."
)

h2("2.4 Messaging limits are shared at the portfolio level")
para(
    "Since around October 2023, Meta applies messaging limits at the Business Portfolio level. All "
    "numbers under one portfolio share a single daily cap. You cannot dodge limits by spreading the "
    "same campaign across several numbers in the same portfolio. This matters when we design how many "
    "businesses sit under our own portfolio versus their own."
)

# ============================================================
# PART 3 - BANS & QUALITY
# ============================================================
h1("Part 3 - How They Tackle Bans & Keep Numbers Healthy")

h2("3.1 Quality rating - the health score")
para("Meta assigns each number a quality rating driven mostly by how recipients react (blocks and reports) over a rolling window:")
table(
    ["Rating", "Meaning", "Effect"],
    [
        ["Green (High)", "Healthy", "Limits can grow"],
        ["Yellow (Medium)", "Warning", "Watch closely"],
        ["Red (Low)", "Poor", "Risk of restriction / tier drop"],
    ],
)
para("If quality improves and stays high/medium for 7 days, status returns to Connected.", italic=True)

h2("3.2 Messaging tiers - how scale is earned")
para("New numbers start small and scale automatically with good quality and volume:")
bullet("Start: 250 (or 1,000) unique customers per 24 hours")
bullet("Then: 1,000 -> 10,000 -> 100,000 -> unlimited unique customers / 24h")
para("Throughput grows as you behave well; there is no shortcut to buy your way past it.", italic=True)

h2("3.3 How serious providers PREVENT bans")
numbered("**Collect real opt-in consent** before messaging anyone - this is the single biggest factor.")
numbered("**Send relevant, personalised content** - avoid generic mass blasts to cold lists.")
numbered("**Use only approved templates** and pick the correct category (marketing vs utility).")
numbered("**Pace the sending** instead of dumping thousands at once.")
numbered("**Monitor quality signals** and pause/slow down when a number turns yellow.")
numbered("**Make it easy to opt out**, which lowers block/report rates.")

h2("3.4 What happens when a number gets restricted, and recovery")
para("Meta escalates in stages: warning -> temporary restriction (lower tier / paused sending) -> permanent disable in severe cases.")
para("Recovery path:")
bullet("Fix the root cause (stop the spammy campaign, clean the list, improve opt-in).")
bullet("Use **Request Review / appeal** inside WhatsApp Manager / Business Manager, with an honest, compliant explanation and evidence of consent.")
bullet("Accounts are often reinstated when the appeal is clear; ignoring warnings until permanent disable usually means it cannot be recovered.")
para(
    "Design implication: our platform must build in consent tracking, opt-out handling and a quality "
    "dashboard from day one - these are not optional extras, they are how we protect every customer's number.",
    italic=True,
)

# ============================================================
# PART 4 - TWO WAYS TO BUILD
# ============================================================
h1("Part 4 - The Two Ways to Build a Multi-Business Platform")

para("To let many businesses use one platform, Meta offers two partner models:")
table(
    ["Model", "Who pays Meta for messages", "Best for"],
    [
        ["Tech Provider", "The business customer pays Meta directly", "Easier to start; less financial risk for us"],
        ["Solution Partner (BSP)", "We get a line of credit and bill customers", "Full reseller (what AiSensy is); more requirements"],
    ],
)
para("Recommendation: start as a Tech Provider. We can graduate to full Solution Partner later once volume justifies it.", bold=True)

h2("4.1 Embedded Signup - the professional onboarding flow")
para(
    "Embedded Signup is a Meta-hosted popup we embed in our website. The business logs in with Facebook, "
    "picks/creates their WABA and number, and instantly grants our app access - no manual token copying. "
    "This is exactly the smooth onboarding AiSensy offers."
)
para("How it works technically:")
numbered("We become a **Meta Tech Provider** and create a Meta app.")
numbered("We complete **App Review** for the permissions whatsapp_business_management and whatsapp_business_messaging.")
numbered("We subscribe to the **account_update webhook** (fires when a customer finishes signup).")
numbered("Customer completes Embedded Signup via **Facebook Login for Business**.")
numbered("We exchange the returned code for a **Business Integration System User access token** that is scoped to that one customer.")
numbered("We store that token securely and use it to send/receive messages on their behalf.")
para(
    "Note on scale: after verification, Meta allows onboarding roughly 200 new customers per rolling "
    "7-day window - plenty for our growth phase.",
    italic=True,
)

# ============================================================
# PART 5 - ARCHITECTURE
# ============================================================
h1("Part 5 - Proposed Architecture for Our Platform")

h2("5.1 The big difference from your current tool")
para(
    "Your current tool is single-tenant: one number, one set of contacts, one .env file. A B2B platform "
    "is multi-tenant: many businesses, each with isolated data, their own number/token, their own "
    "contacts, templates, campaigns and billing. Everything must be partitioned by an 'organization' (tenant)."
)

h2("5.2 Core components")
bullet("**Web app (dashboard)** - login, organization workspace, contacts, templates, campaign builder, analytics.")
bullet("**Onboarding service** - Embedded Signup flow, stores each tenant's WABA id, phone id and scoped token.")
bullet("**Sending service / worker** - queue-based, rate-limited per tenant, respects Meta tiers.")
bullet("**Webhook ingestor** - one public endpoint that routes incoming events to the correct tenant.")
bullet("**Billing service** - subscription plans + prepaid message credits, usage metering, invoices.")
bullet("**Quality & compliance module** - consent/opt-in records, opt-out handling, quality-rating dashboard.")
bullet("**Admin panel (for us)** - see all tenants, usage, suspend abusers, support.")

h2("5.3 Multi-tenancy & security")
bullet("Every database table carries an organizationId; all queries are scoped to the logged-in tenant.")
bullet("Per-tenant WhatsApp tokens stored **encrypted at rest**, never exposed to the browser.")
bullet("Role-based access inside each organization (owner, admin, agent).")
bullet("Per-tenant send rate limiting so one customer cannot exhaust shared resources.")

h2("5.4 Recommended tech stack (builds on what you already know)")
table(
    ["Layer", "Choice", "Why"],
    [
        ["Frontend + API", "Next.js (App Router) + TypeScript", "Same as your current tool; one codebase"],
        ["Database", "PostgreSQL + Prisma", "Already in use; strong multi-tenant support"],
        ["Queue / jobs", "BullMQ + Redis", "Already in use; reliable rate-limited sending"],
        ["Auth", "Auth.js (NextAuth) or Clerk", "Multi-user login + organizations"],
        ["Billing", "Razorpay (India) / Stripe", "Subscriptions + prepaid credits"],
        ["Hosting", "Railway or a VPS (see Part 8)", "Runs web + worker + DB + Redis together"],
    ],
)

# ============================================================
# PART 6 - BUILD PLAN
# ============================================================
h1("Part 6 - Phased Build Plan")
para("We build in stages so there is always something working and testable. Each phase is a clear milestone.")

h2("Phase 0 - Foundation (reuse current tool)")
bullet("Refactor the existing single-tenant tool into an 'organization'-aware data model.")
bullet("Add user accounts and login.")

h2("Phase 1 - Multi-tenant core (MVP)")
bullet("Organizations, members, roles.")
bullet("Per-tenant contacts, templates, campaigns, messages.")
bullet("Manual number connection (paste token) - works before Embedded Signup approval.")

h2("Phase 2 - Professional onboarding")
bullet("Apply for Meta Tech Provider + App Review.")
bullet("Implement Embedded Signup so businesses self-connect in minutes.")
bullet("Central webhook routing per tenant.")

h2("Phase 3 - Monetisation")
bullet("Subscription plans (free + paid) and prepaid message credits.")
bullet("Usage metering, credit deduction per message, low-balance alerts.")
bullet("Razorpay/Stripe integration and invoices.")

h2("Phase 4 - Stickiness & scale")
bullet("Chatbot / auto-reply builder, scheduled broadcasts, analytics dashboards.")
bullet("Quality-rating monitor, consent & opt-out management.")
bullet("Admin panel, audit logs, alerting.")

# ============================================================
# PART 7 - MONETISATION
# ============================================================
h1("Part 7 - Monetisation & Pricing Strategy")
para("A simple, AiSensy-style structure that we can refine:")
table(
    ["Plan", "Target", "Monthly (example)", "Includes"],
    [
        ["Free", "Trials / very small", "Rs0", "1 number, limited contacts, basic broadcast, our branding"],
        ["Starter", "Small business", "Rs999", "More contacts, templates sync, basic automation"],
        ["Pro", "Growing business", "Rs2,499", "Chatbot builder, analytics, multiple agents"],
        ["Business", "High volume", "Custom", "Higher limits, priority support, integrations"],
    ],
)
para("On top of any plan, businesses buy message credits. We deduct Meta's per-message cost (Part 1.3) and optionally add a small margin.", italic=True)
para("Extra revenue: paid onboarding / setup, blue-tick application help, custom chatbot building, and migration services.")

# ============================================================
# PART 8 - DEPLOYMENT
# ============================================================
h1("Part 8 - Deployment Plan (Free Option & Paid Option)")

h2("8.1 Free option - for building, testing and first demos")
para("Goal: spend as close to zero as possible while we develop and show the platform.")
bullet("**App + worker:** Railway free trial credit, or a single small always-on service.")
bullet("**Database:** Neon (free Postgres tier) - persistent and generous.")
bullet("**Redis:** Railway Redis (within trial) or a free Redis tier.")
bullet("**Webhook HTTPS:** provided automatically by the host's public domain (or ngrok during local dev).")
bullet("**Limitation:** free/idle services may sleep and have low limits - fine for testing, not for paying customers.")

h2("8.2 Paid option - for real, paying customers (production)")
para("Goal: always-on, reliable, scalable. Two good routes:")
para("Route A - Single VPS with Docker (most cost-effective, more control):")
bullet("A VPS (Hetzner / DigitalOcean / AWS Lightsail), roughly Rs500-1,500/month to start.")
bullet("Run web + worker + Postgres + Redis via Docker Compose, with Caddy/Nginx for automatic HTTPS.")
bullet("Add backups and monitoring.")
para("Route B - Managed platform (less ops work, a bit more cost):")
bullet("Web + worker on Railway/Render paid tiers.")
bullet("Managed Postgres (Neon/Render) and managed Redis (Upstash/Render).")
bullet("Scales with usage; easiest to operate for a small team.")
para("Recommendation: develop on the free option, launch paying customers on Route A (VPS) for cost, "
     "and move to Route B or Kubernetes only when scale demands it.", bold=True)

h2("8.3 Production must-haves before charging customers")
bullet("Encrypted secrets and per-tenant token storage.")
bullet("Automated database backups.")
bullet("Uptime + error monitoring and alerts.")
bullet("Clear privacy policy, terms, and consent records (DPDP/GDPR awareness).")

# ============================================================
# PART 9 - COMPLIANCE
# ============================================================
h1("Part 9 - Compliance & Legal (do not skip)")
bullet("**Opt-in is mandatory** - only message people who agreed; keep proof.")
bullet("**Follow Meta's WhatsApp Business & Commerce policies** - no prohibited goods, no spam.")
bullet("**Data protection** - India's DPDP Act / GDPR: store personal data safely, allow deletion.")
bullet("**Honest sender identity** - no impersonation; display names go through Meta review.")
bullet("**Give us terms of service** so abusive customers can be suspended to protect our portfolio.")

# ============================================================
# PART 10 - RISKS
# ============================================================
h1("Part 10 - Key Risks & Mitigations")
table(
    ["Risk", "Impact", "Mitigation"],
    [
        ["Customer sends spam, hurts quality", "Number restricted/banned", "Consent tracking, quality monitor, suspend abusers"],
        ["Meta approval delays", "Slows onboarding launch", "Ship Phase 1 with manual token first"],
        ["Pricing below Meta cost", "We lose money per message", "Always meter and deduct true cost"],
        ["Single VPS failure", "Downtime", "Backups + move to managed/HA when scaling"],
        ["Token leakage", "Security breach", "Encrypt at rest, never expose to client"],
    ],
)

# ============================================================
# DECISIONS NEEDED + SOURCES
# ============================================================
h1("Decisions Needed From You Before We Code")
numbered("Confirm we start as a **Tech Provider** (recommended) vs full Solution Partner.")
numbered("Confirm **'bring your own number'** as the default (virtual numbers later).")
numbered("Confirm the **phased plan** (Phase 1 multi-tenant MVP first).")
numbered("Confirm **free + paid pricing** direction (Part 7).")
numbered("Confirm **deployment**: free option now, VPS for paid launch.")
para("Once you approve these, I will turn this into a technical spec and begin building Phase 1.", bold=True)

h1("Sources")
para("Information was researched from public documentation and rephrased for compliance with licensing restrictions:", italic=True)
for s in [
    "AiSensy pricing & blog - aisensy.com (pricing, BSP status, per-message pricing updates)",
    "Meta WhatsApp Business Platform docs - developers.facebook.com (phone numbers, embedded signup, rate limits, quality)",
    "WATI / Interakt onboarding & rate-limit guides - wati.io, interakt.shop",
    "Twilio Tech Provider program docs - twilio.com",
    "Vonage Hosted Embedded Sign-Up - api.support.vonage.com",
    "Quality / ban-recovery guides - sleekflow.io, ycloud.com, salesmartly.com",
    "Hyperleap WhatsApp pricing guide 2026 - hyperleap.ai",
]:
    bullet(s)

doc.save("docs/B2B-WhatsApp-Platform-Plan.docx")
print("Saved docs/B2B-WhatsApp-Platform-Plan.docx")
