# Third-party assets

Pizza model: **Pizza** by **Rigsters**.

- Source: https://sketchfab.com/3d-models/pizza-40d50989fec1460f8838b608d999ccd0
- Author: https://sketchfab.com/rigsters
- License: Creative Commons Attribution 4.0, https://creativecommons.org/licenses/by/4.0/
- Retrieved through the AllenAI Objaverse mirror of that asset.
- Modifications: removed the serving board; centered and normalized geometry in Blender; restored the diffuse texture locally with Real-ESRGAN and a 40% blend with a Lanczos upsample of the original. Rendering, lighting, and camera motion are new.

The original diffuse texture is 1024×1024. Its restored 4096×4096 derivative is an upscale, not a new 4K scan. Extreme macro quality remains limited by the source. Preserve model attribution, the license link, and modification notice when redistributing this demo or the modified asset.

Three.js: MIT, https://github.com/mrdoob/three.js/blob/dev/LICENSE

GSAP: https://gsap.com/community/standard-license/

Real-ESRGAN: BSD 3-Clause, https://github.com/xinntao/Real-ESRGAN/blob/master/LICENSE

## Studio image

`media/pizza-studio.png` was rendered locally in Blender 4.5.14 with Cycles, using the modified Rigsters model above. The camera, lighting, transparent background and shadow catcher are authored in `render_presentation_still.py`. The model attribution and CC BY modification notice also apply to this rendered derivative. Its origin is embedded in PNG metadata. No AI image-generation service was used.

## Fonts

- Literata (roman and italic): Google Fonts / TypeTogether, https://github.com/google/fonts/tree/main/ofl/literata
- Golos Text: Google Fonts / Paratype, https://github.com/google/fonts/tree/main/ofl/golostext
- Both use the SIL Open Font License 1.1. The original notices are preserved as `fonts/literata-OFL.txt` and `fonts/golostext-OFL.txt`.
- The self-hosted WOFF2 files are locally converted Latin/Cyrillic subsets, including Russian punctuation and the rouble sign. Preserve the OFL notices when distributing them.

## Browser compression and presentation derivatives

`pizza-web.glb` uses Meshopt geometry compression and WebP encoding of the existing maps, without resizing their pixel dimensions. Meshoptimizer is MIT licensed; the complete notice is in `MESHOPTIMIZER-LICENSE.txt`. The Three.js MIT notice is in `THREE-LICENSE.txt`. These changes do not produce a higher-resolution original scan.

The WebP poster and `media/menu-prosciutto.webp` (now used only in the preparation gallery) are local derivatives of the modified Rigsters scan; the same CC BY 4.0 credit and modification notice apply. `media/FARO-teaser.mp4` is a local Blender EEVEE render: 192 frames, 1600×900, 24fps, static pizza and moving camera, encoded H.264 with FFmpeg. Model credit appears inside the video.

## Menu and preparation images

The current menu uses six matching AI-generated illustrations in `media/menu-session/`, produced with the built-in OpenAI image generator, without API CLI or paid third-party subscriptions. The owner's selected pepperoni image was the master reference; all five other items preserve its camera/light/crust composition and vary toppings. Exact prompts and origin are preserved in `prompts.json`, PNG metadata and WebP sidecars. These illustrate fictional dishes, rather than documenting a real restaurant or the physical scanned model. The owner-selected original remains unchanged.

Current preparation photographs use the free Unsplash License: Cohen Berg (dough) and Adhitya Sibikumar (oven). Exact URLs, authors, license links and modifications are recorded in `photo-info.json` and visitor-facing `credits.html`.

Retired mixed menu source notices remain in `photo-info.json` with `active:false`: Ivan Torres (margherita), ABHISHEK HAJARE (mushroom), Shoeib Abolhassani (sausage), under the Unsplash License; www.snack-nieuws.nl (four cheeses), CC BY 2.0 via Wikimedia Commons. Unused converted derivatives have been removed; cached stock originals and the owner's selected original remain intact. All active images and runtime assets are self-hosted during use.
