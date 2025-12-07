import * as THREE from 'three';
import {
  vertexShader,
  fragmentShader,
  fragmentShaderRocky,
} from './helpers/shadersTexturadoProcedural.js';

const textures = {
  tierra: { url: 'tierra.jpg', object: null },
  roca: { url: 'stone.jpg', object: null },
  pasto: { url: 'grass.jpg', object: null },
  //elevationMap1: { url: 'elevationMap1.png', object: null },
};

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
            //console.log('Low height value filtered:', heightValue);
            heightValue = -0.5;
          }
          pos.setY(i, heightValue * scale); // Scale as needed
        }
        pos.needsUpdate = true;

        geometry.computeVertexNormals();

        const material = new THREE.RawShaderMaterial({
          uniforms: {
            dirtSampler: { value: textures.tierra.object },
            rockSampler: { value: textures.roca.object },
            grassSampler: { value: textures.pasto.object },
            /*
            // default wind direction vector (from params.windDirection angle)
            windDirection: {
              value: new THREE.Vector3(
                Math.cos(params.windDirection),
                0,
                Math.sin(params.windDirection)
              ),
            },
            sunDirection: { value: new THREE.Vector3(1, 1, 1).normalize() },
            snowThresholdLow: { value: 12 },
            snowThresholdHigh: { value: 20 },
            */
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
            // tune these to control where rock/dirt appear (example values)
            rockThresholdLow: { value: 15.0 },
            rockThresholdHigh: { value: 30.0 },
            dirtThresholdLow: { value: 6.0 },
            dirtThresholdHigh: { value: 18.0 },
            // provide a default identity matrix so three.js can upload it
            worldNormalMatrix: { value: new THREE.Matrix4() },
          },
          vertexShader: vertexShader,
          fragmentShader: fragmentShaderRocky,
          //fragmentShader,
          side: THREE.DoubleSide,
        });
        /*new THREE.MeshPhongMaterial({
            color: 0x228833,
            //wireframe: true,
          });
          */
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
        };
        //mesh.rotation.x = -Math.PI / 2;
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
