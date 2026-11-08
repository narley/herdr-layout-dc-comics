#!/usr/bin/env python3
"""Turn DC portrait thumbnails into transparent raster animation frames."""
import subprocess
from pathlib import Path

ROOT = Path(__file__).parent
THUMBS = ROOT / "thumbs"
FRAMES = ROOT / "frames"
HEROES = ("batman", "superman", "wonder-woman", "flash", "green-lantern", "aquaman", "cyborg", "harley-quinn", "joker", "catwoman")
OFFSETS = {"rest": (0, 1, 2, 1), "work": (2, 0, 2, 4), "blocked": (0, 2, 0, 2)}

FRAMES.mkdir(exist_ok=True)
for hero in HEROES:
    for state in OFFSETS:
        source = THUMBS / f"{hero}-{state}.svg.png"
        for frame, top in enumerate(OFFSETS[state]):
            filters = f"crop=120:140:0:0,format=rgba,colorkey=0xFFFFFF:0.02:0.1,scale=72:90:flags=lanczos,pad=72:96:0:{top}:color=black@0"
            if state == "blocked" and frame % 2:
                filters += ",eq=brightness=0.06"
            subprocess.run(("ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
                            "-vf", filters, "-frames:v", "1", str(FRAMES / f"{hero}-{state}-{frame}.png")), check=True)
