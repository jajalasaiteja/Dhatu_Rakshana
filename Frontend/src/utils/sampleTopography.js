/**
 * Sample Surface Topography Procedural Mesh Generator
 * 
 * Generates a deterministic, high-resolution mathematical height-field
 * representing a marine protective coating specimen with realistic nominal
 * coating baseline, localized corrosion cavities, pitting, mechanical abrasion,
 * and osmotic blistering.
 */

import * as THREE from 'three';

// Dedicated 5-Color Topography Visualization Palette
export const TOPOGRAPHY_PALETTE = {
  deepCavity: '#401421',       // Business Burgundy - deepest pit / cavity floor
  depression: '#B9485A',       // Dusty Strawberry - lower pit slope / wear trough
  nominalCoating: '#CE9770',   // Peach Brown - nominal coating baseline
  upperRelief: '#A6B890',      // Schist - upper relief slope
  surfacePeak: '#D0CB93',      // Winter Hazel - highest crest / blister peak
};

// 5 Elevation Color Nodes for continuous interpolation
export const COLOR_NODES = [
  new THREE.Color(TOPOGRAPHY_PALETTE.deepCavity),
  new THREE.Color(TOPOGRAPHY_PALETTE.depression),
  new THREE.Color(TOPOGRAPHY_PALETTE.nominalCoating),
  new THREE.Color(TOPOGRAPHY_PALETTE.upperRelief),
  new THREE.Color(TOPOGRAPHY_PALETTE.surfacePeak),
];

/**
 * Maps normalized elevation t in [0.0, 1.0] to a THREE.Color across the 5 palette nodes:
 * 0.00 - 0.25: Deep Cavity -> Depression
 * 0.25 - 0.50: Depression -> Nominal Coating
 * 0.50 - 0.75: Nominal Coating -> Upper Relief
 * 0.75 - 1.00: Upper Relief -> Surface Peak
 */
export function getSurfaceColor(t) {
  const clamped = Math.min(1.0, Math.max(0.0, t));
  if (clamped <= 0.25) {
    const localT = clamped / 0.25;
    return new THREE.Color().copy(COLOR_NODES[0]).lerp(COLOR_NODES[1], localT);
  } else if (clamped <= 0.50) {
    const localT = (clamped - 0.25) / 0.25;
    return new THREE.Color().copy(COLOR_NODES[1]).lerp(COLOR_NODES[2], localT);
  } else if (clamped <= 0.75) {
    const localT = (clamped - 0.50) / 0.25;
    return new THREE.Color().copy(COLOR_NODES[2]).lerp(COLOR_NODES[3], localT);
  } else {
    const localT = (clamped - 0.75) / 0.25;
    return new THREE.Color().copy(COLOR_NODES[3]).lerp(COLOR_NODES[4], localT);
  }
}

/**
 * Deterministic mathematical height field function: H(x, y)
 * Coordinates x, y are in Three.js specimen space [-1.5, 1.5]
 */
