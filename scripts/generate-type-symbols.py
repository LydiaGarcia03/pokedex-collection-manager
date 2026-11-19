"""
generate-type-symbols.py

Builds the big type symbol shown in the corner of the desktop Pokémon detail
(`.pokemon-detail-hero__symbol` in src/styles.css) from the type icons.

The icons in public/images/types/type-{type}.png are a colored disc with the symbol
drawn in white. This keeps only the white symbol, as the alpha channel of a white
512px PNG (used as a CSS mask), so it can be tinted and scaled up. The 128px icon is
upscaled 4x, blurred and re-thresholded so the enlarged edges stay sharp.

Run from the pokedex-static root (needs Pillow: pip install pillow):
    python scripts/generate-type-symbols.py

Output: public/images/types/symbol-{type}.png (18 files, ~10KB each). Re-run only if
the type icons change.
"""

from pathlib import Path

from PIL import Image, ImageFilter

TYPES_DIR = Path(__file__).resolve().parent.parent / 'public' / 'images' / 'types'
SCALE = 4
# Pixels at least this white count as symbol; between this and pure white they fade in.
WHITE_THRESHOLD = 150


def symbol_alpha(icon: Image.Image) -> Image.Image:
    alpha = Image.new('L', icon.size)
    source, target = icon.load(), alpha.load()
    for y in range(icon.size[1]):
        for x in range(icon.size[0]):
            r, g, b, a = source[x, y]
            whiteness = max(0, min(r, g, b) - WHITE_THRESHOLD) / (255 - WHITE_THRESHOLD)
            target[x, y] = int(a * min(1, whiteness))
    return alpha


def sharpen_upscaled(alpha: Image.Image) -> Image.Image:
    size = (alpha.size[0] * SCALE, alpha.size[1] * SCALE)
    alpha = alpha.resize(size, Image.BICUBIC).filter(ImageFilter.GaussianBlur(SCALE * 0.6))
    # Steep ramp around the middle: a crisp edge with ~2px of anti-aliasing.
    return alpha.point(lambda v: max(0, min(255, (v - 128) * 6 + 128)))


def main() -> None:
    icons = sorted(TYPES_DIR.glob('type-*.png'))
    for icon_path in icons:
        type_name = icon_path.stem.removeprefix('type-')
        alpha = sharpen_upscaled(symbol_alpha(Image.open(icon_path).convert('RGBA')))
        symbol = Image.new('RGBA', alpha.size, (255, 255, 255, 0))
        symbol.putalpha(alpha)
        out_path = TYPES_DIR / f'symbol-{type_name}.png'
        symbol.save(out_path, 'PNG', optimize=True)
        print(f'Wrote {out_path.name} ({out_path.stat().st_size // 1024} KB)')
    print(f'\nDone: {len(icons)} symbols.')


if __name__ == '__main__':
    main()
