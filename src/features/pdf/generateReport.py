#!/usr/bin/env python3
"""
GitBlame Roast — Monthly PDF Report Card Generator
Uses reportlab to produce a dark-themed, Spotify-Wrapped-style PDF.
Called from Node.js via: python3 generateReport.py <json_data_path> <output_path>
"""

import sys
import json
import os
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.lib import colors
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Wedge, Circle
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics import renderPDF
from reportlab.platypus.flowables import Flowable

# ── Palette ──────────────────────────────────────────────────────────────────
BG          = colors.HexColor("#0f0f1a")
CARD_BG     = colors.HexColor("#111827")
CARD_BORDER = colors.HexColor("#374151")
ACCENT      = colors.HexColor("#f97316")   # orange
RED         = colors.HexColor("#ef4444")
YELLOW      = colors.HexColor("#f59e0b")
GREEN       = colors.HexColor("#22c55e")
BLUE        = colors.HexColor("#3b82f6")
PURPLE      = colors.HexColor("#8b5cf6")
WHITE       = colors.HexColor("#f9fafb")
MUTED       = colors.HexColor("#6b7280")
DIM         = colors.HexColor("#374151")

W, H = A4  # 210 x 297 mm

# ── Custom Flowables ──────────────────────────────────────────────────────────

class DarkBackground(Flowable):
    """Full-page dark background rectangle."""
    def __init__(self, width, height, color=BG):
        super().__init__()
        self.width  = width
        self.height = height
        self.color  = color

    def draw(self):
        self.canv.setFillColor(self.color)
        self.canv.rect(0, 0, self.width, self.height, fill=1, stroke=0)


class StatCard(Flowable):
    """A dark stat card with a big number + label."""
    def __init__(self, label, value, color=ACCENT, width=120, height=70):
        super().__init__()
        self.label  = label
        self.value  = str(value)
        self.color  = color
        self.width  = width
        self.height = height

    def draw(self):
        c = self.canv
        # Card background
        c.setFillColor(CARD_BG)
        c.roundRect(0, 0, self.width, self.height, 6, fill=1, stroke=0)
        # Top accent bar
        c.setFillColor(self.color)
        c.roundRect(0, self.height - 4, self.width, 4, 2, fill=1, stroke=0)
        # Value
        c.setFillColor(self.color)
        c.setFont("Helvetica-Bold", 24)
        c.drawCentredString(self.width / 2, self.height / 2 - 2, self.value)
        # Label
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 8)
        c.drawCentredString(self.width / 2, 10, self.label.upper())


class HeatBar(Flowable):
    """Single horizontal heat bar for hour-of-day heatmap."""
    def __init__(self, label, values, width=420, height=14):
        super().__init__()
        self.label  = label
        self.values = values   # list of 24 ints
        self.width  = width
        self.height = height

    def draw(self):
        c      = self.canv
        maxVal = max(self.values) or 1
        cellW  = (self.width - 40) / 24

        c.setFont("Helvetica", 7)
        c.setFillColor(MUTED)
        c.drawString(0, 3, self.label)

        SHAME = {0,1,2,3,4,22,23}
        for h, v in enumerate(self.values):
            x     = 40 + h * cellW
            ratio = v / maxVal
            alpha = max(0.08, ratio)
            base  = RED if h in SHAME else YELLOW
            r, g, b = base.red, base.green, base.blue
            c.setFillColorRGB(r, g, b, alpha)
            c.rect(x, 0, cellW - 1, self.height, fill=1, stroke=0)


class RoastMeter(Flowable):
    """A horizontal progress-bar style roast score meter."""
    def __init__(self, score, width=420, height=24):
        super().__init__()
        self.score  = min(100, max(0, score))
        self.width  = width
        self.height = height

    def draw(self):
        c = self.canv
        # Track
        c.setFillColor(DIM)
        c.roundRect(0, 0, self.width, self.height, self.height/2, fill=1, stroke=0)
        # Fill
        fill_w = (self.score / 100) * self.width
        color  = RED if self.score >= 60 else YELLOW if self.score >= 30 else GREEN
        c.setFillColor(color)
        c.roundRect(0, 0, fill_w, self.height, self.height/2, fill=1, stroke=0)
        # Score text
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(self.width / 2, 7, f"{self.score}/100")


