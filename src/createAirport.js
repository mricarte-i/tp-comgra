import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

// helper to load a texture as a Promise
function loadTextureAsync(path) {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      path,
      tex => resolve(tex),
      undefined,
      err => reject(err)
    );
  });
}

// Async factory to create the airport. Returns an object with
// camRunway, camOrbitTower, camOrbitTowerControls, antennaLight.
export async function createAirport(
  scene,
  renderer,
  camerasFarClip
) {
  const tarmacMaterial = new THREE.MeshStandardMaterial({});
  try {
    const tex = await loadTextureAsync('/airport/tarmac.jpg');
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);

    const normalMap = await loadTextureAsync(
      '/airport/tarmac-normal.jpg'
    );
    normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(8, 8);

    tarmacMaterial.normalMap = normalMap;
    tarmacMaterial.map = tex;
    tarmacMaterial.needsUpdate = true;
  } catch (e) {
    console.warn(
      'Failed to load runway texture, using solid color',
      e
    );
  }
  const airport = new THREE.Mesh(
    new THREE.BoxGeometry(25, 10, 40),
    tarmacMaterial
  );
  airport.position.set(130, -3.8, 64);
  scene.add(airport);

  let runwayMaterial = new THREE.MeshStandardMaterial({
    shininess: 0.5,
    reflectivity: 0.2,
    normalScale: new THREE.Vector2(0.1, 0.1),
  });
  try {
    const tex = await loadTextureAsync('/airport/runway.jpg');
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 4);

    const normalMap = await loadTextureAsync(
      '/airport/runway-normal.jpg'
    );
    normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(1, 4);

    runwayMaterial.normalMap = normalMap;
    runwayMaterial.map = tex;
    runwayMaterial.needsUpdate = true;
  } catch (e) {
    console.warn(
      'Failed to load runway texture, using solid color',
      e
    );
  }
  const runway = new THREE.Mesh(
    new THREE.BoxGeometry(10, 10, 60),
    runwayMaterial
  );
  runway.position.set(8.5, 0.5, 0.5);
  airport.add(runway);

  // runway wrapper
  const runwayWrapper = new THREE.Mesh(
    new THREE.BoxGeometry(11, 9, 61),
    tarmacMaterial
  );
  runwayWrapper.receiveShadow = true;
  runwayWrapper.castShadow = true;
  runwayWrapper.position.set(8.5, 0.75, 0.5);
  airport.add(runwayWrapper);

  // camera overlooking runway
  const camRunway = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.1,
    camerasFarClip
  );
  camRunway.position.set(138, 100, 68);
  camRunway.lookAt(new THREE.Vector3(138, 0, 68));
  scene.add(camRunway);

  /////////////////
  // control tower
  /////////////////
  const matTowerTop = new THREE.MeshStandardMaterial({});
  const matTowerTopRoof = new THREE.MeshStandardMaterial({});
  try {
    const windowTexture = await loadTextureAsync(
      '/airport/tower-top-window.jpg'
    );
    windowTexture.wrapS = THREE.RepeatWrapping;
    windowTexture.wrapT = THREE.ClampToEdgeWrapping;
    windowTexture.repeat.set(8, 1);

    matTowerTop.map = windowTexture;
    matTowerTop.needsUpdate = true;

    const roofTexture = await loadTextureAsync(
      '/airport/tower-top-wall.jpg'
    );
    const roofTextureNormal = await loadTextureAsync(
      '/airport/tower-top-wall-normal.jpg'
    );
    roofTextureNormal.wrapS = THREE.RepeatWrapping;
    roofTextureNormal.wrapT = THREE.ClampToEdgeWrapping;
    roofTextureNormal.repeat.set(8, 1);

    roofTexture.wrapS = roofTexture.wrapT =
      THREE.ClampToEdgeWrapping;
    roofTexture.repeat.set(1, 1);

    matTowerTopRoof.map = roofTexture;
    matTowerTopRoof.normalMap = roofTextureNormal;
    matTowerTopRoof.needsUpdate = true;
  } catch (e) {
    console.warn(
      'Failed to load runway texture, using solid color',
      e
    );
  }
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 2, 8, 8),
    matTowerTopRoof
  );
  tower.position.set(-6, 7.5, -16);
  airport.add(tower);
  // tower top
  const towerTop = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 1.5, 1.5, 8),
    matTowerTop
  );
  towerTop.position.set(0, 4.5, 0);
  tower.add(towerTop);
  const towerTopRoof = new THREE.Mesh(
    new THREE.ConeGeometry(2.6, 0.5, 8),
    matTowerTopRoof
  );
  towerTopRoof.position.set(0, 1, 0);
  towerTop.add(towerTopRoof);
  // tower antenna and light
  const towerAntenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 3, 8),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
  );
  towerAntenna.position.set(0, 2.5, 0);
  towerTop.add(towerAntenna);
  const antennaLight = new THREE.PointLight(0xffaa00, 1, 50);
  antennaLight.castShadow = true;
  antennaLight.position.set(0, 1.5, 0);
  towerAntenna.add(antennaLight);

  // camera with orbit controls on tower
  const camOrbitTower = new THREE.PerspectiveCamera(
    90,
    window.innerWidth / window.innerHeight,
    0.1,
    camerasFarClip
  );
  camOrbitTower.position.set(20, 50, -24);
  scene.add(camOrbitTower);
  const camOrbitTowerControls = new OrbitControls(
    camOrbitTower,
    renderer.domElement
  );
  const towerTarget = new THREE.Vector3();
  tower.getWorldPosition(towerTarget);
  camOrbitTowerControls.target.copy(towerTarget);
  camOrbitTowerControls.update();

  /////////////////
  // hangars
  /////////////////
  const hangars = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const hangar = createHangar();
    hangar.position.set(-10, 5, 15 + i * 7);
    hangars.add(hangar);
  }
  hangars.position.set(4, 0, -16);
  airport.add(hangars);

  [
    airport,
    runway,
    tower,
    towerTop,
    towerAntenna,
    ...hangars.children,
  ].forEach(m => {
    m.castShadow = m.receiveShadow = true;
  });

  return {
    camRunway,
    camOrbitTower,
    camOrbitTowerControls,
    antennaLight,
  };
}

