const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { describe, it } = require("node:test");
const assert = require("node:assert");

const CLI = path.join(__dirname, "..", "src", "index.cjs");
const FIXTURES = path.join(__dirname, "fixtures");

describe("render-glb", () => {
  it("renders test_plate.glb to valid PNG", () => {
    const input = path.join(FIXTURES, "test_plate.glb");
    const output = `/tmp/render-glb-test-plate-${Date.now()}.png`;

    const result = execFileSync("node", [CLI, input, output], {
      encoding: "utf-8",
    });
    const json = JSON.parse(result.trim());

    assert.strictEqual(json.success, true);
    assert.strictEqual(json.width, 512);
    assert.strictEqual(json.height, 512);
    assert.ok(json.size_bytes > 0);
    assert.ok(fs.existsSync(output));

    // Verify PNG header
    const buffer = fs.readFileSync(output);
    assert.strictEqual(buffer[0], 0x89);
    assert.strictEqual(buffer[1], 0x50); // P
    assert.strictEqual(buffer[2], 0x4e); // N
    assert.strictEqual(buffer[3], 0x47); // G

    fs.unlinkSync(output);
  });

  it("renders test_hole.glb to valid PNG", () => {
    const input = path.join(FIXTURES, "test_hole.glb");
    const output = `/tmp/render-glb-test-hole-${Date.now()}.png`;

    const result = execFileSync("node", [CLI, input, output], {
      encoding: "utf-8",
    });
    const json = JSON.parse(result.trim());

    assert.strictEqual(json.success, true);
    assert.ok(fs.existsSync(output));

    fs.unlinkSync(output);
  });

  it("supports custom dimensions", () => {
    const input = path.join(FIXTURES, "test_plate.glb");
    const output = `/tmp/render-glb-test-size-${Date.now()}.png`;

    const result = execFileSync(
      "node",
      [CLI, input, output, "--width", "256", "--height", "256"],
      { encoding: "utf-8" }
    );
    const json = JSON.parse(result.trim());

    assert.strictEqual(json.success, true);
    assert.strictEqual(json.width, 256);
    assert.strictEqual(json.height, 256);

    fs.unlinkSync(output);
  });

  it("returns error for missing input file", () => {
    const output = `/tmp/render-glb-test-missing-${Date.now()}.png`;

    try {
      execFileSync("node", [CLI, "/nonexistent/file.glb", output], {
        encoding: "utf-8",
        stdio: "pipe",
      });
      assert.fail("Should have thrown");
    } catch (err) {
      const json = JSON.parse(err.stderr.trim());
      assert.strictEqual(json.success, false);
      assert.ok(json.error.includes("not found"));
    }
  });

  it("shows help with --help flag", () => {
    const result = execFileSync("node", [CLI, "--help"], { encoding: "utf-8" });
    assert.ok(result.includes("render-glb"));
    assert.ok(result.includes("--width"));
    assert.ok(result.includes("--height"));
  });
});
