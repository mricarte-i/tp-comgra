import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

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
  function createHangar() {
    const hangarBase = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 3, 6, 16),
      new THREE.MeshStandardMaterial({
        color: 0x999999,
        side: THREE.DoubleSide,
      })
    );
    hangarBase.rotation.set(0, 0, Math.PI / 2);
    return hangarBase;
  }
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
