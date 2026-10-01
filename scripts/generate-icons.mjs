import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// 32x32 Grid Representation
// 0: Transparent (RGBA: 0, 0, 0, 0)
// 1: Black Fill (RGBA: 18, 18, 20, 255) #121214
// 2: White Feature (RGBA: 255, 255, 255, 255) #ffffff

const GRID_SIZE = 32;
const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));

// Fill inside squircle with black (1)
for (let y = 4; y <= 27; y++) {
  for (let x = 4; x <= 27; x++) {
    // Corner cutouts
    if ((x <= 5 && y <= 5) || (x >= 26 && y <= 5) || (x <= 5 && y >= 26) || (x >= 26 && y >= 26)) {
      continue;
    }
    if ((x <= 4 && y <= 7) || (x >= 27 && y <= 7) || (x <= 4 && y >= 24) || (x >= 27 && y >= 24)) {
      continue;
    }
    if ((x <= 7 && y <= 4) || (x >= 24 && y <= 4) || (x <= 7 && y >= 27) || (x >= 24 && y >= 27)) {
      continue;
    }
    grid[y][x] = 1;
  }
}

// Draw White Squircle Border
function fillRect(x1, y1, w, h, val) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      if (y1 + dy < GRID_SIZE && x1 + dx < GRID_SIZE) {
        grid[y1 + dy][x1 + dx] = val;
      }
    }
  }
}

// Outer Squircle Border
fillRect(10, 4, 12, 2, 2);  // Top bar
fillRect(10, 26, 12, 2, 2); // Bottom bar
fillRect(6, 6, 4, 2, 2);    // Top-left
fillRect(22, 6, 4, 2, 2);   // Top-right
fillRect(6, 24, 4, 2, 2);   // Bottom-left
fillRect(22, 24, 4, 2, 2);  // Bottom-right
fillRect(4, 8, 2, 16, 2);   // Left bar
fillRect(26, 8, 2, 16, 2);  // Right bar

// Face Features
// Left Eye: 3x7 bar
fillRect(9, 11, 3, 7, 2);

// Right Eye: 3x7 bar with hollow center
fillRect(20, 11, 3, 7, 2);
fillRect(21, 13, 1, 2, 1); // black pupil inside right eye

// Center Synapse Node: 2x2
fillRect(15, 14, 2, 2, 2);

// Mouth: 12x2
fillRect(10, 21, 12, 2, 2);

// Pure Node.js PNG Builder
function createPNG(targetWidth, targetHeight) {
  // Nearest neighbor scaling from 32x32
  const rawBytes = Buffer.alloc((targetWidth * 4 + 1) * targetHeight);
  let offset = 0;

  for (let y = 0; y < targetHeight; y++) {
    rawBytes[offset++] = 0; // Filter type: None
    const srcY = Math.floor((y / targetHeight) * GRID_SIZE);

    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.floor((x / targetWidth) * GRID_SIZE);
      const pixelType = grid[srcY][srcX];

      if (pixelType === 0) {
        // Transparent
        rawBytes[offset++] = 0;
        rawBytes[offset++] = 0;
        rawBytes[offset++] = 0;
        rawBytes[offset++] = 0;
      } else if (pixelType === 1) {
        // Black / Deep Onyx
        rawBytes[offset++] = 18;
        rawBytes[offset++] = 18;
        rawBytes[offset++] = 20;
        rawBytes[offset++] = 255;
      } else {
        // Pure White
        rawBytes[offset++] = 255;
        rawBytes[offset++] = 255;
        rawBytes[offset++] = 255;
        rawBytes[offset++] = 255;
      }
    }
  }

  const deflated = zlib.deflateSync(rawBytes, { level: 9 });

  // CRC32 implementation
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c >>> 0;
  }

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crcBuf]);
  }

  // PNG Signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(targetWidth, 0);
  ihdrData.writeUInt32BE(targetHeight, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: RGBA (6)
  ihdrData[10] = 0; // Compression: Deflate (0)
  ihdrData[11] = 0; // Filter: None (0)
  ihdrData[12] = 0; // Interlace: None (0)
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT
  const idatChunk = makeChunk('IDAT', deflated);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Create Windows ICO buffer containing multiple PNG frames
function createICO(sizes) {
  const images = sizes.map(size => ({
    size,
    buffer: createPNG(size, size)
  }));

  const count = images.length;
  // Header: 6 bytes (2 reserved = 0, 2 type = 1 for icon, 2 count)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  // Directory entries: 16 bytes each
  let offset = 6 + count * 16;
  const dirEntries = [];
  const buffers = [];

  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 0); // Width (0 for 256)
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 1); // Height (0 for 256)
    entry.writeUInt8(0, 2); // Color palette: 0
    entry.writeUInt8(0, 3); // Reserved: 0
    entry.writeUInt16LE(1, 4); // Color planes: 1
    entry.writeUInt16LE(32, 6); // Bits per pixel: 32
    entry.writeUInt32LE(img.buffer.length, 8); // Image size in bytes
    entry.writeUInt32LE(offset, 12); // Offset to image data

    dirEntries.push(entry);
    buffers.push(img.buffer);
    offset += img.buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...buffers]);
}

