# DC hero raster animation

The desktop mod uses four transparent PNG frames per character and state at 72×96 pixels. `main.js` advances them every 240 ms; working cards alternate resting and raised-arm poses.

`thumbs/` contains Quick Look rasterizations of the original DC SVG portraits. Run `python3 render.py` to regenerate `frames/` using FFmpeg. The live mod loads only `frames/`, installed as `mods/dc-agents/motion/`.
