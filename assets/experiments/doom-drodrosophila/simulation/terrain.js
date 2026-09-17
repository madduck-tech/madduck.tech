export function sectorAt(data, x, z) {
  for (const sector of data.sectors) {
    let inside = false;
    for (const [a, b] of sector.edges) {
      if (a[1] > z !== b[1] > z && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0])
        inside = !inside;
    }
    if (inside) return sector;
  }
  return null;
}
export function floorAt(data, x, z, liftHeight) {
  const sector = sectorAt(data, x, z);
  if (!sector) return null;
  return sector.id === 59 ? -48 : sector.id === 70 ? liftHeight : sector.floor;
}
