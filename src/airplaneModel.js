import * as THREE from 'three';
import { ParametricGeometry } from 'three/examples/jsm/Addons.js';
import { TextureLoader, RepeatWrapping } from 'three';

// values and sizes
const bodyLength = 6;
const bodyDiameter = 1;
const tailLength = 2;
const noseLength = 1;

function mainbody(u, v, target) {
  // Cylinder parameters
  const r = bodyDiameter / 2;
  let x = r * Math.cos(2 * Math.PI * u);
  let z = bodyLength * v - bodyLength / 2;
  let y = r * Math.sin(2 * Math.PI * u);

  // Nose taper (front)
  const vNose = noseLength / bodyLength;
  if (v < vNose) {
    let noseTaper = 1 - (vNose - v) / vNose;
    noseTaper = Math.max(0, Math.min(1, noseTaper));
    x *= noseTaper;
    y *= noseTaper;
  }

  // Tail taper (back)
  const vTailStart = 1 - tailLength / bodyLength;
  if (v > vTailStart) {
    let tailTaper = 1 - (v - vTailStart) / (1 - vTailStart);
    tailTaper = Math.max(0, Math.min(1, tailTaper));
    x *= tailTaper;
    y *= tailTaper;

    // Move tail end upwards along the spine
    // This adds an offset to z that goes from 0 at vTailStart to r at v=1
    const tailUp = (r * (v - vTailStart)) / (1 - vTailStart);
    y += tailUp;
  }

  target.set(x, y, z);
}

