import base64
import hashlib
import json
import sys
from pathlib import Path
from urllib.request import urlopen

from PIL import Image


def main():
    output = Path("artifacts/sample-sources")
    output.mkdir(parents=True, exist_ok=True)
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else output / "nist-original.png"
    if not source.exists():
        url = "https://upload.wikimedia.org/wikipedia/commons/b/b8/NIST_SD-19_f1002_33.png"
        with urlopen(url, timeout=30) as response:
            source.write_bytes(response.read())
    if (
        hashlib.sha256(source.read_bytes()).hexdigest()
        != "ecf6f092053dcb706c6e9e53260fc4d1cc9d7634110c80bcee4a9450cd678925"
    ):
        raise ValueError("NIST source checksum changed")
    original = Image.open(source).convert("RGB")
    row = original.crop((200, 1760, 2340, 2050))
    boxes = {
        "B": (146, 167, 208, 230),
        "E": (1318, 180, 1383, 234),
        "H": (386, 177, 434, 232),
        "J": (60, 157, 148, 228),
        "L": (1188, 186, 1238, 230),
        "O": (691, 182, 746, 233),
    }
    results = {}
    proof = Image.new("RGB", (144 * len(boxes), 144), "white")
    for index, (character, box) in enumerate(boxes.items()):
        letter = row.crop(box)
        cell = Image.new("RGB", (144, 144), "white")
        cell.paste(letter, ((144 - letter.width) // 2, 112 - letter.height))
        path = output / f"{character}.png"
        cell.save(path)
        proof.paste(cell, (index * 144, 0))
        results[character] = {
            "source": "data:image/png;base64,"
            + base64.b64encode(path.read_bytes()).decode(),
            "gray": list(cell.convert("L").tobytes()),
        }
    Path("public/samples").mkdir(parents=True, exist_ok=True)
    proof.save("public/samples/paper-source.png")
    (output / "letters.json").write_text(json.dumps(results))
    print(
        f"Prepared six NIST letters. Source SHA256 {hashlib.sha256(source.read_bytes()).hexdigest()}"
    )


if __name__ == "__main__":
    main()
