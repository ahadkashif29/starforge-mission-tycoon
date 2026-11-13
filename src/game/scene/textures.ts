import * as THREE from "three";

// Procedural canvas textures, created lazily on the client and cached.
const cache = new Map<string, THREE.Texture>();

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function valueNoise(seed: number, w: number, h: number, cell: number) {
  const r = rng(seed);
  const gw = Math.ceil(w / cell) + 2;
  const gh = Math.ceil(h / cell) + 2;
  const grid = Array.from({ length: gw * gh }, () => r());
  return (x: number, y: number) => {
    const gx = x / cell;
    const gy = y / cell;
    const x0 = Math.floor(gx) % (gw - 1);
    const y0 = Math.floor(gy) % (gh - 1);
    const fx = gx - Math.floor(gx);
    const fy = gy - Math.floor(gy);
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const g = (i: number, j: number) => grid[j * gw + i] ?? 0;
    const a = g(x0, y0) + (g(x0 + 1, y0) - g(x0, y0)) * sx;
    const b = g(x0, y0 + 1) + (g(x0 + 1, y0 + 1) - g(x0, y0 + 1)) * sx;
    return a + (b - a) * sy;
  };
}

function make(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  cache.set(key, tex);
  return tex;
}

function grain(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, seed: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const r = rng(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * amount;
    img.data[i] = (img.data[i] ?? 0) + n;
    img.data[i + 1] = (img.data[i + 1] ?? 0) + n;
    img.data[i + 2] = (img.data[i + 2] ?? 0) + n;
  }
  ctx.putImageData(img, 0, 0);
}