# ── Style helpers ─────────────────────────────────────────────────────────────

def style(name="Normal", fontSize=10, textColor=WHITE, alignment=TA_LEFT,
          spaceBefore=0, spaceAfter=4, fontName="Helvetica", leading=None):
    return ParagraphStyle(
        name, fontSize=fontSize, textColor=textColor,
        alignment=alignment, spaceBefore=spaceBefore, spaceAfter=spaceAfter,
        fontName=fontName, leading=leading or fontSize * 1.3,
        backColor=None,
    )


def h1(text):
    return Paragraph(text, style("H1", 22, ACCENT, TA_CENTER, fontName="Helvetica-Bold", spaceAfter=6))


def h2(text):
    return Paragraph(text, style("H2", 14, WHITE, fontName="Helvetica-Bold", spaceBefore=14, spaceAfter=6))


def h3(text):
    return Paragraph(text, style("H3", 10, ACCENT, fontName="Helvetica-Bold", spaceBefore=8, spaceAfter=4))


def body(text, color=WHITE, size=10, align=TA_LEFT):
    return Paragraph(text, style("B", size, color, align))


def muted(text, size=8):
    return Paragraph(text, style("M", size, MUTED))


def sp(h=6):
    return Spacer(1, h)


def hr():
    return HRFlowable(width="100%", thickness=1, color=DIM, spaceAfter=8, spaceBefore=8)