export function calculateSpecimenHeight(x, y) {
  // 1. Nominal coating baseline with natural multi-octave flow/roller undulation
  const hBase = 0.035 * Math.sin(1.8 * x + 0.6 * y) +
                0.024 * Math.cos(1.4 * y - 0.8 * x) +
                0.012 * Math.sin(4.2 * x) * Math.cos(3.8 * y) +
                0.006 * Math.sin(8.5 * x + 2.1 * y);

  // 2. Severe localized coating breakdown / deep pitting cavity (substrate crater)
  const d1x = x - (-0.48);
  const d1y = y - 0.38;
  const r1sq = d1x * d1x + d1y * d1y;
  const angle1 = Math.atan2(d1y, d1x);
  const r1mod = r1sq * (1.0 + 0.18 * Math.cos(3 * angle1) + 0.10 * Math.sin(5 * angle1));
  const pit1 = -0.68 * Math.exp(-r1mod / 0.075) - 0.40 * Math.exp(-r1sq / 0.018);

  // 3. Secondary cavitation erosion pit / cavity
  const d2x = (x - 0.52) * 1.3;
  const d2y = (y - (-0.42)) * 0.9;
  const r2sq = d2x * d2x + d2y * d2y;
  const pit2 = -0.58 * Math.exp(-r2sq / 0.065) - 0.32 * Math.exp(-r2sq / 0.015);

  // 4. Localized depression (coating thinning / erosion dish)
  const d3x = x - 0.25;
  const d3y = y - 0.68;
  const r3sq = d3x * d3x + d3y * d3y;
  const dep1 = -0.38 * Math.exp(-r3sq / 0.055);

  // 5. Elongated mechanical scrape / abrasion groove trough
  const uG = (x + 0.50) * 0.78 + (y + 0.48) * 0.62;
  const vG = -(x + 0.50) * 0.62 + (y + 0.48) * 0.78;
  const groove = -0.32 * Math.exp(-(vG * vG) / 0.008) * Math.exp(-Math.pow(uG / 0.45, 4));

  // 6. Cluster of micro-pitting defects
  const micro1 = -0.25 * Math.exp(-((x + 0.15) * (x + 0.15) + (y - 0.12) * (y - 0.12)) / 0.006);
  const micro2 = -0.22 * Math.exp(-((x - 0.68) * (x - 0.68) + (y - 0.42) * (y - 0.42)) / 0.008);

  // 7. Raised Feature: Osmotic blister dome (intact swelling)
  const b1x = x - (-0.42);
  const b1y = y - (-0.48);
  const rb1sq = b1x * b1x + b1y * b1y;
  const blister1 = 0.78 * Math.exp(-rb1sq / 0.08) + 0.30 * Math.exp(-rb1sq / 0.025);

  // 8. Raised Feature: Secondary blister cluster / upper relief
  const b2x = x - 0.45;
  const b2y = y - 0.35;
  const rb2sq = b2x * b2x + b2y * b2y;
  const blister2 = 0.58 * Math.exp(-rb2sq / 0.06);

  // 9. Raised Feature: Gentle weld seam / coating bead relief ridge across upper corner
  const dRidge = (x + y - 1.25) / Math.SQRT2;
  const ridge = 0.30 * Math.exp(-(dRidge * dRidge) / 0.04) * (1 / (1 + Math.exp(-(x - y) * 2)));

  return hBase + pit1 + pit2 + dep1 + groove + micro1 + micro2 + blister1 + blister2 + ridge;
}

/**
 * Creates a high-detail procedural Three.js PlaneGeometry with vertex colors
 * mapped to the 5-color topography palette.
 */
export function generateSampleTopographyGeometry(heightScale = 0.35, segments = 128) {
  const width = 3.0;
  const height = 3.0;
  const geometry = new THREE.PlaneGeometry(width, height, segments, segments);

  const posAttr = geometry.attributes.position;
  const count = posAttr.count;

  const rawZValues = new Float32Array(count);
  let minRawZ = Infinity;
  let maxRawZ = -Infinity;

  for (let i = 0; i < count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const zVal = calculateSpecimenHeight(x, y);
    rawZValues[i] = zVal;
    if (zVal < minRawZ) minRawZ = zVal;
    if (zVal > maxRawZ) maxRawZ = zVal;
  }

  const rangeRawZ = (maxRawZ - minRawZ) > 0.0001 ? (maxRawZ - minRawZ) : 1.0;
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const rawZ = rawZValues[i];
    // Scale vertical displacement
    posAttr.setZ(i, rawZ * heightScale);

    // Compute elevation ratio [0, 1] for 5-color palette mapping
    const t = (rawZ - minRawZ) / rangeRawZ;
    const col = getSurfaceColor(t);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }

  posAttr.needsUpdate = true;
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();

  return geometry;
}
