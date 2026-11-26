// 地圖投影：米勒圓柱投影（Miller cylindrical），經度 -180..180，緯度 78N..56S
export const W = 4320;
export const LAT_N = 78;
export const LAT_S = -56;
const K = W / (2 * Math.PI);
const millerY = (latDeg) => 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * latDeg * Math.PI / 180));
const Y_TOP = millerY(LAT_N);
export const H = Math.ceil((Y_TOP - millerY(LAT_S)) * K);

export function project(lon, lat) {
  const la = Math.max(LAT_S - 2, Math.min(LAT_N + 2, lat));
  return [(lon + 180) / 360 * W, (Y_TOP - millerY(la)) * K];
}

export function unproject(x, y) {
  const lon = x / W * 360 - 180;
  const yy = Y_TOP - y / K;
  const lat = (Math.atan(Math.exp(yy / 1.25)) - Math.PI / 4) / 0.4 * 180 / Math.PI;
  return [lon, lat];
}

// 大圓距離（公里）
export function gcDist(lon1, lat1, lon2, lat2) {
  const r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}