function MainBodyMesh() {
  const geometry = new ParametricGeometry(mainbody, 20, 20);
  const material = new THREE.MeshPhongMaterial({
    color: 0x2194ce,
    side: THREE.FrontSide,
    //flatShading: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(0.5, 0.5, 0.5);
  //mesh.rotation.x = Math.PI / 2;
  return mesh;
}

function newWingsFunc(
  wingSpan = 5,
  teardropThickness = 0.02,
  teardropLength = 0.7,
  chordMax = 0.75,
  asymmetric = false
) {
  return function (u, v, target) {
    const a = teardropThickness;
    const b = teardropLength;
    // v goes from 0 to 1 along the span of the wing
    // t goes from 0 to 2pi
    const t = u * 2 * Math.PI;
    //the formula for a teardrop curve
    //https://mathworld.wolfram.com/TeardropCurve.html
    //x = 2acos(t) - asin(2t)
    //y = bsin(t)
    const x2d = 2 * a * Math.cos(t) - a * Math.sin(2 * t);
    const y2d = b * Math.sin(t);

    // calculte y,z = x2d, y2d, such that we extrude the teardrop along the x axis, flat along the xz plane
    const x = wingSpan * (v - 0.5);

    let shrinkFactor;
    if (asymmetric) {
      shrinkFactor = 1 - v;
    } else {
      shrinkFactor = 0.5 + 0.5 * (1 - Math.abs(2 * v - 1)); // 1 at center, 0.5 at edges
    }

    let z = y2d;
    let y = x2d;

    //const shrinkFactor = 0.5 + 0.5 * (1 - Math.abs(2 * v - 1)); // 1 at center, 0.5 at edges
    const chord = chordMax * shrinkFactor;
    //scale the wing down based on the chord length
    z *= chord;
    y *= chord;

    //move z back a bit proportionally to the chord length
    z -= 0.75 * chord;

    //end caps
    if (v === 0 || v === 1) {
      y = 0;
      z = 0;
    }

    // set the target

    target.set(x, y, z);
  };
}

function MainWingMesh() {
  const wingSpan = 5;
  const teardropThickness = 0.02;
  const teardropLength = 0.7;
  const chordMax = 0.75;

  const geometry = new ParametricGeometry(
    newWingsFunc(
      wingSpan,
      teardropThickness,
      teardropLength,
      chordMax
    ),
    20,
    20
  );
  const material = new THREE.MeshPhongMaterial({
    color: 0x8ac926,
    flatShading: true,
    //side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  //mesh.rotation.x = Math.PI;
  mesh.position.set(0, 0.15, 0.15);
  return mesh;
}

function TailWingMesh() {
  const wingSpan = 1;
  const wingThickness = 0.02;
  const wingLength = 0.5;
  const chordMax = 0.5;

  const geometry = new ParametricGeometry(
    newWingsFunc(wingSpan, wingThickness, wingLength, chordMax),
    20,
    20
  );
  const material = new THREE.MeshPhongMaterial({
    color: 0xff6f91,
    flatShading: true,
    //side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  //mesh.rotation.x = Math.PI;
  mesh.position.set(0, 0.21, 1.5);
  return mesh;
}

function TallTailWingMesh() {
  const wingSpan = 0.5;
  const wingThickness = 0.02;
  const wingLength = 0.5;
  const chordMax = 0.5;

  const geometry = new ParametricGeometry(
    newWingsFunc(
      wingSpan,
      wingThickness,
      wingLength,
      chordMax,
      true
    ),
    20,
    20
  );
  const material = new THREE.MeshPhongMaterial({
    color: 0xaf2bff,
    flatShading: true,
    //side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.z = Math.PI / 2;
  mesh.position.set(0, 0.5, 1.5);
  return mesh;
}

function engineFunc(
  length = 0.6,
  radius = 0.2,
  tailStart = 0.4
) {
  return (u, v, target) => {
    // A simple cylinder for the engine
    const r = radius;
    const h = length;
    let x = r * Math.cos(2 * Math.PI * u);
    //let z = h * v - h / 2;
    let z = h * v; // start at 0
    let y = r * Math.sin(2 * Math.PI * u);

    // Tail taper (back)
    //const vTailStart = 1 - 0.2 / h;
    const vTailStart = tailStart / length;
    if (v > vTailStart) {
      let tailTaper = 1 - (v - vTailStart) / (1 - vTailStart);
      tailTaper = Math.max(0.2, Math.min(1, tailTaper));
      x *= tailTaper;
      y *= tailTaper;

      // Move tail end upwards along the spine
      // This adds an offset to z that goes from 0 at vTailStart to r at v=1
      //const tailUp = (r * (v - vTailStart)) / (1 - vTailStart);
      //y += tailUp;
    }

    //end caps
    if (v === 0 || v === 1) {
      y = 0;
      z = 0;
    }

    target.set(x, y, z);
  };
}
function EngineMesh(
  color = 0x555555,
  length = 0.6,
  radius = 0.2,
  tailStart = 0.4
) {
  // A simple cylinder for the engine
  const geometry = new ParametricGeometry(
    engineFunc(length, radius, tailStart),
    20,
    20
  );
  const material = new THREE.MeshPhongMaterial({
    color,
    //side: THREE.DoubleSide,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, -length, 0);
  return mesh;
}

function FanBlades(color = 0x333333) {
  const engGroup = new THREE.Group();

  // A few shapes for the fan blades
  const bladeGeometry = new THREE.BoxGeometry(0.05, 0.02, 0.5);
  const bladeMaterial = new THREE.MeshPhongMaterial({
    color,
    //side: THREE.DoubleSide,
    flatShading: true,
  });
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.set(0, 0, 0);
    blade.rotation.y = (i * 2 * Math.PI) / 3;
    blade.rotation.x = Math.PI / 2;
    engGroup.add(blade);
  }
  return engGroup;
}

// (old single-geometry helper removed) -- replaced by generateUVAtlas(meshes, options)
function generateUVAtlas(meshes, options = {}) {
  // meshes: array of THREE.Mesh
  const size = options.size || 2048;
  const padding = options.padding || 8; // padding inside each tile
  const bgColor = options.bgColor || '#000000';
  const lineColor = options.lineColor || '#31d14b'; // green outline
  const bboxColor = options.bboxColor || '#ffffff';

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);

  // flatten input: include child meshes of groups
  const all = [];
  (meshes || []).forEach(obj => {
    if (!obj) return;
    if (obj.isMesh) all.push(obj);
    else if (obj.traverse) {
      obj.traverse(c => {
        if (c.isMesh) all.push(c);
      });
    }
  });

  // dedupe
  const unique = Array.from(new Set(all)).filter(
    m => m.geometry && m.geometry.isBufferGeometry
  );
  if (unique.length === 0) {
    console.error(
      'No valid meshes with BufferGeometry found to generate UV atlas.'
    );
    return;
  }

  const mapping = [];
  const n = unique.length;
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const tileW = Math.floor(size / cols);
  const tileH = Math.floor(size / rows);

  ctx.lineWidth = 1;

  for (let i = 0; i < unique.length; i++) {
    const mesh = unique[i];
    const geom = mesh.geometry;
    const uvAttr = geom.attributes.uv;
    const posAttr = geom.attributes.position;
    const idx = geom.index;

    const col = i % cols;
    const row = Math.floor(i / cols);
    const tileX = col * tileW;
    const tileY = row * tileH;

    // Draw tile background (slightly darker)
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(tileX, tileY, tileW, tileH);

    const label =
      mesh.name && mesh.name.length
        ? mesh.name
        : (mesh.userData && mesh.userData.label) || `mesh_${i}`;

    if (!uvAttr || !posAttr) {
      // fallback: generate planar UVs from positions projected to XZ
      console.warn(
        'Geometry missing UVs; generating planar UVs for mesh',
        mesh.name
      );
      const positions = posAttr.array;
      const uvs = new Float32Array((positions.length / 3) * 2);
      // compute bbox in X and Z
      let minX = Infinity,
        maxX = -Infinity,
        minZ = Infinity,
        maxZ = -Infinity;
      for (let j = 0; j < positions.length; j += 3) {
        const x = positions[j];
        const z = positions[j + 2];
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
      const dx = maxX - minX || 1;
      const dz = maxZ - minZ || 1;
      for (
        let j = 0, k = 0;
        j < positions.length;
        j += 3, k += 2
      ) {
        const x = positions[j];
        const z = positions[j + 2];
        uvs[k] = (x - minX) / dx;
        uvs[k + 1] = (z - minZ) / dz;
      }
      // compute uv bbox for labeling
      let minU_f = Infinity,
        maxU_f = -Infinity,
        minV_f = Infinity,
        maxV_f = -Infinity;
      for (let jj = 0; jj < uvs.length; jj += 2) {
        const uu = uvs[jj];
        const vv = uvs[jj + 1];
        if (uu < minU_f) minU_f = uu;
        if (uu > maxU_f) maxU_f = uu;
        if (vv < minV_f) minV_f = vv;
        if (vv > maxV_f) maxV_f = vv;
      }
      if (!isFinite(minU_f)) {
        minU_f = 0;
        maxU_f = 1;
        minV_f = 0;
        maxV_f = 1;
      }
      // use this generated array when drawing below
      drawTrianglesFromUVArray(
        ctx,
        uvs,
        geom.index ? geom.index.array : null,
        tileX,
        tileY,
        tileW,
        tileH,
        padding,
        lineColor
      );
      // draw bbox
      drawTileBBox(ctx, tileX, tileY, tileW, tileH, bboxColor);
      // draw label for fallback mesh
      try {
        const fontSize = Math.max(10, Math.floor(tileH * 0.06));
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const centerU_f = (minU_f + maxU_f) / 2;
        const centerV_f = (minV_f + maxV_f) / 2;
        const labelX =
          tileX +
          padding +
          ((centerU_f - minU_f) / (maxU_f - minU_f || 1)) *
            (tileW - padding * 2);
        const labelY =
          tileY +
          padding +
          (1 - (centerV_f - minV_f) / (maxV_f - minV_f || 1)) *
            (tileH - padding * 2);
        const label =
          mesh.name && mesh.name.length
            ? mesh.name
            : (mesh.userData && mesh.userData.label) ||
              `mesh_${i}`;
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000000';
        ctx.fillStyle = '#ffff66';
        ctx.strokeText(label, labelX, labelY);
        ctx.fillText(label, labelX, labelY);
      } catch (e) {
        /* ignore label errors */
      }
      // store mapping for this mesh
      mapping.push({
        uuid: mesh.uuid,
        name: label,
        tile: { x: tileX, y: tileY, w: tileW, h: tileH },
        uvBBox: {
          minU: minU_f,
          maxU: maxU_f,
          minV: minV_f,
          maxV: maxV_f,
        },
        padding,
      });
      continue;
    }

    const uvs = uvAttr.array;
    const indices = idx ? idx.array : null;

    // compute UV bbox to scale islands to tile (preserve island shape)
    let minU = Infinity,
      maxU = -Infinity,
      minV = Infinity,
      maxV = -Infinity;
    for (let j = 0; j < uvs.length; j += 2) {
      const u = uvs[j];
      const v = uvs[j + 1];
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
    if (!isFinite(minU)) {
      minU = 0;
      maxU = 1;
      minV = 0;
      maxV = 1;
    }

    const uRange = maxU - minU || 1;
    const vRange = maxV - minV || 1;

    // transform and draw triangles
    ctx.strokeStyle = lineColor;
    if (indices) {
      for (let j = 0; j < indices.length; j += 3) {
        const a = indices[j];
        const b = indices[j + 1];
        const c = indices[j + 2];

        const ax =
          tileX +
          padding +
          ((uvs[a * 2] - minU) / uRange) * (tileW - padding * 2);
        const ay =
          tileY +
          padding +
          (1 - (uvs[a * 2 + 1] - minV) / vRange) *
            (tileH - padding * 2);
        const bx =
          tileX +
          padding +
          ((uvs[b * 2] - minU) / uRange) * (tileW - padding * 2);
        const by =
          tileY +
          padding +
          (1 - (uvs[b * 2 + 1] - minV) / vRange) *
            (tileH - padding * 2);
        const cx =
          tileX +
          padding +
          ((uvs[c * 2] - minU) / uRange) * (tileW - padding * 2);
        const cy =
          tileY +
          padding +
          (1 - (uvs[c * 2 + 1] - minV) / vRange) *
            (tileH - padding * 2);

        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.lineTo(cx, cy);
        ctx.closePath();
        ctx.stroke();
      }
    } else {
      // non-indexed
      for (let j = 0; j < uvs.length; j += 6) {
        const ax =
          tileX +
          padding +
          ((uvs[j] - minU) / uRange) * (tileW - padding * 2);
        const ay =
          tileY +
          padding +
          (1 - (uvs[j + 1] - minV) / vRange) *
            (tileH - padding * 2);
        const bx =
          tileX +
          padding +
          ((uvs[j + 2] - minU) / uRange) * (tileW - padding * 2);
        const by =
          tileY +
          padding +
          (1 - (uvs[j + 3] - minV) / vRange) *
            (tileH - padding * 2);
        const cx =
          tileX +
          padding +
          ((uvs[j + 4] - minU) / uRange) * (tileW - padding * 2);
        const cy =
          tileY +
          padding +
          (1 - (uvs[j + 5] - minV) / vRange) *
            (tileH - padding * 2);

        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.lineTo(cx, cy);
        ctx.closePath();
        ctx.stroke();
      }
    }

    // draw bounding box for the island in white
    drawTileBBox(ctx, tileX, tileY, tileW, tileH, bboxColor);

    // draw name label centered on island
    try {
      const fontSize = Math.max(10, Math.floor(tileH * 0.06));
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const centerU = (minU + maxU) / 2;
      const centerV = (minV + maxV) / 2;
      const labelX =
        tileX +
        padding +
        ((centerU - minU) / (maxU - minU || 1)) *
          (tileW - padding * 2);
      const labelY =
        tileY +
        padding +
        (1 - (centerV - minV) / (maxV - minV || 1)) *
          (tileH - padding * 2);
      const label =
        mesh.name && mesh.name.length
          ? mesh.name
          : (mesh.userData && mesh.userData.label) ||
            `mesh_${i}`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000000';
      ctx.fillStyle = '#ffff66';
      ctx.strokeText(label, labelX, labelY);
      ctx.fillText(label, labelX, labelY);
    } catch (e) {
      /* ignore */
    }
    // store mapping for this mesh
    mapping.push({
      uuid: mesh.uuid,
      name: label,
      tile: { x: tileX, y: tileY, w: tileW, h: tileH },
      uvBBox: { minU, maxU, minV, maxV },
      padding,
    });
  }
  const dataURL = canvas.toDataURL('image/png');
  const image = new Image();
  image.src = dataURL;
  console.log('UV Atlas:', image);

  // store atlas data & mapping globally for later download or application
  window.__lastUVAtlas = {
    dataURL,
    mapping,
    filename: options.filename || 'airplane_uv_atlas.png',
    size,
    padding,
  };

  console.log(
    'UV atlas generated — press B to download or call applyUVAtlas(window.__lastUVAtlas, rootGroup) to apply it.'
  );
  return window.__lastUVAtlas;
}

// Press B to download last generated atlas (if present)
window.addEventListener('keydown', e => {
  try {
    if (e.code === 'KeyB') {
      const atlas = window.__lastUVAtlas;
      if (!atlas) {
        console.warn('No UV atlas available to download.');
        return;
      }
      const a = document.createElement('a');
      a.href = atlas.dataURL;
      a.download = atlas.filename || 'airplane_uv_atlas.png';
      document.body.appendChild(a);
      // use dispatchEvent for compatibility
      a.dispatchEvent(new MouseEvent('click'));
      document.body.removeChild(a);
      downloadLastUVAtlasJSON();
    }
  } catch (err) {
    console.warn(
      'Failed to download UV atlas via keypress:',
      err
    );
  }
});

// Apply a previously-generated atlas to meshes. atlas = window.__lastUVAtlas or returned object from generateUVAtlas
export function applyUVAtlas(atlas, rootOrMeshes) {
  if (!atlas) atlas = window.__lastUVAtlas;
  if (!atlas) {
    console.error('No atlas provided or available');
    return;
  }

  // find meshes list
  let meshes = [];
  if (Array.isArray(rootOrMeshes)) meshes = rootOrMeshes;
  else if (rootOrMeshes && rootOrMeshes.isObject3D) {
    rootOrMeshes.traverse(c => {
      if (c.isMesh) meshes.push(c);
    });
  } else if (!rootOrMeshes) {
    console.warn(
      'No root provided; attempting to use mapping UUIDs to find meshes in global scene'
    );
  }

  // Create texture
  const loader = new THREE.TextureLoader();
  const texture = loader.load(atlas.dataURL, t => {
    t.needsUpdate = true;
  });
  texture.flipY = false; // keep consistent with canvas orientation
  texture.needsUpdate = true;

  // helper to find mesh by uuid if not in meshes array
  function findMeshByUUID(uuid) {
    if (meshes.length) {
      for (let m of meshes) if (m.uuid === uuid) return m;
    }
    // search the global document for Three objects is not reliable here; user should provide root
    return null;
  }

  atlas.mapping.forEach((entry, idx) => {
    const mesh =
      findMeshByUUID(entry.uuid) || meshes[idx] || null;
    if (!mesh) {
      console.warn(
        'Mesh for atlas entry not found locally:',
        entry.name,
        entry.uuid
      );
      return;
    }

    const geom = mesh.geometry;
    if (!geom || !geom.attributes || !geom.attributes.uv) {
      console.warn('Mesh has no UVs, skipping:', mesh.name);
      return;
    }

    // save original UVs if not saved
    if (!geom.attributes.uv_original) {
      geom.setAttribute(
        'uv_original',
        geom.attributes.uv.clone()
      );
    }

    const orig = geom.attributes.uv_original.array;
    const newUVs = new Float32Array(orig.length);

    const { minU, maxU, minV, maxV } = entry.uvBBox;
    const uRange = maxU - minU || 1;
    const vRange = maxV - minV || 1;

    const tileX = entry.tile.x;
    const tileY = entry.tile.y;
    const tileW = entry.tile.w;
    const tileH = entry.tile.h;
    const pad = entry.padding || atlas.padding || 0;
    const sizePx = atlas.size || 2048;

    for (let i = 0; i < orig.length; i += 2) {
      const u = orig[i];
      const v = orig[i + 1];
      // map original UV into tile using same transform as drawing
      const pixelX =
        tileX + pad + ((u - minU) / uRange) * (tileW - pad * 2);
      const pixelY =
        tileY +
        pad +
        (1 - (v - minV) / vRange) * (tileH - pad * 2);
      const nu = pixelX / sizePx;
      const nv = 1 - pixelY / sizePx; // three's UV v=0 bottom
      newUVs[i] = nu;
      newUVs[i + 1] = nv;
    }

    geom.setAttribute(
      'uv',
      new THREE.BufferAttribute(newUVs, 2)
    );
    if (mesh.material) {
      mesh.material.map = texture;
      mesh.material.needsUpdate = true;
    }
  });
}

// Download mapping JSON for the last generated atlas so you can re-use it later
export function downloadLastUVAtlasJSON(
  filename = 'airplane_uv_atlas.json'
) {
  const atlas = window.__lastUVAtlas;
  if (!atlas) {
    console.warn('No atlas available to export mapping.');
    return;
  }
  const data = {
    filename: atlas.filename,
    size: atlas.size,
    padding: atlas.padding,
    mapping: atlas.mapping,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Apply an atlas texture loaded from a URL (or dataURL) using an atlasData object (mapping).
// atlasData should be the object produced by generateUVAtlas (or the JSON you downloaded).
export function applyUVAtlasFromURL(
  atlasData,
  url,
  rootOrMeshes
) {
  if (!atlasData) {
    console.error('No atlasData provided');
    return;
  }
  const loader = new THREE.TextureLoader();
  loader.load(
    url,
    texture => {
      texture.flipY = false;
      texture.needsUpdate = true;
      // create a temporary atlas object shape expected by applyUVAtlas
      const atlas = {
        dataURL: url,
        mapping: atlasData.mapping || atlasData,
        filename: atlasData.filename || 'airplane_uv_atlas.png',
        size: atlasData.size || atlasData.width || 2048,
        padding: atlasData.padding || 0,
      };
      // if rootOrMeshes provided, pass it along; else leave for applyUVAtlas to attempt find
      applyUVAtlas(atlas, rootOrMeshes);
    },
    undefined,
    err => {
      console.error('Failed to load atlas image from URL:', err);
    }
  );
}

function drawTileBBox(ctx, tileX, tileY, tileW, tileH, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(tileX + 1, tileY + 1, tileW - 2, tileH - 2);
  ctx.restore();
}

function drawTrianglesFromUVArray(
  ctx,
  uvs,
  indices,
  tileX,
  tileY,
  tileW,
  tileH,
  padding,
  lineColor
) {
  ctx.strokeStyle = lineColor;
  const minU = 0,
    minV = 0,
    uRange = 1,
    vRange = 1;
  if (indices) {
    for (let j = 0; j < indices.length; j += 3) {
      const a = indices[j];
      const b = indices[j + 1];
      const c = indices[j + 2];
      const ax =
        tileX +
        padding +
        ((uvs[a * 2] - minU) / uRange) * (tileW - padding * 2);
      const ay =
        tileY +
        padding +
        (1 - uvs[a * 2 + 1]) * (tileH - padding * 2);
      const bx =
        tileX +
        padding +
        ((uvs[b * 2] - minU) / uRange) * (tileW - padding * 2);
      const by =
        tileY +
        padding +
        (1 - uvs[b * 2 + 1]) * (tileH - padding * 2);
      const cx =
        tileX +
        padding +
        ((uvs[c * 2] - minU) / uRange) * (tileW - padding * 2);
      const cy =
        tileY +
        padding +
        (1 - uvs[c * 2 + 1]) * (tileH - padding * 2);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.stroke();
    }
  } else {
    for (let j = 0; j < uvs.length; j += 6) {
      const ax =
        tileX + padding + uvs[j] * (tileW - padding * 2);
      const ay =
        tileY +
        padding +
        (1 - uvs[j + 1]) * (tileH - padding * 2);
      const bx =
        tileX + padding + uvs[j + 2] * (tileW - padding * 2);
      const by =
        tileY +
        padding +
        (1 - uvs[j + 3]) * (tileH - padding * 2);
      const cx =
        tileX + padding + uvs[j + 4] * (tileW - padding * 2);
      const cy =
        tileY +
        padding +
        (1 - uvs[j + 5]) * (tileH - padding * 2);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.stroke();
    }
  }
}

export function AirplaneGeometry() {
  const airplane = new THREE.Group();

  const mainbody = MainBodyMesh();
  airplane.add(mainbody);

  const mainWing = MainWingMesh();
  airplane.add(mainWing);

  const tailWing = TailWingMesh();
  airplane.add(tailWing);

  const tallTailWing = TallTailWingMesh();
  airplane.add(tallTailWing);

  //primary engines
  const primaryEngineXOffset = 0.75;
  const primaryEngineZOffset = -0.9;
  const primaryEngineYOffset = -0.03;
  const primaryEngineRadius = 0.2;
  const primaryEngineLength = 1;
  const primaryEngineTailStart = 0.6;
  const en1 = EngineMesh(
    0xdd3333,
    primaryEngineLength,
    primaryEngineRadius,
    primaryEngineTailStart
  );
  en1.position.set(
    -primaryEngineXOffset,
    primaryEngineYOffset,
    primaryEngineZOffset
  );
  airplane.add(en1);
  const en2 = EngineMesh(
    0x3333dd,
    primaryEngineLength,
    primaryEngineRadius,
    primaryEngineTailStart
  );
  en2.position.set(
    primaryEngineXOffset,
    primaryEngineYOffset,
    primaryEngineZOffset
  );
  airplane.add(en2);

  const fan1 = FanBlades(0xdc143c);
  fan1.position.set(
    -primaryEngineXOffset,
    primaryEngineYOffset,
    primaryEngineZOffset - 0.02
  );
  airplane.add(fan1);
  const fan2 = FanBlades(0x1e90ff);
  fan2.position.set(
    primaryEngineXOffset,
    primaryEngineYOffset,
    primaryEngineZOffset - 0.02
  );
  airplane.add(fan2);

  //secondary engines
  const secondaryEngineXOffset = 1.75;
  const secondaryEngineZOffset = -0.6;
  const secondaryEngineLength = 0.8;
  const secondaryEngineRadius = 0.2;
  const secondaryEngineTailStart = 0.4;
  const en3 = EngineMesh(
    0xffa500,
    secondaryEngineLength,
    secondaryEngineRadius,
    secondaryEngineTailStart
  );
  en3.position.set(
    -secondaryEngineXOffset,
    primaryEngineYOffset,
    secondaryEngineZOffset
  );
  airplane.add(en3);
  const en4 = EngineMesh(
    0x00a5ff,
    secondaryEngineLength,
    secondaryEngineRadius,
    secondaryEngineTailStart
  );
  en4.position.set(
    secondaryEngineXOffset,
    primaryEngineYOffset,
    secondaryEngineZOffset
  );
  airplane.add(en4);

  const fan3 = FanBlades(0xffd700);
  fan3.position.set(
    -secondaryEngineXOffset,
    primaryEngineYOffset,
    secondaryEngineZOffset - 0.02
  );
  airplane.add(fan3);
  const fan4 = FanBlades(0x00ffff);
  fan4.position.set(
    secondaryEngineXOffset,
    primaryEngineYOffset,
    secondaryEngineZOffset - 0.02
  );
  airplane.add(fan4);

  [mainbody, mainWing, tailWing, tallTailWing, en1, en2].forEach(
    m => {
      m.castShadow = m.receiveShadow = true;
    }
  );

  const headLight = new THREE.PointLight(0xffdd55, 50);
  headLight.castShadow = true;
  airplane.add(headLight);
  headLight.position.set(0, -0.5, 2);

  const wingLightL = new THREE.PointLight(0x00aaff, 30);
  wingLightL.castShadow = true;
  airplane.add(wingLightL);
  wingLightL.position.set(-2.5, 0.1, 0.1);

  const wingLightR = new THREE.PointLight(0xffaa00, 30);
  wingLightR.castShadow = true;
  airplane.add(wingLightR);
  wingLightR.position.set(2.5, 0.1, 0.1);

  const topLight = new THREE.PointLight(0xff0000, 10);
  topLight.castShadow = true;
  airplane.add(topLight);
  topLight.position.set(0, 0.5, -1.25);

  function updateTopLight(time, intensity, color) {
    topLight.intensity = intensity
      ? intensity * (Math.sin(time * 10) * 0.5 + 0.5)
      : topLight.intensity;
    topLight.color = color
      ? new THREE.Color(color)
      : topLight.color;
  }

  // Provide a convenience API object. Keep AirplaneGeometry synchronous — the
  // applyAtlasFromURLs method is async and can be awaited by callers when needed.
  const api = {
    airplane,
    updateFanRotation,
    updateTopLight,
    // convenience: fetch JSON mapping then load image and apply atlas to the airplane group
    applyAtlasFromURLs: async function (jsonUrl, imgUrl) {
      try {
        const res = await fetch(jsonUrl);
        if (!res.ok)
          throw new Error(
            `Failed to fetch atlas JSON: ${res.status}`
          );
        const atlasData = await res.json();
        // apply using existing helper which will load the image and remap UVs
        await applyUVAtlasFromURL(atlasData, imgUrl, airplane);
        return true;
      } catch (err) {
        console.error('applyAtlasFromURLs failed:', err);
        return false;
      }
    },
  };

  return api;
}
