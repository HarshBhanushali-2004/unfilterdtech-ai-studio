const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function readPngDimensions(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length < 24) return null
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return null
  if (bytes.toString("ascii", 12, 16) !== "IHDR") return null

  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  }
}

// JPEG "start of frame" markers (baseline through progressive) — the first
// one encountered in the marker stream carries the image dimensions.
const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
])

function readJpegDimensions(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null

  let offset = 2
  while (offset + 9 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1
      continue
    }

    const marker = bytes[offset + 1]

    if (JPEG_SOF_MARKERS.has(marker)) {
      return {
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7),
      }
    }

    // 0xD8 (SOI) / 0xD9 (EOI) / standalone markers carry no length field.
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2
      continue
    }

    const segmentLength = bytes.readUInt16BE(offset + 2)
    offset += 2 + segmentLength
  }

  return null
}

/**
 * Reads width/height straight out of the image's own header bytes — no
 * image-processing dependency needed for this. Supports the two formats
 * Image Providers in this app actually return (PNG from Gemini, JPEG or PNG
 * from HuggingFace/FLUX). Returns `null` for anything else or malformed
 * input rather than throwing — dimensions are a nice-to-have, never a
 * requirement for a generation to count as successful.
 */
export function readImageDimensions(
  bytes: Buffer,
  mimeType: string
): { width: number; height: number } | null {
  if (mimeType.includes("png")) return readPngDimensions(bytes)
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return readJpegDimensions(bytes)

  // Unknown mime type — try both signatures rather than giving up.
  return readPngDimensions(bytes) ?? readJpegDimensions(bytes)
}