function createHangar() {
  const radius = 3;
  const height = 6;
  const radialSegments = 16;
  let parts = makeSplitCylinder(radius, height, radialSegments);
  //merge geometries
  let geometry = BufferGeometryUtils.mergeGeometries(
    [parts.walls, parts.caps.top, parts.caps.bottom],
    false
  );
  // get counts for later
  const countWalls =
    (parts.walls.attributes.position.count - 1) * 3;
  const countTop = parts.caps.top.attributes.position.count * 3;
  const countBottom =
    parts.caps.bottom.attributes.position.count * 3;

  // override uvs to map the entire texture on each part
  let uvs = [];
  // walls
  for (let i = 0; i < parts.walls.attributes.uv.count; i++) {
    // get current uv
    let u = parts.walls.attributes.uv.getX(i);
    let v = parts.walls.attributes.uv.getY(i);
    // get vertex position
    let x = parts.walls.attributes.position.getX(i);
    let y = parts.walls.attributes.position.getY(i);
    let z = parts.walls.attributes.position.getZ(i);

    // definir aqui el mapeo UV para las paredes
    u = y / height + 0.5;
    v = -z / height + 0.5;

    uvs.push(u);
    uvs.push(v);
  }
  // top
  for (let i = 0; i < parts.caps.top.attributes.uv.count; i++) {
    // get current uv
    let u = parts.caps.top.attributes.uv.getX(i);
    let v = parts.caps.top.attributes.uv.getY(i);
    // get vertex position
    let x = parts.caps.top.attributes.position.getX(i);
    let y = parts.caps.top.attributes.position.getY(i);
    let z = parts.caps.top.attributes.position.getZ(i);

    // definir aqui el mapeo UV para la tapa superior
    u = x / (2 * radius) + 0.5;
    v = -z / (2 * radius) + 0.5;

    uvs.push(u);
    uvs.push(v);
  }
  // bottom
  for (
    let i = 0;
    i < parts.caps.bottom.attributes.uv.count;
    i++
  ) {
    // get current uv
    let u = parts.caps.bottom.attributes.uv.getX(i);
    let v = parts.caps.bottom.attributes.uv.getY(i);
    // get vertex position
    let x = parts.caps.bottom.attributes.position.getX(i);
    let y = parts.caps.bottom.attributes.position.getY(i);
    let z = parts.caps.bottom.attributes.position.getZ(i);

    // definir aqui el mapeo UV para la tapa inferior
    u = -x / (2 * radius) + 0.5;
    v = -z / (2 * radius) + 0.5;

    uvs.push(u);
    uvs.push(v);
  }
  geometry.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(uvs, 2)
  );

  // load /maps/cap_map.jpg and wall_map.jpg as textures
  let textureLoader = new THREE.TextureLoader();
  let wallTexture = textureLoader.load('/airport/wall_map.jpg');
  let capTexture = textureLoader.load('/airport/cap_map.jpg');
  let uvTexture = textureLoader.load('/uv.jpg');
  // set repeat for all textures
  uvTexture.wrapS = THREE.RepeatWrapping;
  uvTexture.wrapT = THREE.RepeatWrapping;

  capTexture.wrapS = capTexture.wrapT = THREE.RepeatWrapping;
  wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;

  let wallNormal = textureLoader.load(
    '/airport/wall_map-normal.jpg'
  );
  wallNormal.wrapS = THREE.RepeatWrapping;
  wallNormal.wrapT = THREE.RepeatWrapping;

  let capNormal = textureLoader.load(
    '/airport/cap_map-normal.jpg'
  );
  capNormal.wrapS = THREE.RepeatWrapping;
  capNormal.wrapT = THREE.RepeatWrapping;

  // set different textures for walls and caps using groups
  const materials = [];
  materials.push(
    new THREE.MeshStandardMaterial({
      map: wallTexture,
      normalMap: wallNormal,
    })
  ); // walls
  materials.push(
    new THREE.MeshStandardMaterial({
      map: capTexture,
      normalMap: capNormal,
    })
  ); // top

  geometry.addGroup(0, countWalls, 0); // walls
  geometry.addGroup(countWalls - 3, countTop + countBottom, 1); // caps

  let cylinder = new THREE.Mesh(geometry, materials);
  cylinder.rotation.z = Math.PI / 2;
  cylinder.rotation.x = Math.PI / 2;
  return cylinder;
}

