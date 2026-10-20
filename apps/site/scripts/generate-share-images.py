"""
Generates link-preview (Open Graph) images and favicons into public/.

Run from apps/site when the name, role or a game cover changes:
    python3 scripts/generate-share-images.py

Requires Pillow (pip install pillow). The outputs are committed, so building
the site does not need Python.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
FONT = ROOT.parent.parent / "games" / "pong" / "src" / "fonts" / "VCR_OSD_MONO_1.001.ttf"

PAPER = (247, 247, 247)
INK = (21, 21, 21)
MUTED = (92, 92, 92)
ACCENT = (80, 132, 208)

NAME = "André de Queiroz Patrinicola"
ROLE = "Software engineer / Backend / Games"
GAMES = {
    "pong": "Classic Pong",
    "meteor": "Spaceship Meteor",
    "flappy": "Flappy Thing",
    "letritas": "Letritas",
    "angryblocks": "Angry Blocks",
}


def canvas(width: int, height: int) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (width, height), PAPER)
    return image, ImageDraw.Draw(image)


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT), size)


def default_image() -> None:
    image, draw = canvas(1200, 630)
    draw.rectangle([64, 96, 79, 111], fill=ACCENT)
    draw.text((64, 160), "André de Queiroz", font=font(84), fill=INK)
    draw.text((64, 256), "Patrinicola", font=font(84), fill=INK)
    draw.text((64, 392), ROLE.upper(), font=font(30), fill=MUTED)
    # The home page motif: a paddle and a ball.
    draw.rectangle([880, 520, 1040, 535], fill=INK)
    draw.rectangle([1000, 420, 1015, 435], fill=ACCENT)
    image.save(PUBLIC / "images" / "og" / "default.png", optimize=True)


def game_image(slug: str, title: str) -> None:
    image, draw = canvas(1200, 630)
    cover = Image.open(PUBLIC / "images" / "games" / f"{slug}.webp").convert("RGB")
    cover = cover.resize((640, 360), Image.NEAREST)
    left, top = 496, 128
    draw.rectangle([left - 4, top - 4, left + 640 + 3, top + 360 + 3], fill=INK)
    image.paste(cover, (left, top))
    draw.rectangle([64, 128, 79, 143], fill=ACCENT)
    words = title.split(" ")
    for index, word in enumerate(words):
        draw.text((64, 176 + index * 72), word, font=font(60), fill=INK)
    draw.text((64, 544), NAME, font=font(24), fill=MUTED)
    image.save(PUBLIC / "images" / "og" / "games" / f"{slug}.png", optimize=True)


def favicons() -> None:
    """16 × 16 pixel icon: a Pong paddle and ball on ink."""
    icon = Image.new("RGB", (16, 16), INK)
    draw = ImageDraw.Draw(icon)
    draw.rectangle([4, 12, 11, 12], fill=PAPER)
    draw.rectangle([9, 5, 10, 6], fill=ACCENT)
    icon.resize((32, 32), Image.NEAREST).save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32)])
    icon.resize((180, 180), Image.NEAREST).save(PUBLIC / "apple-touch-icon.png", optimize=True)


if __name__ == "__main__":
    (PUBLIC / "images" / "og" / "games").mkdir(parents=True, exist_ok=True)
    default_image()
    for slug, title in GAMES.items():
        game_image(slug, title)
    favicons()
    print("Share images and favicons written to public/.")
