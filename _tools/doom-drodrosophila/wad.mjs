import fs from 'node:fs';
export function readMap(path) {
  const b = fs.readFileSync(path),
    count = b.readInt32LE(4),
    offset = b.readInt32LE(8);
  const dir = Array.from({ length: count }, (_, i) => {
    const o = offset + i * 16;
    return {
      name: b.toString('ascii', o + 8, o + 16).replace(/\0/g, ''),
      offset: b.readInt32LE(o),
      size: b.readInt32LE(o + 4),
    };
  });
  const start = dir.findIndex((x) => x.name === 'E1M1');
  const lump = (name, stride, read) => {
    const d = dir.slice(start + 1, start + 11).find((x) => x.name === name);
    return Array.from({ length: d.size / stride }, (_, i) => read(d.offset + i * stride));
  };
  const short = (o) => b.readInt16LE(o),
    text = (o) => b.toString('ascii', o, o + 8).replace(/\0/g, '');
  const vertices = lump('VERTEXES', 4, (o) => [short(o), short(o + 2)]);
  const sectors = lump('SECTORS', 26, (o) => ({
    floor: short(o),
    ceiling: short(o + 2),
    floorTexture: text(o + 4),
    ceilingTexture: text(o + 12),
    type: short(o + 22),
    tag: short(o + 24),
  }));
  const sides = lump('SIDEDEFS', 30, (o) => ({
    sector: short(o + 28),
    upper: text(o + 4),
    lower: text(o + 12),
    middle: text(o + 20),
  }));
  const lines = lump('LINEDEFS', 14, (o) => ({
    a: short(o),
    b: short(o + 2),
    flags: short(o + 4),
    type: short(o + 6),
    tag: short(o + 8),
    right: short(o + 10),
    left: short(o + 12),
  }));
  const things = lump('THINGS', 10, (o) => ({
    x: short(o),
    y: short(o + 2),
    angle: short(o + 4),
    type: short(o + 6),
  }));
  return { vertices, sectors, sides, lines, things };
}