/** Insulation foam (orange) with ring seams. */
export function foamTexture() {
  return make("foam", 512, 256, (ctx) => {
    const n = valueNoise(7, 512, 256, 18);
    const img = ctx.createImageData(512, 256);
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 512; x++) {
        const v = n(x, y) * 0.6 + n(x * 3, y * 3) * 0.4;
        const i = (y * 512 + x) * 4;
        img.data[i] = 196 + v * 40;
        img.data[i + 1] = 104 + v * 30;
        img.data[i + 2] = 48 + v * 18;
        img.data[i + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
    ctx.fillStyle = "rgba(60,30,10,0.45)";
    for (const y of [64, 128, 192]) ctx.fillRect(0, y, 512, 3);
    ctx.fillStyle = "rgba(255,230,200,0.12)";
    for (let x = 0; x < 512; x += 32) ctx.fillRect(x, 0, 1, 256);
  });
}

/** White panelled hull with rivets and roll pattern. */
export function hullTexture(variant: "white" | "roll" = "white") {
  return make(`hull-${variant}`, 512, 256, (ctx) => {
    ctx.fillStyle = "#e7e4dc";
    ctx.fillRect(0, 0, 512, 256);
    if (variant === "roll") {
      ctx.fillStyle = "#1c1d21";
      for (let i = 0; i < 4; i++) ctx.fillRect(i * 128, i % 2 ? 0 : 128, 64, 128);
    }
    ctx.strokeStyle = "rgba(40,40,48,0.35)";
    ctx.lineWidth = 2;
    for (let x = 0; x <= 512; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    for (let y = 0; y <= 256; y += 85) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(30,30,36,0.5)";
    for (let x = 6; x < 512; x += 16)
      for (const y of [4, 81, 89, 166, 174, 251]) ctx.fillRect(x, y, 2, 2);
    grain(ctx, 512, 256, 14, 3);
  });
}

export function goldFoilTexture() {
  return make("gold", 256, 256, (ctx) => {
    const n = valueNoise(11, 256, 256, 9);
    const img = ctx.createImageData(256, 256);
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) {
        const v = Math.abs(n(x, y) - n(x * 2.3, y * 2.3));
        const i = (y * 256 + x) * 4;
        img.data[i] = 200 + v * 55;
        img.data[i + 1] = 150 + v * 60;
        img.data[i + 2] = 50 + v * 40;
        img.data[i + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
  });
}

export function solarTexture() {
  return make("solar", 256, 128, (ctx) => {
    ctx.fillStyle = "#14213d";
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = "#5a7bb5";
    ctx.lineWidth = 1;
    for (let x = 0; x <= 256; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 128);
      ctx.stroke();
    }
    for (let y = 0; y <= 128; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
  });
}

/** Concrete deck with grid, scorch and hazard border. */
export function deckTexture() {
  return make("deck", 1024, 512, (ctx) => {
    const n = valueNoise(5, 1024, 512, 40);
    const img = ctx.createImageData(1024, 512);
    for (let y = 0; y < 512; y++)
      for (let x = 0; x < 1024; x++) {
        const v = n(x, y) * 0.7 + n(x * 4, y * 4) * 0.3;
        const dx = (x - 512) / 512;
        const dy = (y - 256) / 256;
        const scorch = Math.max(0, 1 - Math.sqrt(dx * dx * 6 + dy * dy * 3)) * 70;
        const i = (y * 1024 + x) * 4;
        const base = 88 + v * 42 - scorch;
        img.data[i] = base;
        img.data[i + 1] = base + 2;
        img.data[i + 2] = base + 6;
        img.data[i + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
    ctx.strokeStyle = "rgba(20,20,24,0.55)";
    ctx.lineWidth = 3;
    for (let x = 0; x <= 1024; x += 68) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y <= 512; y += 68) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }
    // hazard stripes border
    const stripe = (x: number, y: number, w: number, h: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#e0a526";
      for (let s = -h; s < w + h; s += 36) {
        ctx.beginPath();
        ctx.moveTo(x + s, y);
        ctx.lineTo(x + s + 18, y);
        ctx.lineTo(x + s + 18 - h, y + h);
        ctx.lineTo(x + s - h, y + h);
        ctx.fill();
      }
      ctx.restore();
    };
    stripe(0, 0, 1024, 22);
    stripe(0, 490, 1024, 22);
    grain(ctx, 1024, 512, 18, 9);
  });
}

export function rockTexture() {
  return make("rock", 256, 256, (ctx) => {
    const n = valueNoise(21, 256, 256, 14);
    const img = ctx.createImageData(256, 256);
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) {
        const v = n(x, y) * 0.6 + n(x * 3, y * 3) * 0.4;
        const i = (y * 256 + x) * 4;
        img.data[i] = 70 + v * 60;
        img.data[i + 1] = 62 + v * 52;
        img.data[i + 2] = 56 + v * 44;
        img.data[i + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
  });
}

type PlanetKind = "earth" | "mars" | "ice";

export function planetTexture(kind: PlanetKind) {
  return make(`planet-${kind}`, 1024, 512, (ctx) => {
    const n = valueNoise(kind === "earth" ? 2 : kind === "mars" ? 4 : 8, 1024, 512, 70);
    const d = valueNoise(13, 1024, 512, 18);
    const img = ctx.createImageData(1024, 512);
    for (let y = 0; y < 512; y++)
      for (let x = 0; x < 1024; x++) {
        const v = n(x, y) * 0.65 + d(x, y) * 0.35;
        const lat = Math.abs(y - 256) / 256;
        const i = (y * 1024 + x) * 4;
        let r = 0, g = 0, b = 0;
        if (kind === "earth") {
          if (lat > 0.86) [r, g, b] = [235, 240, 245];
          else if (v > 0.55) [r, g, b] = [70 + v * 70, 110 + v * 50, 50 + v * 20];
          else [r, g, b] = [18 + v * 30, 60 + v * 60, 120 + v * 70];
          const cloud = d(x * 1.7 + 300, y * 1.7);
          if (cloud > 0.68) [r, g, b] = [r * 0.3 + 178, g * 0.3 + 178, b * 0.3 + 178];
        } else if (kind === "mars") {
          [r, g, b] = [150 + v * 70, 70 + v * 40, 40 + v * 20];
          if (lat > 0.9) [r, g, b] = [230, 220, 210];
        } else {
          const band = Math.sin(y * 0.06 + v * 3) * 0.5 + 0.5;
          [r, g, b] = [120 + band * 60, 170 + band * 50, 200 + band * 40];
        }
        img.data[i] = r;
        img.data[i + 1] = g;
        img.data[i + 2] = b;
        img.data[i + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
  });
}
