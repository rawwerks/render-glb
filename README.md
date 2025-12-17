# render-glb

Render GLB (glTF 2.0 Binary) 3D models to PNG images using headless WebGL.

## Features

- Headless rendering - no display required
- Auto-fit camera to model bounds
- Configurable output dimensions
- Cross-platform: macOS, Linux, Windows
- JSON output for scripting

## Installation

```bash
npm install -g render-glb
```

Or use directly with npx:

```bash
npx render-glb model.glb output.png
```

## Usage

```bash
render-glb <input.glb> <output.png> [options]

Options:
  --width N    Output image width (default: 512)
  --height N   Output image height (default: 512)
  --help, -h   Show help message
```

### Examples

```bash
# Basic usage
render-glb model.glb output.png

# Custom dimensions
render-glb model.glb output.png --width 1024 --height 1024

# Linux headless (no display)
xvfb-run render-glb model.glb output.png
```

### Output

Returns JSON to stdout:

```json
{
  "success": true,
  "input": "/path/to/model.glb",
  "output": "/path/to/output.png",
  "width": 512,
  "height": 512,
  "size_bytes": 12345,
  "render_time_ms": 150
}
```

## Platform Notes

### macOS
Works directly, no additional setup needed.

### Linux (headless)
Requires xvfb for virtual framebuffer:

```bash
# Ubuntu/Debian
sudo apt-get install xvfb libgl1-mesa-dev

# Run with xvfb-run
xvfb-run render-glb model.glb output.png
```

### Windows
Should work directly with Node.js 18+.

## Dependencies

- [three.js](https://threejs.org/) - 3D rendering engine
- [gl](https://github.com/stackgl/headless-gl) - Headless WebGL
- [node-three-gltf](https://github.com/nicktf/node-three-gltf) - GLB loader for Node.js
- [pngjs](https://github.com/lukeapage/pngjs) - PNG encoding
- [jsdom](https://github.com/jsdom/jsdom) - DOM shim for Three.js

## License

MIT
