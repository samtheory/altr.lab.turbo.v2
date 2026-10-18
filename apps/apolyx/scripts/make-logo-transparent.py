"""Remove black background from Apolyx logo and emit favicon/logo assets."""

from __future__ import annotations

import os
from PIL import Image

OUT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(OUT_DIR, "public")
APP_DIR = os.path.join(OUT_DIR, "src", "app")
# Prefer a short-path copy inside the app (Cursor asset paths can exceed MAX_PATH).
SRC_CANDIDATES = [
    os.path.join(OUT_DIR, "scripts", "assets", "apolyx-logo-source.png"),
    os.path.join(PUBLIC, "apolyx-logo-source.png"),
]

HARD = 18
SOFT = 42


def luminance(r: int, g: int, b: int) -> float:
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def resolve_source() -> str:
    for path in SRC_CANDIDATES:
        if os.path.isfile(path):
            return path
    raise FileNotFoundError(
        "Missing apolyx-logo-source.png — copy the uploaded mark into apps/apolyx/public/"
    )


def main() -> None:
    os.makedirs(PUBLIC, exist_ok=True)

    src = resolve_source()
    print("source", src)
    img = Image.open(src).convert("RGBA")
    pixels = img.load()
    w, h = img.size

    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            L = luminance(r, g, b)
            mx = max(r, g, b)
            mn = min(r, g, b)
            chroma = mx - mn
            if L <= HARD and chroma < 20:
                pixels[x, y] = (r, g, b, 0)
            elif L < SOFT and chroma < 35:
                t = (L - HARD) / (SOFT - HARD)
                alpha = int(max(0, min(255, a * t)))
                pixels[x, y] = (r, g, b, alpha)

    bbox = img.getbbox()
    if bbox:
        pad = max(8, int(min(w, h) * 0.04))
        left, top, right, bottom = bbox
        left = max(0, left - pad)
        top = max(0, top - pad)
        right = min(w, right + pad)
        bottom = min(h, bottom + pad)
        cropped = img.crop((left, top, right, bottom))
    else:
        cropped = img

    cw, ch = cropped.size
    side = max(cw, ch)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(cropped, ((side - cw) // 2, (side - ch) // 2), cropped)

    logo_path = os.path.join(PUBLIC, "apolyx-logo.png")
    square.save(logo_path, "PNG", optimize=True)
    print("logo", square.size, logo_path)

    def resize(size: int, path: str) -> None:
        out = square.resize((size, size), Image.Resampling.LANCZOS)
        out.save(path, "PNG", optimize=True)
        print("wrote", size, path)

    resize(32, os.path.join(APP_DIR, "icon.png"))
    resize(180, os.path.join(APP_DIR, "apple-icon.png"))
    resize(180, os.path.join(PUBLIC, "apolyx-apple-icon.png"))
    resize(512, os.path.join(PUBLIC, "apolyx-icon-512.png"))

    ico_sizes = [(16, 16), (32, 32), (48, 48)]
    ico_imgs = [square.resize(s, Image.Resampling.LANCZOS) for s in ico_sizes]
    for ico_path in (
        os.path.join(APP_DIR, "favicon.ico"),
        os.path.join(PUBLIC, "favicon.ico"),
    ):
        ico_imgs[0].save(ico_path, format="ICO", sizes=ico_sizes, append_images=ico_imgs[1:])
        print("ico", ico_path)

    sample = Image.open(logo_path)
    alpha = sample.split()[-1]
    hist = alpha.histogram()
    print("mode", sample.mode, "size", sample.size)
    print("transparent", hist[0], "opaqueish", sum(hist[200:]))


if __name__ == "__main__":
    main()
