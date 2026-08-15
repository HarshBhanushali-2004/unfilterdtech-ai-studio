/**
 * Minimal ZIP (STORED — uncompressed) archive writer. Used by the carousel
 * download route (Phase 1B, AGENTS.md §17) to bundle already-compressed
 * PNG slides without adding a ZIP dependency: PNG bytes don't shrink
 * meaningfully under DEFLATE, so STORED (no re-compression) is both simpler
 * and just as small. Implements only what a real ZIP reader needs — one
 * local file header + data per entry, a central directory, and the end
 * record — per the standard PKZIP APPNOTE format.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(data: Buffer): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function u16(value: number): Buffer {
  const buf = Buffer.alloc(2)
  buf.writeUInt16LE(value, 0)
  return buf
}

function u32(value: number): Buffer {
  const buf = Buffer.alloc(4)
  buf.writeUInt32LE(value >>> 0, 0)
  return buf
}

export type ZipEntry = { name: string; data: Buffer }

/** DOS date/time fields ZIP requires per entry — a fixed, valid value (1980-01-01 00:00) is fine for a generated download; no reader cares about it here. */
const DOS_TIME = 0
const DOS_DATE = 0x21

export function buildZip(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf8")
    const crc = crc32(entry.data)
    const size = entry.data.length

    const localHeader = Buffer.concat([
      u32(0x04034b50), // local file header signature
      u16(20), // version needed to extract
      u16(0), // general purpose flags
      u16(0), // compression method: 0 = stored
      u16(DOS_TIME),
      u16(DOS_DATE),
      u32(crc),
      u32(size), // compressed size
      u32(size), // uncompressed size
      u16(nameBuf.length),
      u16(0), // extra field length
    ])

    localParts.push(localHeader, nameBuf, entry.data)

    const centralHeader = Buffer.concat([
      u32(0x02014b50), // central directory file header signature
      u16(20), // version made by
      u16(20), // version needed to extract
      u16(0), // flags
      u16(0), // compression method
      u16(DOS_TIME),
      u16(DOS_DATE),
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBuf.length),
      u16(0), // extra field length
      u16(0), // comment length
      u16(0), // disk number start
      u16(0), // internal file attributes
      u32(0), // external file attributes
      u32(offset), // relative offset of local header
    ])

    centralParts.push(centralHeader, nameBuf)

    offset += localHeader.length + nameBuf.length + entry.data.length
  }

  const centralDirectory = Buffer.concat(centralParts)

  const endRecord = Buffer.concat([
    u32(0x06054b50), // end of central directory signature
    u16(0), // disk number
    u16(0), // disk with central directory start
    u16(entries.length), // entries on this disk
    u16(entries.length), // total entries
    u32(centralDirectory.length),
    u32(offset), // central directory offset
    u16(0), // comment length
  ])

  return Buffer.concat([...localParts, centralDirectory, endRecord])
}