// source: https://github.com/fedemarino31/cg7258/blob/main/demoMapeoUV/src/main.js
// Crea un cilindro dividido en paredes y tapas.
// radio: número (requerido)
// altura: número (requerido)
// radialSegments: número (opcional, default 64)
function makeSplitCylinder(radius, height, radialSegments = 64) {
  const walls = new THREE.CylinderGeometry(
    radius, // radiusTop
    radius, // radiusBottom
    height, // height
    radialSegments, // radialSegments
    1, // heightSegments
    true // openEnded
  );

  // --- TAPAS ---
  const top = new THREE.CircleGeometry(radius, radialSegments);
  top.rotateX(-Math.PI / 2);
  top.translate(0, height / 2, 0);

  const bottom = new THREE.CircleGeometry(
    radius,
    radialSegments
  );
  bottom.rotateX(Math.PI / 2);
  bottom.translate(0, -height / 2, 0);

  function scaleV(geometry, factor = 10) {
    const uv = geometry.attributes.uv;
    if (uv) {
      for (let i = 0; i < uv.count; i++) {
        uv.setY(i, uv.getY(i) * factor);
      }
      uv.needsUpdate = true;
    }
  }

  scaleV(walls);
  scaleV(top);
  scaleV(bottom);

  return {
    walls,
    caps: {
      top,
      bottom,
    },
  };
}
