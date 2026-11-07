"""Build the gallery copy of FARO's GLB with smaller textures."""

from io import BytesIO
import json
from pathlib import Path
import struct

from PIL import Image


def pad(data, fill=b"\0"):
    return data + fill * (-len(data) % 4)


root = Path(__file__).resolve().parents[1] / "public/assets/models"
source = (root / "pizza-web.glb").read_bytes()
json_length = struct.unpack_from("<I", source, 12)[0]
document = json.loads(source[20:20 + json_length])
original = source[28 + json_length:]
binary = bytearray()


def repack(view, image_limit=None):
    start = view.get("byteOffset", 0)
    data = original[start:start + view["byteLength"]]
    if image_limit:
        with Image.open(BytesIO(data)) as image:
            image.thumbnail((image_limit, image_limit), Image.Resampling.LANCZOS)
            output = BytesIO()
            image.save(output, format="WEBP", quality=87, method=6)
            data = output.getvalue()
    view["byteOffset"] = len(binary)
    view["byteLength"] = len(data)
    binary.extend(pad(data))


base_color = document["materials"][0]["pbrMetallicRoughness"]["baseColorTexture"]["index"]
diffuse = document["textures"][base_color]["extensions"]["EXT_texture_webp"]["source"]
for index, image in enumerate(document["images"]):
    repack(document["bufferViews"][image["bufferView"]], 1024 if index == diffuse else 512)
for view in document["bufferViews"]:
    compressed = view.get("extensions", {}).get("EXT_meshopt_compression")
    if compressed:
        repack(compressed)

document["buffers"][0]["byteLength"] = len(binary)
metadata = pad(json.dumps(document, separators=(",", ":")).encode(), b" ")
header = struct.pack("<4sII", b"glTF", 2, 28 + len(metadata) + len(binary))
chunks = struct.pack("<I4s", len(metadata), b"JSON") + metadata
chunks += struct.pack("<I4s", len(binary), b"BIN\0") + binary
(root / "gallery-pizza.glb").write_bytes(header + chunks)