def dark_table(data, col_widths, row_colors=None):
    """Renders a table with dark styling."""
    t = Table(data, colWidths=col_widths)
    style_cmds = [
        ("BACKGROUND",  (0,0), (-1,0),  colors.HexColor("#1e293b")),
        ("TEXTCOLOR",   (0,0), (-1,0),  MUTED),
        ("FONTNAME",    (0,0), (-1,-1),  "Helvetica-Bold"),
        ("FONTSIZE",    (0,0), (-1,-1), 8),
        ("TEXTCOLOR",   (0,1), (-1,-1), WHITE),
        ("ROWBACKGROUNDS", (0,1), (-1,-1),
         [colors.HexColor("#111827"), colors.HexColor("#1a2035")]),
        ("GRID",        (0,0), (-1,-1), 0.5, DIM),
        ("TOPPADDING",  (0,0), (-1,-1), 5),
        ("BOTTOMPADDING",(0,0),(-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("RIGHTPADDING",(0,0),(-1,-1), 8),
    ]
    t.setStyle(TableStyle(style_cmds))
    return t


# ── Main report builder ───────────────────────────────────────────────────────

def build_report(data: dict, output_path: str):
    month_label = data.get("month", datetime.now().strftime("%B %Y"))
    repo_name   = data.get("repoName", "your-repo")
    author      = data.get("author",   "All Authors")
    stats       = data.get("stats",    {})
    roast       = data.get("roast",    {})
    personality = data.get("personality", {})
    top_authors = data.get("topAuthors",  [])
    hour_grid   = data.get("hourGrid",    [])
    score       = data.get("score",       0)
    streak      = data.get("streak",      {})
    todos       = data.get("todos",       [])
    branches    = data.get("branches",    [])

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=18*mm, rightMargin=18*mm,
        topMargin=14*mm,  bottomMargin=14*mm,
    )

    story = []

    # ── PAGE 1: Cover ──────────────────────────────────────────────
    story.append(sp(20))
    story.append(Paragraph(
        "🔥", style("flame", 52, ACCENT, TA_CENTER, spaceAfter=0)
    ))
    story.append(sp(8))
    story.append(h1("GitBlame Roast"))
    story.append(Paragraph(
        "MONTHLY REPORT CARD",
        style("sub", 11, MUTED, TA_CENTER, fontName="Helvetica", spaceAfter=2)
    ))
    story.append(Paragraph(
        month_label,
        style("month", 13, ACCENT, TA_CENTER, fontName="Helvetica-Bold", spaceAfter=16)
    ))
    story.append(hr())

    # Repo + author
    meta_data = [
        ["REPOSITORY", repo_name],
        ["AUTHOR",     author],
        ["GENERATED",  datetime.now().strftime("%d %b %Y, %H:%M")],
    ]
    mt = Table(meta_data, colWidths=[80, 330])
    mt.setStyle(TableStyle([
        ("TEXTCOLOR",  (0,0), (0,-1), MUTED),
        ("TEXTCOLOR",  (1,0), (1,-1), WHITE),
        ("FONTNAME",   (0,0), (-1,-1), "Helvetica"),
        ("FONTNAME",   (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTSIZE",   (0,0), (-1,-1), 9),
        ("TOPPADDING", (0,0), (-1,-1), 3),
        ("BOTTOMPADDING", (0,0), (-1,-1), 3),
        ("LEFTPADDING", (0,0), (-1,-1), 0),
    ]))
    story.append(mt)
    story.append(sp(18))

    # Roast score meter
    story.append(h3("OVERALL ROAST SCORE"))
    story.append(RoastMeter(score, width=W - 36*mm))
    story.append(sp(4))
    score_label = (
        "💀 BURNT TO ASH"    if score >= 80 else
        "🔥 EXTRA CRISPY"    if score >= 60 else
        "🌶️  WELL DONE"      if score >= 40 else
        "🥩 MEDIUM RARE"     if score >= 20 else
        "🌸 SUSPICIOUSLY CLEAN"
    )
    story.append(body(score_label, ACCENT, 10, TA_CENTER))
    story.append(sp(20))

    # Stat cards row
    story.append(h3("THIS MONTH AT A GLANCE"))
    story.append(sp(6))
    card_data = [[
        StatCard("Total Commits",   stats.get("totalCommits",    0), BLUE),
        StatCard("Late Night",      stats.get("lateNightCommits",0), RED),
        StatCard("Lazy Messages",   stats.get("lazyMessages",    0), YELLOW),
        StatCard("Weekend Commits", stats.get("weekendCommits",  0), PURPLE),
    ]]
    ct = Table(card_data, colWidths=[120, 120, 120, 120])
    ct.setStyle(TableStyle([
        ("ALIGN",   (0,0), (-1,-1), "CENTER"),
        ("LEFTPADDING", (0,0), (-1,-1), 4),
        ("RIGHTPADDING", (0,0), (-1,-1), 4),
    ]))
    story.append(ct)
    story.append(sp(18))

    # AI Roast quote
    if roast.get("opening"):
        story.append(hr())
        story.append(sp(6))
        story.append(Paragraph(
            f'<i>"{roast["opening"]}"</i>',
            style("quote", 12, YELLOW, TA_CENTER, spaceBefore=4, spaceAfter=4)
        ))
        story.append(sp(4))
        story.append(body(roast.get("roast", ""), MUTED, 9, TA_CENTER))
    story.append(sp(10))

    # Developer title
    if personality.get("type"):
        story.append(hr())
        story.append(h3("DEVELOPER PERSONALITY TYPE"))
        story.append(Paragraph(
            f'{personality.get("emoji","")}  {personality["type"]}',
            style("ptype", 15, WHITE, TA_CENTER, fontName="Helvetica-Bold", spaceAfter=4)
        ))
        story.append(body(personality.get("tagline", ""), MUTED, 9, TA_CENTER))

    story.append(PageBreak())

    # ── PAGE 2: Deep Stats ─────────────────────────────────────────
    story.append(h2("📊 Commit Analysis"))
    story.append(hr())

    # Commit heatmap rows
    if hour_grid:
        story.append(h3("HOURLY COMMIT HEATMAP  (red = shame hours 10pm–4am)"))
        story.append(sp(4))
        days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        for d_idx, day_vals in enumerate(hour_grid):
            if len(day_vals) == 24:
                story.append(HeatBar(days[d_idx], day_vals, width=W - 36*mm))
                story.append(sp(3))
        story.append(sp(10))

    # Biggest commit
    bc = stats.get("biggestCommit")
    if bc:
        story.append(h3("BIGGEST SINGLE COMMIT  💣"))
        story.append(body(
            f'<b>{bc.get("filesChanged", 0)} files changed</b>  —  '
            f'<i>"{bc.get("message", "")}"</i>',
            WHITE, 10
        ))
        story.append(sp(8))

    # Repeated messages
    repeated = stats.get("repeatedMessages", [])
    if repeated:
        story.append(h3("MOST REPEATED COMMIT MESSAGES"))
        rows = [["Message", "Count"]] + [[f'"{m}"', str(c)] for m, c in repeated[:8]]
        story.append(dark_table(rows, [330, 80]))
        story.append(sp(10))

    # ── Author leaderboard ──────────────────────────────────────────
    if top_authors:
        story.append(h2("👥 Team Shame Leaderboard"))
        story.append(hr())
        rows = [["#", "Author", "Commits", "Late Night", "Lazy Msgs", "Score"]]
        medals = ["💀", "🔥", "😬", "😅", "🤡", "👤", "👤", "👤"]
        for i, a in enumerate(top_authors[:8]):
            rows.append([
                medals[i] if i < len(medals) else str(i+1),
                a.get("author", "?"),
                str(a.get("commits",    0)),
                str(a.get("lateNight",  0)),
                str(a.get("lazy",       0)),
                str(a.get("score",      0)),
            ])
        story.append(dark_table(rows, [24, 170, 60, 60, 60, 46]))
        story.append(sp(10))

    # ── Streak ──────────────────────────────────────────────────────
    if streak:
        story.append(h2("🔥 Shame Streak"))
        story.append(hr())
        streak_data = [
            ["Current streak",    f'{streak.get("currentStreak", 0)} days'],
            ["Longest ever",      f'{streak.get("longestStreak", 0)} days'],
            ["Streak period",     f'{streak.get("longestStart","")} → {streak.get("longestEnd","")}'],
        ]
        st = Table(streak_data, colWidths=[160, 250])
        st.setStyle(TableStyle([
            ("TEXTCOLOR",  (0,0),(0,-1), MUTED),
            ("TEXTCOLOR",  (1,0),(1,-1), WHITE),
            ("FONTNAME",   (0,0),(-1,-1),"Helvetica"),
            ("FONTNAME",   (0,0),(0,-1), "Helvetica-Bold"),
            ("FONTSIZE",   (0,0),(-1,-1), 9),
            ("TOPPADDING", (0,0),(-1,-1), 4),
            ("BOTTOMPADDING",(0,0),(-1,-1), 4),
            ("LEFTPADDING",(0,0),(-1,-1), 0),
        ]))
        story.append(st)
        story.append(sp(10))

    story.append(PageBreak())

    # ── PAGE 3: Roast Report ───────────────────────────────────────
    story.append(h2("🔥 This Month's Roast"))
    story.append(hr())

    if roast.get("roast"):
        story.append(h3("THE VERDICT"))
        story.append(body(roast.get("roast", ""), WHITE, 10))
        story.append(sp(10))

    if roast.get("worstCommit"):
        story.append(h3("💀 WORST COMMIT AWARD"))
        story.append(Paragraph(
            f'<i>"{roast["worstCommit"]}"</i>',
            style("quote", 12, YELLOW, TA_CENTER, spaceBefore=4, spaceAfter=4)
        ))
        story.append(sp(10))

    if todos:
        story.append(h3("📝 Stale TODOs"))
        rows = [["File", "Line", "TODO (old)"]]
        for t in todos[:12]:
            rows.append([t.get("file",""), str(t.get("line","")), t.get("message","")])
        story.append(dark_table(rows, [240, 40, 200]))
        story.append(sp(10))

    if branches:
        story.append(h3("🌿 Shameful Branch Names"))
        rows = [["Branch", "Why?"]]
        for b in branches[:12]:
            rows.append([b.get("name",""), b.get("crimes","")])
        story.append(dark_table(rows, [220, 260]))
        story.append(sp(10))

    # ── Page 4: Notes ─────────────────────────────────────────────
    story.append(PageBreak())
    story.append(h2("🧠 Notes & Suggestions"))
    story.append(hr())
    story.append(body("Roast report generated by GitBlame Roast. Use it to find improvements and share with your team.", MUTED, 10))

    # Footer
    story.append(Spacer(1, 14))
    story.append(Paragraph("Generated with ❤️ by GitBlame Roast", style("footer", 8, MUTED, TA_CENTER)))

    doc.build(story, onFirstPage=_drawBackground, onLaterPages=_drawBackground)


def _drawBackground(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BG)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    canvas.restoreState()


def main():
    if len(sys.argv) != 3:
        print("Usage: python3 generateReport.py <data.json> <output.pdf>")
        sys.exit(1)

    data_path = sys.argv[1]
    out_path = sys.argv[2]

    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    build_report(data, out_path)


if __name__ == "__main__":
    main()
