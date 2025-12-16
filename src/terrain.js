import * as THREE from 'three';
import * as dat from 'dat.gui';

import {
  vertexShader,
  fragmentShader,
  fragmentShaderRocky,
  fragmentShaderBands,
} from './helpers/shadersTexturadoProcedural.js';

const textures = {
  tierra: { url: 'tierra.jpg', object: null },
  roca: { url: 'stone.jpg', object: null },
  pasto: { url: 'grass.jpg', object: null },
  sand: { url: 'sand.jpg', object: null },
  //elevationMap1: { url: 'elevationMap1.png', object: null },
};
let material;

const params = {
  windDirection: Math.PI / 2,
};

// Load textures from the public `maps` folder and return a Promise that
// resolves when all textures are ready. If textures are already loaded,
// this resolves immediately.
export function loadTexturesAsync() {
  // If already loaded, resolve immediately
  let allLoaded = true;
  for (const k in textures) {
    if (!textures[k].object) {
      allLoaded = false;
      break;
    }
  }
  if (allLoaded) return Promise.resolve(textures);

  return new Promise((resolve, reject) => {
    const loadingManager = new THREE.LoadingManager();

    loadingManager.onLoad = () => {
      console.log('All textures loaded');
      resolve(textures);
    };

    loadingManager.onError = url => {
      console.warn('Texture loading error for:', url);
      // don't reject the whole promise on single texture error; resolve anyway
    };

    for (const key in textures) {
      const loader = new THREE.TextureLoader(loadingManager);
      const texture = textures[key];
      loader.load(
        '/maps/' + texture.url,
        tex => {
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          textures[key].object = tex;
          console.log(`Texture ${key} loaded`);
        },
        undefined,
        err => {
          console.error('Error loading texture', key, err);
          // keep going; LoadingManager will still call onLoad when done
        }
      );
    }
  });
}

export async function createGround(
  path = '/public/heightmap.png',
  width = 500,
  height = 500,
  widthSegments = 256,
  heightSegments = 256,
  scale = 20,
  lowFilter = 10,
  // optional sun direction vector so the terrain uses the same sun as the scene
  sunDirection = new THREE.Vector3(1, 1, 1)
) {
  const geometry = new THREE.BufferGeometry();

  const vertices = [];
  const uvs = [];
  const indices = [];

  // Generate grid vertices and uvs
  for (let y = 0; y <= heightSegments; y++) {
    for (let x = 0; x <= widthSegments; x++) {
      const xpos = (x / widthSegments - 0.5) * width;
      const ypos = (y / heightSegments - 0.5) * height;
      vertices.push(xpos, 0, ypos); // y=0 for now
      uvs.push(x / widthSegments, y / heightSegments);
    }
  }

  // Generate indices
  for (let y = 0; y < heightSegments; y++) {
    for (let x = 0; x < widthSegments; x++) {
      const a = y * (widthSegments + 1) + x;
      const b = a + 1;
      const c = a + (widthSegments + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  geometry.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(uvs, 2)
  );
  geometry.setIndex(indices);

  // Ensure textures are loaded before we create materials that use them
  try {
    await loadTexturesAsync();
  } catch (e) {
    console.warn('Error while waiting for textures:', e);
  }

  // Load heightmap using TextureLoader
  const loader = new THREE.TextureLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      path,
      texture => {
        // Create a canvas to read pixel data
        const img = texture.image;
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(
          0,
          0,
          img.width,
          img.height
        ).data;

        const pos = geometry.getAttribute('position');
        for (let i = 0; i < pos.count; i++) {
          const u = uvs[i * 2];
          const v = uvs[i * 2 + 1];
          const px = Math.floor(u * (img.width - 1));
          const py = Math.floor(v * (img.height - 1));
          const idx = (py * img.width + px) * 4;
          let heightValue = data[idx] / 255; // Use red channel
          if (heightValue < lowFilter) {
            heightValue = -0.5;
          }
          pos.setY(i, heightValue * scale); // Scale as needed
        }
        pos.needsUpdate = true;

        geometry.computeVertexNormals();

        const uniforms = THREE.UniformsUtils.merge([
          THREE.UniformsLib['lights'],
          THREE.UniformsLib['shadowmap'],
          {
            sandSampler: { value: textures.sand.object },
            grassSampler: { value: textures.pasto.object },
            dirtSampler: { value: textures.tierra.object },
            rockSampler: { value: textures.roca.object },
            windDirection: {
              value: new THREE.Vector3(
                Math.cos(params.windDirection),
                0,
                Math.sin(params.windDirection)
              ),
            },
            sunDirection: {
              value: sunDirection.clone().normalize(),
            },
            sandStart: { value: -22.1 },
            sandEnd: { value: -14.3 },
            grassStart: { value: -1.3 },
            grassEnd: { value: 2.0 },
            dirtStart: { value: 6.0 },
            dirtEnd: { value: 18.0 },
            rockStart: { value: 15.0 },
            rockEnd: { value: 25.0 },
            worldNormalMatrix: { value: new THREE.Matrix4() },
          },
        ]);

        material = new THREE.RawShaderMaterial({
          uniforms,
          vertexShader: vertexShader,
          fragmentShader: fragmentShaderBands,
          side: THREE.FrontSide,
          lights: true,
        });
        material.receiveShadow = true;

        const mesh = new THREE.Mesh(geometry, material);
        material.needsUpdate = true;
        material.onBeforeRender = (
          renderer,
          scene,
          camera,
          geometry,
          mesh
        ) => {
          let m = mesh.matrixWorld.clone();
          m = m.transpose().invert();
          mesh.material.uniforms.worldNormalMatrix.value = m;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        };
        mesh.castShadow = mesh.receiveShadow = true;
        console.log('Ground mesh created:', mesh);
        resolve(mesh);
      },
      undefined,
      err => {
        reject(err);
      }
    );
  });
}

export function createMenu() {
  const gui = new dat.GUI({ width: 400 });

  let mat = material;

  gui
    .add(params, 'windDirection', 0, Math.PI * 2)
    .name('wind direction');
  gui
    .add(mat.uniforms.rockStart, 'value', -50, 50)
    .name('rock start');
  gui
    .add(mat.uniforms.rockEnd, 'value', -50, 50)
    .name('rock end');
  gui
    .add(mat.uniforms.dirtStart, 'value', -50, 50)
    .name('dirt start');
  gui
    .add(mat.uniforms.dirtEnd, 'value', -50, 50)
    .name('dirt end');
  gui
    .add(mat.uniforms.grassStart, 'value', -50, 50)
    .name('grass start');
  gui
    .add(mat.uniforms.grassEnd, 'value', -50, 50)
    .name('grass end');
  gui
    .add(mat.uniforms.sandStart, 'value', -50, 50)
    .name('sand start');
  gui
    .add(mat.uniforms.sandEnd, 'value', -50, 50)
    .name('sand end');
}
