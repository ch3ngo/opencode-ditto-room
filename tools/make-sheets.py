#!/usr/bin/env python3
"""Compose labelled contact sheets from the local scene previews.

Run tools/render-scenes.mjs first. This script only lays out the PNGs and draws
text outside the pixel art; it does not render the room itself.
"""
from pathlib import Path
import shutil

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PREVIEWS = ROOT / "previews"
PUBLIC = ROOT / "docs"

SCENES = [
    ("Living Room", "living-room"),
    ("Mountain Meadow", "mountain-meadow"),
    ("Japanese Garden", "japanese-garden"),
    ("Office", "office"),
    ("Arcade", "arcade"),
    ("Football Stadium", "football-stadium"),
]

FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")
TITLE_FONT = FONT_DIR / "DejaVuSans-Bold.ttf"
BODY_FONT = FONT_DIR / "DejaVuSans.ttf"

BG = (242, 240, 234)
INK = (38, 38, 38)
MUTED = (96, 96, 96)
ACCENT = (170, 120, 90)

MARGIN = 28
GAP = 18
LABEL_GAP = 6
LABEL_HEIGHT = 30


def font(path, size):
    try:
        return ImageFont.truetype(str(path), size)
    except OSError:
        return ImageFont.load_default()


def make_sheet(name, title, subtitle, prefix, geometry):
    cols = 3
    rows = 2
    images = []
    for label, slug in SCENES:
        path = PREVIEWS / f"{prefix}-{slug}-{geometry}.png"
        if not path.exists():
            raise SystemExit(f"missing preview: {path}")
        images.append((label, Image.open(path).convert("RGB")))

    cell_w = max(img.width for _, img in images)
    cell_h = LABEL_HEIGHT + LABEL_GAP + max(img.height for _, img in images)
    title_h = 38
    subtitle_h = 24
    header_h = title_h + subtitle_h + 10
    width = MARGIN * 2 + cols * cell_w + (cols - 1) * GAP
    height = MARGIN * 2 + header_h + rows * cell_h + (rows - 1) * GAP
    sheet = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(sheet)

    title_font = font(TITLE_FONT, 27)
    subtitle_font = font(BODY_FONT, 15)
    label_font = font(TITLE_FONT, 20)

    draw.text((MARGIN, MARGIN), title, font=title_font, fill=INK)
    draw.text((MARGIN, MARGIN + title_h), subtitle, font=subtitle_font, fill=MUTED)
    draw.line(
        (MARGIN, MARGIN + header_h - 8, width - MARGIN, MARGIN + header_h - 8),
        fill=ACCENT,
        width=1,
    )

    for index, (label, image) in enumerate(images):
        col = index % cols
        row = index // cols
        x = MARGIN + col * (cell_w + GAP)
        y = MARGIN + header_h + row * (cell_h + GAP)
        draw.text((x, y), label, font=label_font, fill=INK)
        sheet.paste(image, (x, y + LABEL_HEIGHT + LABEL_GAP))

    out = PREVIEWS / name
    sheet.save(out, optimize=True)
    print(out)
    return out


scene_tall = make_sheet(
    "contact-sheet-scenes-tall.png",
    "Ditto Room scene previews",
    "Tall geometry: 20 text rows, 22 px floor. All six scenes run in the plugin; choose one with OC_DITTO_SCENE.",
    "scene",
    "tall",
)
make_sheet(
    "contact-sheet-scenes-compact.png",
    "Ditto Room scene previews, compact",
    "Compact geometry: 15 text rows, 16 px floor. Same art contract, trimmed wall only.",
    "scene",
    "compact",
)
ditto_tall = make_sheet(
    "contact-sheet-dittos-tall.png",
    "Ditto scale, foot shadows and depth",
    "Pink agent in front of a blue companion. The pair is drawn at different feet rows, so the nearer Ditto occludes the farther one. Tall geometry.",
    "dittos",
    "tall",
)
make_sheet(
    "contact-sheet-dittos-compact.png",
    "Ditto scale, foot shadows and depth, compact",
    "The same pair at the compact 15-row geometry. Foot shadows sit on the ground row below each Ditto.",
    "dittos",
    "compact",
)

# Tracked public previews. The full set stays local under previews/; these two
# sanitized tall sheets are the ones the README embeds.
PUBLIC.mkdir(exist_ok=True)
shutil.copyfile(scene_tall, PUBLIC / "scenes-contact-sheet.png")
shutil.copyfile(ditto_tall, PUBLIC / "dittos-contact-sheet.png")
print(PUBLIC / "scenes-contact-sheet.png")
print(PUBLIC / "dittos-contact-sheet.png")
