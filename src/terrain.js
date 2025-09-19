import * as THREE from 'three';

export function createGround() {
  const groundGeo = new THREE.PlaneGeometry(500, 500, 256, 256);
  let heightMap = new THREE.TextureLoader().load(
    '/public/heightmap.png',
    tex => {
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = 4;
      tex.needsUpdate = true;
    },
    evt => {
      console.log('Loading texture...', evt);
    },
    err => {
      console.error('Error loading texture:', err);
    }
  );
  heightMap.wrapS = THREE.RepeatWrapping;
  heightMap.wrapT = THREE.RepeatWrapping;
  heightMap.repeat.set(1, 1);

  const groundMat = new THREE.MeshPhongMaterial({
    color: 0x228833,
    //side: THREE.DoubleSide,
    wireframe: true,
    displacementMap: heightMap,
    displacementScale: 20,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.castShadow = ground.receiveShadow = true;
  return ground;
}

export function createGroundBufferManual(
  path = '/public/heightmap.png',
  width = 500,
  height = 500,
  widthSegments = 256,
  heightSegments = 256,
  callback
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
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  // Load heightmap using TextureLoader
  const loader = new THREE.TextureLoader();
  loader.load(path, texture => {
    // Create a canvas to read pixel data
    const img = texture.image;
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height).data;

    const pos = geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const u = uvs[i * 2];
      const v = uvs[i * 2 + 1];
      const px = Math.floor(u * (img.width - 1));
      const py = Math.floor(v * (img.height - 1));
      const idx = (py * img.width + px) * 4;
      const heightValue = data[idx] / 255; // Use red channel
      pos.setY(i, heightValue * 20); // Scale as needed
    }
    pos.needsUpdate = true;

    geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial({
      color: 0x228833,
      //wireframe: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    //mesh.rotation.x = -Math.PI / 2;
    mesh.castShadow = mesh.receiveShadow = true;

    if (callback) callback(mesh);
  });
}
