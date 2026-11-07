"""Render Oldenburg red-A favicon assets (white tile + rounded corners).

Edge (and some Chromium builds) ignore @font-face inside SVG favicons, so the
SVG embeds a pre-rendered Oldenburg PNG instead of live text.
"""

from __future__ import annotations

import base64
import io
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FONT_PATH = ROOT.parent.parent / "elements" / "ui-kit" / "src" / "styles" / "fonts" / "Oldenburg-Regular.ttf"
OUT = ROOT / "public"
RED = (208, 28, 40, 255)  # #D01C28
WHITE = (255, 255, 255, 255)


def fit_font(draw: ImageDraw.ImageDraw, target: float) -> tuple[ImageFont.FreeTypeFont, tuple[int, int, int, int]]:
    lo, hi = 8, int(target * 4)
    font = None
    bbox = None
    for _ in range(28):
        mid = (lo + hi) // 2
        candidate = ImageFont.truetype(str(FONT_PATH), mid)
        box = draw.textbbox((0, 0), "A", font=candidate)
        w, h = box[2] - box[0], box[3] - box[1]
        if max(w, h) <= target:
            lo = mid
            font, bbox = candidate, box
        else:
            hi = mid
    if font is None or bbox is None:
        raise RuntimeError("Failed to fit Oldenburg A")
    return font, bbox


def render_mark(size: int) -> Image.Image:
    """Oldenburg A on a white rounded square (transparent outside the radius)."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    radius = max(2, int(size * 0.22))
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=WHITE)

    font, bbox = fit_font(draw, size * 0.62)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - w) / 2 - bbox[0]
    y = (size - h) / 2 - bbox[1] - size * 0.02
    stroke = max(0, round(size * 0.018))
    draw.text((x, y), "A", font=font, fill=RED, stroke_width=stroke, stroke_fill=RED)
    return img


def write_svg(source: Image.Image) -> None:
    """SVG that paints a baked Oldenburg mark — no @font-face (Edge-safe)."""
    buf = io.BytesIO()
    source.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 32 32">
  <image width="32" height="32" href="data:image/png;base64,{b64}" xlink:href="data:image/png;base64,{b64}"/>
</svg>
"""
    (OUT / "favicon.svg").write_text(svg, encoding="utf-8")


def main() -> None:
    if not FONT_PATH.is_file():
        raise SystemExit(f"Missing font: {FONT_PATH}")
    OUT.mkdir(parents=True, exist_ok=True)

    mark_32 = render_mark(32)
    mark_48 = render_mark(48)
    mark_128 = render_mark(128)

    mark_32.save(OUT / "favicon-32.png")
    mark_48.save(OUT / "favicon-48.png")
    render_mark(180).save(OUT / "apolyx-apple-icon.png")
    render_mark(512).save(OUT / "apolyx-logo.png")
    render_mark(512).save(OUT / "apolyx-icon-512.png")

    icons = [render_mark(s) for s in (16, 32, 48)]
    icons[0].save(
        OUT / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=icons[1:],
    )
    # Higher-res bake keeps the Oldenburg silhouette crisp when SVG is scaled
    write_svg(mark_128.resize((32, 32), Image.Resampling.LANCZOS))
    print("Wrote Oldenburg red-A favicons (Edge-safe SVG) to", OUT)


if __name__ == "__main__":
    main()
