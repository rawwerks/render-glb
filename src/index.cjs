#!/usr/bin/env node
/**
 * render-glb - Render GLB 3D models to PNG images
 *
 * Uses headless WebGL (via the 'gl' package) and Three.js for rendering.
 * Works on macOS, Linux (with xvfb), and Windows.
 *
 * Usage: render-glb <input.glb> <output.png> [--width N] [--height N]
 */

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
let inputPath = null;
let outputPath = null;
let width = 1024;
let height = 1024;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--width" && args[i + 1]) {
    width = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === "--height" && args[i + 1]) {
    height = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === "--help" || args[i] === "-h") {
    console.log(`render-glb - Render GLB 3D models to PNG images

Usage: render-glb <input.glb> <output.png> [options]

Options:
  --width N    Output image width (default: 1024)
  --height N   Output image height (default: 1024)
  --help, -h   Show this help message

Examples:
  render-glb model.glb output.png
  render-glb model.glb output.png --width 1024 --height 1024

On Linux without a display, use xvfb-run:
  xvfb-run render-glb model.glb output.png
`);
    process.exit(0);
  } else if (!inputPath) {
    inputPath = args[i];
  } else if (!outputPath) {
    outputPath = args[i];
  }
}

if (!inputPath || !outputPath) {
  console.error(JSON.stringify({
    success: false,
    error: "Usage: render-glb <input.glb> <output.png> [--width N] [--height N]"
  }));
  process.exit(1);
}

// Resolve paths relative to cwd
inputPath = path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
outputPath = path.isAbsolute(outputPath) ? outputPath : path.resolve(process.cwd(), outputPath);

if (!fs.existsSync(inputPath)) {
  console.error(JSON.stringify({ success: false, error: `Input file not found: ${inputPath}` }));
  process.exit(1);
}

async function render() {
  const startTime = Date.now();

  // Setup DOM environment for Three.js
  const { JSDOM } = require("jsdom");
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
  global.document = dom.window.document;
  global.window = dom.window;
  global.HTMLCanvasElement = dom.window.HTMLCanvasElement;
  global.ImageData = dom.window.ImageData;

  // Import rendering dependencies
  const gl = require("gl");
  const THREE = require("three");
  const { GLTFLoader } = require("node-three-gltf");
  const { PNG } = require("pngjs");

  // Create headless WebGL context
  const glCtx = gl(width, height, { preserveDrawingBuffer: true });

  // Setup Three.js renderer
  const renderer = new THREE.WebGLRenderer({ context: glCtx, antialias: true });
  renderer.setSize(width, height);
  renderer.setClearColor(0xf0f0f0, 1); // Light gray background

  // Setup scene (camera created after model loads to set proper near/far)
  const scene = new THREE.Scene();

  // Load GLB file
  const loader = new GLTFLoader();
  const glbBuffer = fs.readFileSync(inputPath);
  const glbArrayBuffer = glbBuffer.buffer.slice(glbBuffer.byteOffset, glbBuffer.byteOffset + glbBuffer.byteLength);

  const gltf = await new Promise((resolve, reject) => {
    loader.parse(glbArrayBuffer, "", resolve, reject);
  });

  scene.add(gltf.scene);

  // Auto-fit camera to model bounds
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  // Handle tiny models: ensure minimum practical size for camera
  const effectiveSize = Math.max(maxDim, 0.001);
  const distance = effectiveSize * 2.5;

  // Dynamic near/far planes based on model size (prevents clipping tiny models)
  const near = effectiveSize * 0.01;
  const far = effectiveSize * 100;

  const camera = new THREE.PerspectiveCamera(50, width / height, near, far);

  // Position camera at isometric angle
  camera.position.set(
    center.x + distance * 0.7,
    center.y + distance * 0.5,
    center.z + distance * 0.7
  );
  camera.lookAt(center);

  // Setup lighting
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(1, 2, 1);
  scene.add(dirLight);

  const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
  dirLight2.position.set(-1, 0.5, -1);
  scene.add(dirLight2);

  scene.add(new THREE.AmbientLight(0x404040, 1));

  // Render the scene
  renderer.render(scene, camera);

  // Read pixels from GL context
  const pixels = new Uint8Array(width * height * 4);
  glCtx.readPixels(0, 0, width, height, glCtx.RGBA, glCtx.UNSIGNED_BYTE, pixels);

  // Flip Y axis (OpenGL origin is bottom-left, PNG is top-left)
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = ((height - 1 - y) * width + x) * 4;
      const dstIdx = (y * width + x) * 4;
      png.data[dstIdx] = pixels[srcIdx];
      png.data[dstIdx + 1] = pixels[srcIdx + 1];
      png.data[dstIdx + 2] = pixels[srcIdx + 2];
      png.data[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }

  // Write PNG file
  const pngBuffer = PNG.sync.write(png);
  fs.writeFileSync(outputPath, pngBuffer);

  return {
    success: true,
    input: inputPath,
    output: outputPath,
    width,
    height,
    size_bytes: pngBuffer.length,
    render_time_ms: Date.now() - startTime
  };
}

render()
  .then(result => { console.log(JSON.stringify(result)); process.exit(0); })
  .catch(err => { console.error(JSON.stringify({ success: false, error: err.message })); process.exit(1); });