// Generate all required icons
const targets = [
  // Tauri main icons
  { path: 'desktop/src-tauri/icons/icon.png', size: 512 },
  { path: 'desktop/src-tauri/icons/64x64.png', size: 64 },
  { path: 'desktop/src-tauri/icons/32x32.png', size: 32 },
  { path: 'desktop/src-tauri/icons/128x128.png', size: 128 },
  { path: 'desktop/src-tauri/icons/128x128@2x.png', size: 256 },
  // Windows Tiles
  { path: 'desktop/src-tauri/icons/Square30x30Logo.png', size: 30 },
  { path: 'desktop/src-tauri/icons/Square44x44Logo.png', size: 44 },
  { path: 'desktop/src-tauri/icons/Square71x71Logo.png', size: 71 },
  { path: 'desktop/src-tauri/icons/Square89x89Logo.png', size: 89 },
  { path: 'desktop/src-tauri/icons/Square107x107Logo.png', size: 107 },
  { path: 'desktop/src-tauri/icons/Square142x142Logo.png', size: 142 },
  { path: 'desktop/src-tauri/icons/Square150x150Logo.png', size: 150 },
  { path: 'desktop/src-tauri/icons/Square284x284Logo.png', size: 284 },
  { path: 'desktop/src-tauri/icons/Square310x310Logo.png', size: 310 },
  { path: 'desktop/src-tauri/icons/StoreLogo.png', size: 50 },
  // App & Desktop public assets
  { path: 'app/public/logo.png', size: 256 },
  { path: 'desktop/public/logo.png', size: 256 },
];

const rootDir = process.cwd();

for (const t of targets) {
  const fullPath = path.join(rootDir, t.path);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  const png = createPNG(t.size, t.size);
  fs.writeFileSync(fullPath, png);
  console.log(`✓ Wrote ${t.path} (${t.size}x${t.size}, ${png.length} bytes)`);
}

// Generate ICO
const icoBuf = createICO([16, 24, 32, 48, 64, 128, 256]);
const icoTargets = [
  'desktop/src-tauri/icons/icon.ico',
  'desktop/public/favicon.ico',
  'app/public/favicon.ico',
];

for (const icoPath of icoTargets) {
  const fullPath = path.join(rootDir, icoPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, icoBuf);
  console.log(`✓ Wrote ${icoPath} (${icoBuf.length} bytes)`);
}

// Also write favicon.svg
const svgPath = path.join(rootDir, 'assets/synaptodesk-pixel-32.svg');
const svgContent = fs.readFileSync(svgPath, 'utf8');
fs.writeFileSync(path.join(rootDir, 'app/public/favicon.svg'), svgContent);
fs.writeFileSync(path.join(rootDir, 'desktop/public/favicon.svg'), svgContent);
fs.writeFileSync(path.join(rootDir, 'app/public/logo.svg'), svgContent);
fs.writeFileSync(path.join(rootDir, 'desktop/public/logo.svg'), svgContent);
console.log('✓ Wrote web and desktop favicon.svg & logo.svg');
