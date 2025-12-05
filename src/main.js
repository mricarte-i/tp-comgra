import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AirplaneController } from './airplaneController.js';
import { AirplaneGeometry } from './airplaneModel.js';
import { BaseScene } from './baseScene.js';
import { createGround } from './terrain.js';
import { BoatModel } from './boat.js';
import { CircleCurve3 } from './circleCurve.js';

// for handling keyboard events better
const controls = {};

let container;
let renderer;
let scene;

// cameras
let cameras = [];
let mainCamera = 0;

let camGral;
let camChasePlane;
let camCockpit;
let camOrbitBoat;
let camChaseBoat;
let camTurretBoat;
let camOrbitTower;
let camRunway;

// orbit controls
let orbitControls = [];
let camGralControls;
let camOrbitBoatControls;
let camOrbitTowerControls;

let airplane, updateFanRotation, updateTopLight;
let boat, cannon, updateTurret;
let controller;

const clock = new THREE.Clock();
const camOrbitBoatOffset = new THREE.Vector3(0, 10, 30);
const effectController = {
  turbidity: 1,
  rayleigh: 0.2,
  mieCoefficient: 0.005,
  mieDirectionalG: 0.7,
  elevation: 20,
  azimuth: 25,
  exposure: 0.5, //renderer.toneMappingExposure,
};
const camerasFarClip = 10000;
const groundResolution = 128;
const RENDER_SCALE = 0.5;

async function init() {
  container = document.getElementById('container3D');

  setupRendererAndScene();
  BaseScene(scene, effectController); // axis helper + default lights
  await setupEnvironment();
  await setupAirplane();
  await setupBoatAndBoatCameras();
  setupHelpersAndUI();
  setupEvents();
  // final camera array
  cameras = [
    camGral,
    camChasePlane,
    camCockpit,
    camOrbitBoat,
    camChaseBoat,
    camTurretBoat,
    camOrbitTower,
    camRunway,
  ];
  orbitControls = [
    camGralControls,
    null,
    null,
    camOrbitBoatControls,
    null,
    null,
    camOrbitTowerControls,
    null,
  ];
  // disable orbit controls for other cameras
  // and enable for the selected one
  for (let i = 0; i < orbitControls.length; i++) {
    if (orbitControls[i]) {
      orbitControls[i].enabled = i === mainCamera;
    }
  }
  animate();
}

function setupRendererAndScene() {
  renderer = new THREE.WebGLRenderer();
  renderer.shadowMap.enabled = true;
  scene = new THREE.Scene();
  container.appendChild(renderer.domElement);
  renderer.toneMappingExposure = effectController.exposure;
  renderer.setSize(
    container.offsetWidth * RENDER_SCALE,
    container.offsetHeight * RENDER_SCALE,
    false
  );
  renderer.setPixelRatio(RENDER_SCALE);

  camGral = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    camerasFarClip
  );
  camGral.position.set(250, 10, 0);
  camGral.lookAt(0, 0, 0);

  camGralControls = new OrbitControls(
    camGral,
    renderer.domElement
  );

  // Save/restore camera + controls target
  window.addEventListener('beforeunload', () => {
    localStorage.setItem(
      'cameraPosition',
      JSON.stringify(camGral.position.toArray())
    );
    localStorage.setItem(
      'cameraRotation',
      JSON.stringify(camGral.rotation.toArray())
    );
    if (camGralControls && camGralControls.target) {
      localStorage.setItem(
        'controlsTarget',
        JSON.stringify(camGralControls.target.toArray())
      );
    }
  });

  const savedPosition = localStorage.getItem('cameraPosition');
  const savedRotation = localStorage.getItem('cameraRotation');
  const savedTarget = localStorage.getItem('controlsTarget');
  if (savedPosition)
    camGral.position.fromArray(JSON.parse(savedPosition));
  if (savedRotation)
    camGral.rotation.fromArray(JSON.parse(savedRotation));
  if (camGralControls && camGralControls.target && savedTarget) {
    camGralControls.target.fromArray(JSON.parse(savedTarget));
    camGralControls.update();
  }

  window.addEventListener('resize', onResize);
  onResize();
}

let antennaLight;
function createAirport() {
  const airport = new THREE.Mesh(
    new THREE.BoxGeometry(25, 10, 40),
    new THREE.MeshPhongMaterial({ color: 0x888888 })
  );
  airport.position.set(130, -3.8, 64);
  scene.add(airport);

  const runway = new THREE.Mesh(
    new THREE.BoxGeometry(10, 10, 60),
    new THREE.MeshPhongMaterial({ color: 0x333333 })
  );
  runway.position.set(8.5, 0.5, 0.5);
  airport.add(runway);

  // camera overlooking runway
  camRunway = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.1,
    camerasFarClip
  );
  camRunway.position.set(138, 100, 68);
  camRunway.lookAt(new THREE.Vector3(138, 0, 68));
  scene.add(camRunway);

  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 2, 8, 8),
    new THREE.MeshPhongMaterial({ color: 0x555555 })
  );
  tower.position.set(-6, 7.5, -16);
  airport.add(tower);
  const towerTop = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 1.5, 1.5, 8),
    new THREE.MeshPhongMaterial({ color: 0x777777 })
  );
  towerTop.position.set(0, 4.5, 0);
  tower.add(towerTop);
  const towerAntenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 3, 8),
    new THREE.MeshPhongMaterial({ color: 0x222222 })
  );
  towerAntenna.position.set(0, 2.5, 0);
  towerTop.add(towerAntenna);
  antennaLight = new THREE.PointLight(0xffaa00, 1, 50);
  antennaLight.castShadow = true;
  antennaLight.position.set(0, 1.5, 0);
  towerAntenna.add(antennaLight);

  // camera with orbit controls on tower
  camOrbitTower = new THREE.PerspectiveCamera(
    90,
    window.innerWidth / window.innerHeight,
    0.1,
    camerasFarClip
  );
  camOrbitTower.position.set(20, 50, -24);
  scene.add(camOrbitTower);
  camOrbitTowerControls = new OrbitControls(
    camOrbitTower,
    renderer.domElement
  );
  const towerTarget = new THREE.Vector3();
  tower.getWorldPosition(towerTarget);
  camOrbitTowerControls.target.copy(towerTarget);
  camOrbitTowerControls.update();

  const hangars = new THREE.Group();
  function createHangar() {
    const hangarBase = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 3, 6, 16),
      new THREE.MeshPhongMaterial({
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
}

async function setupEnvironment() {
  const ground = await createGround(
    undefined,
    undefined,
    undefined,
    groundResolution,
    groundResolution,
    30,
    0.01
  );
  ground.position.set(0, -2, 0);
  scene.add(ground);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(10000, 10000),
    new THREE.MeshPhongMaterial({ color: 0x0044ff })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -1;
  scene.add(water);

  // simple stylized waves
  function triangleGeo() {
    const vertices = new Float32Array([
      -1.0, -1.0, 0.0, 1.0, -1.0, 0.0, 0.0, 1.0, 0.0,
    ]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(vertices, 3)
    );
    return geometry;
  }

  function windWakerWaves() {
    const wavesMat = new THREE.MeshPhongMaterial({
      color: 0x55aaff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
      emissive: 0x66bbff,
      emissiveIntensity: 0.3,
    });
    const group = new THREE.Group();
    const m1 = new THREE.Mesh(triangleGeo(), wavesMat);
    const m2 = new THREE.Mesh(triangleGeo(), wavesMat);
    m1.rotation.set(Math.PI / 2, Math.PI / 4, Math.PI / 4);
    m2.rotation.set(Math.PI / 2, -Math.PI / 4, -Math.PI / 4);
    group.add(m1, m2);
    return { group };
  }

  const { group: wavesGroup } = windWakerWaves();
  wavesGroup.position.set(200, 1, 0);
  scene.add(wavesGroup);

  createAirport();

  const sphereGeo = new THREE.SphereGeometry(0.5, 8, 8);
  const sphereMat = new THREE.MeshPhongMaterial({
    color: 0xffff00,
  });
  const cannonBall = new THREE.Mesh(sphereGeo, sphereMat);
  cannonBall.position.set(0, -2, 0);
  cannonBall.castShadow = cannonBall.receiveShadow = true;
  scene.add(cannonBall);

  // expose for updateWindWakerWaves closure
  setupEnvironment._water = water;
  setupEnvironment._waves = wavesGroup;
  setupEnvironment._cannonBall = cannonBall;
  setupEnvironment._isShooting = false;
  setupEnvironment._cannonBallVelocity = new THREE.Vector3(
    0,
    0,
    0
  );
}

function setupAirplane() {
  const res = AirplaneGeometry();
  airplane = res.airplane;
  updateFanRotation = res.updateFanRotation;
  updateTopLight = res.updateTopLight;

  const airplaneSpawn = new THREE.Vector3(138.5, 2, 92);
  scene.add(airplane);

  // chase camera
  camChasePlane = new THREE.PerspectiveCamera(
    90,
    window.innerWidth / window.innerHeight,
    0.1,
    camerasFarClip
  );
  airplane.add(camChasePlane);
  camChasePlane.position.set(0, 3, 5);
  camChasePlane.lookAt(new THREE.Vector3(0, 0, 0));

  // cockpit camera
  camCockpit = new THREE.PerspectiveCamera(
    120,
    window.innerWidth / window.innerHeight,
    0.1,
    camerasFarClip
  );
  airplane.add(camCockpit);
  camCockpit.position.set(0, -0.25, -0.65);
  camCockpit.lookAt(new THREE.Vector3(0, 1, -10));

  // controller
  controller = new AirplaneController(airplane, {
    maxSpeed: 120,
    accelResponse: 2.2,
    drag: 0.015,
    pitchLimit: THREE.MathUtils.degToRad(45),
    bankLimit: THREE.MathUtils.degToRad(60),
    pitchCmdRateDeg: 60,
    bankCmdRateDeg: 90,
    pitchResponse: 5.0,
    bankResponse: 6.0,
    pitchCentering: 1.0,
    bankCentering: 1.5,
    turnRateGain: 1.3,
    yawTaxiRate: Math.PI * 1.4,
    stallSpeed: 12,
    ctrlVRange: 25,
    minY: 2,
  });

  controller.setTransform({
    position: airplaneSpawn,
    euler: new THREE.Euler(0, 0, 0, 'YXZ'),
    throttle: 0,
  });

  setupAirplane._spawn = airplaneSpawn;
}

let turretEndHelper;
async function setupBoatAndBoatCameras() {
  const boatRes = await BoatModel();
  boat = boatRes.boat;
  cannon = boatRes.cannon;
  updateTurret = boatRes.updateTurret;

  boat.position.set(214, -1, 1);
  boat.scale.set(0.5, 0.5, 0.5);
  scene.add(boat);

  // orbit cam (world camera that follows boat)
  camOrbitBoat = new THREE.PerspectiveCamera(
    90,
    window.innerWidth / window.innerHeight,
    0.1,
    camerasFarClip
  );
  camOrbitBoat.position
    .copy(boat.position)
    .add(camOrbitBoatOffset);
  scene.add(camOrbitBoat);
  camOrbitBoatControls = new OrbitControls(
    camOrbitBoat,
    renderer.domElement
  );
  const initialTarget = new THREE.Vector3();
  boat.getWorldPosition(initialTarget);
  camOrbitBoatControls.target.copy(initialTarget);
  camOrbitBoatControls.update();
  setupBoatAndBoatCameras._orbitControls = camOrbitBoatControls;

  // chase cam (attached to boat)
  camChaseBoat = new THREE.PerspectiveCamera(
    90,
    window.innerWidth / window.innerHeight,
    0.1,
    camerasFarClip
  );
  boat.add(camChaseBoat);
  camChaseBoat.position.set(0, 20, -50);
  camChaseBoat.lookAt(new THREE.Vector3(250, -5, 8000));
  //camChaseBoat.lookAt(new THREE.Vector3(-50, 0, 0));

  // turret cam (attached to cannon)
  camTurretBoat = new THREE.PerspectiveCamera(
    90,
    window.innerWidth / window.innerHeight,
    0.1,
    camerasFarClip
  );
  cannon.add(camTurretBoat);
  camTurretBoat.position.set(-6, -15, 0);

  const turretCamHelper = new THREE.AxesHelper(5);
  camTurretBoat.add(turretCamHelper);
  camTurretBoat.rotateOnAxis(
    new THREE.Vector3(0, 0, 1),
    Math.PI
  );
  camTurretBoat.rotateOnAxis(
    new THREE.Vector3(-1, 0, 0),
    Math.PI / 2
  );
  camTurretBoat.rotateOnAxis(
    new THREE.Vector3(0, 0, -1),
    Math.PI / 2
  );

  turretEndHelper = new THREE.AxesHelper(5);
  cannon.add(turretEndHelper);
  turretEndHelper.position.set(0, 8, 0);
}

let axisHelper,
  raycaster,
  cannonRaycaster,
  mouse,
  hudEl,
  helpEl,
  cockpit;
function setupHelpersAndUI() {
  // raycast axis helper
  raycaster = new THREE.Raycaster();
  cannonRaycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  axisHelper = new THREE.AxesHelper(5);
  axisHelper.visible = false;
  scene.add(axisHelper);

  // HUD/help elements
  hudEl = document.getElementById('hud');
  helpEl = document.getElementById('help');
  cockpit = document.getElementById('cockpit');

  // visualize the "destructor" path points from original file
  const path = new CircleCurve3(new THREE.Vector3(0, 0, 0), 275);

  const points = path.getPoints(12);

  const sphereMat = new THREE.MeshPhongMaterial({
    color: 0xff0000,
  });
  for (let i = 0; i < points.length; i++) {
    const sp = new THREE.Mesh(
      new THREE.SphereGeometry(1, 8, 8),
      sphereMat.clone()
    );
    sp.material.color.setHSL(i / points.length, 1, 0.5);
    sp.position.copy(points[i]);
    scene.add(sp);
  }

  // store path for boat movement updates
  setupHelpersAndUI._path = path;
  setupHelpersAndUI._pathTime = 0;
}

let helperLine;
let lastSavedRaycastPoint = null;
function setupEvents() {
  // key controls
  window.addEventListener('keydown', event => {
    controls[event.code] = true;
  });
  window.addEventListener('keyup', event => {
    controls[event.code] = false;
  });

  // mouse move raycast
  window.addEventListener('mousemove', event => {
    mouse.x =
      (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y =
      -(event.clientY / renderer.domElement.clientHeight) * 2 +
      1;
    raycaster.setFromCamera(mouse, cameras[mainCamera]);
    const intersects = raycaster.intersectObjects(
      scene.children
    );
    let closest = null;
    for (let i = 0; i < intersects.length; i++) {
      if (
        intersects[i].object !== axisHelper &&
        (intersects[i].distance < closest?.distance || !closest)
      ) {
        closest = intersects[i];
      }
    }
    if (closest) {
      axisHelper.position.copy(closest.point);
      axisHelper.visible = true;

      if (!controls['ShiftLeft'] && !controls['ShiftRight']) {
        lastSavedRaycastPoint = closest.point.clone();
      } else {
        //draw a line from lastSavedRaycastPoint to the current point
        if (lastSavedRaycastPoint) {
          if (helperLine) {
            scene.remove(helperLine);
          }
          const points = [];
          points.push(lastSavedRaycastPoint);
          points.push(closest.point);
          const geometry =
            new THREE.BufferGeometry().setFromPoints(points);
          const material = new THREE.LineBasicMaterial({
            color: 0xffff00,
          });
          helperLine = new THREE.Line(geometry, material);
          scene.add(helperLine);
        }
      }
    } else {
      axisHelper.visible = false;
    }
  });

  window.addEventListener('keydown', e => {
    if (e.code === 'KeyR') {
      // reset airplane to spawn
      controller.setTransform({
        position: setupAirplane._spawn,
        euler: new THREE.Euler(0, 0, 0, 'YXZ'),
        throttle: 0,
      });
      camGral.position.set(250, 10, 0);
      camGral.lookAt(0, 0, 0);
      setupHelpersAndUI._pathTime = 0;
    }
    if (e.code === 'KeyH') {
      console.log('helper at:', axisHelper.position);
    }

    // switch cameras with number keys
    if (e.key >= '1' && e.key <= '8') {
      const idx = parseInt(e.key, 10) - 1;
      if (idx < cameras.length) {
        mainCamera = idx;
        // disable orbit controls for other cameras
        // and enable for the selected one
        for (let i = 0; i < orbitControls.length; i++) {
          if (orbitControls[i]) {
            orbitControls[i].enabled = i === mainCamera;
          }
        }
      } else {
        mainCamera = Math.min(idx, cameras.length - 1);
      }
      if (mainCamera === 2) {
        cockpit.style.display = 'block';
      } else {
        cockpit.style.display = 'none';
      }
    }
  });
}

function onResize() {
  const w = container.offsetWidth;
  const h = container.offsetHeight;
  for (let cam of cameras) {
    if (cam && cam.isPerspectiveCamera) {
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    }
  }
  renderer.setSize(w, h);
}

function updateHelp() {
  if (!helpEl) return;
  if (mainCamera === 1 || mainCamera === 2) {
    helpEl.innerHTML = `▲/▼: Pitch • ◀/▶: Roll • PageUp/PageDown: Throttle • (mantené presionadas
        las flechas)<br />
        Consejo: subí throttle con PageUp y dale algo de roll para virar. <br />
        Presioná R para resetear. <br />
        1,2,3,4,5,6,7,8 para cambiar cámara. <br />`;
  } else if (
    mainCamera === 4 ||
    mainCamera === 5 ||
    mainCamera === 6
  ) {
    helpEl.innerHTML = `Mouse: orbitar cámara • Rueda: zoom • Clic izquierdo: orbitar • Clic derecho: moverse  <br />
        I/K: Pitch • J/L: Yaw • Espacio: disparar torreta • (mantené presionadas las flechas)<br />
        Presioná R para resetear. <br />
        1,2,3,4,5,6,7,8 para cambiar cámara. <br />`;
  } else {
    helpEl.innerHTML = `Mouse: mover cámara • Rueda: zoom • Clic izquierdo: orbitar • Clic derecho: moverse  <br />
        Presioná R para resetear. <br />
        1,2,3,4,5,6,7,8 para cambiar cámara. <br />`;
  }
}

function updateHUD() {
  if (!hudEl) return;
  const s = controller.getStatus();
  hudEl.innerHTML =
    `Vel: ${s.speed.toFixed(1)} u/s<br>` +
    `Throttle: ${(controller.getEnginePower() * 100) | 0}%<br>` +
    `Pitch/Bank: ${s.pitchDeg.toFixed(0)}° / ${s.bankDeg.toFixed(
      0
    )}°<br>` +
    `Raycast: ${
      axisHelper.visible
        ? `x:${axisHelper.position.x.toFixed(
            1
          )} y:${axisHelper.position.y.toFixed(
            1
          )} z:${axisHelper.position.z.toFixed(1)}`
        : '---'
    }<br>`;
  if (
    lastSavedRaycastPoint &&
    (controls['ShiftLeft'] || controls['ShiftRight'])
  ) {
    hudEl.innerHTML += `Distance: ${lastSavedRaycastPoint
      .distanceTo(axisHelper.position)
      .toFixed(1)} u<br>`;
  }
}

function updateWindWakerWaves(time) {
  const water = setupEnvironment._water;
  const waves = setupEnvironment._waves;
  const dist = airplane.position.distanceTo(water.position);
  const speed = controller.getStatus().speed;
  const scale = Math.min(
    Math.max(0, 30 - dist) * 0.1 + speed * 0.05,
    10
  );
  const waveMotion =
    0.75 + 0.25 * Math.sin(time * 3 + speed * 0.5);
  waves.position.set(
    airplane.position.x,
    water.position.y,
    airplane.position.z
  );
  waves.quaternion.copy(airplane.quaternion);
  waves.scale.setScalar(scale * waveMotion);
}

function updateBoat(dt) {
  const path = setupHelpersAndUI._path;
  setupHelpersAndUI._pathTime += dt;
  const speed = 0.01;
  const t = (setupHelpersAndUI._pathTime * speed) % 1;
  const position = path.getPointAt(t);
  boat.position.copy(position);

  const tangent = path.getTangentAt(t).clone();
  tangent.y = 0;
  if (tangent.lengthSq() > 1e-6) {
    tangent.normalize();
    const modelForward = new THREE.Vector3(0, 0, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(
      modelForward,
      tangent
    );
    boat.quaternion.copy(q);
  }

  const worldPos = new THREE.Vector3();
  boat.getWorldPosition(worldPos);

  // follow orbit camera smoothly
  const desiredCamPos = worldPos.clone().add(camOrbitBoatOffset);
  const damping = Math.min(1, dt * 2);
  camOrbitBoat.position.lerp(desiredCamPos, damping);

  // update orbit controls target
  const controls = setupBoatAndBoatCameras._orbitControls;
  if (controls) {
    controls.target.copy(worldPos);
    controls.update();
  }
}

const explosionDuration = 1; // seconds
let explosions = [];
function spawnExplosion(position, startTime) {
  const geo = new THREE.SphereGeometry(0.1, 16, 16);
  const mat = new THREE.MeshPhongMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(position);
  scene.add(mesh);
  explosions.push({ mesh, mat, geo, startTime });
}

const gravityForce = -9.81;
const shotForce = 90;
let initialShotPos = null;
function turretShooting(dt) {
  if (!cannon || !turretEndHelper) return;
  const cannonBall = setupEnvironment._cannonBall;
  const velocity = setupEnvironment._cannonBallVelocity;
  const g = new THREE.Vector3(0, gravityForce, 0); // gravity

  // Fire cannon
  if (controls['Space'] && !setupEnvironment._isShooting) {
    const worldPos = new THREE.Vector3();
    turretEndHelper.getWorldPosition(worldPos);
    initialShotPos = worldPos.clone();
    cannonBall.position.copy(worldPos);
    // initial direction: local (0,1,0) in cannon space (matches previous code)
    const forward = new THREE.Vector3(0, 1, 0).applyQuaternion(
      cannon.getWorldQuaternion(new THREE.Quaternion())
    );
    const initialSpeed = shotForce; // tweak as needed
    velocity.copy(forward).multiplyScalar(initialSpeed);
    setupEnvironment._isShooting = true;
  }

  // v(t+dt) = v(t) + g * dt
  // p(t+dt) = p(t) + v(t+dt) * dt
  if (setupEnvironment._isShooting) {
    // raycast along velocity for collisions within this timestep
    const travelDist = velocity.length() * dt;
    if (travelDist > 1e-6) {
      const origin = cannonBall.position.clone();
      const dir = velocity.clone().normalize();
      cannonRaycaster.set(origin, dir);
      // check all scene objects (true = recursive)
      // and ignore the cannonBall itself
      const intersects = cannonRaycaster
        .intersectObjects(scene.children, true)
        .filter(i => i.object !== cannonBall);
      if (intersects.length > 0) {
        const hit = intersects.find(
          i => i.distance <= travelDist + 0.01
        );
        if (hit && hit.object.type === 'Mesh') {
          // place cannonBall at impact point and end flight
          const distance = hit.point.distanceTo(initialShotPos);
          console.log('Cannonball hit!\nDistance:', distance);

          spawnExplosion(hit.point, clock.elapsedTime);
          cannonBall.position.copy(hit.point);
          setupEnvironment._isShooting = false;
          velocity.set(0, 0, 0);
          return;
        }
      }
    }

    // advance cannonball physics
    // v(t+dt) = v(t) + g * dt
    const vNew = velocity.clone().addScaledVector(g, dt);
    // p(t+dt) = p(t) + v(t+dt) * dt
    cannonBall.position.addScaledVector(vNew, dt);
    // store updated velocity
    velocity.copy(vNew);

    // stop when underwater and reset
    if (cannonBall.position.y <= -2) {
      cannonBall.position.y = -1;
      setupEnvironment._isShooting = false;
      velocity.set(0, 0, 0);
    }
  }
}

const explosionMaxScale = 100;
function updateExplosions(now) {
  for (let i = explosions.length - 1; i >= 0; i--) {
    const exp = explosions[i];
    const elapsed = now - exp.startTime;
    if (elapsed >= explosionDuration) {
      // remove explosion
      scene.remove(exp.mesh);
      exp.geo.dispose();
      exp.mat.dispose();
      explosions.splice(i, 1);
      console.log('Explosion ended');
    } else {
      // update size and opacity
      const t = elapsed / explosionDuration;
      let scale, opacity;
      if (t < 0.5) {
        // expanding
        scale = THREE.MathUtils.lerp(
          0.1,
          explosionMaxScale,
          t * 2
        );
        opacity = THREE.MathUtils.lerp(1, 0.5, t * 2);
      } else {
        // contracting
        scale = THREE.MathUtils.lerp(
          explosionMaxScale,
          0.1,
          (t - 0.5) * 2
        );
        opacity = THREE.MathUtils.lerp(0.5, 0, (t - 0.5) * 2);
      }
      exp.mesh.scale.setScalar(scale);
      exp.mat.opacity = opacity;
    }
  }
}

function updateAirportLights(now) {
  const intensity = 0.5 + 10 * Math.sin(now * 5);
  antennaLight.intensity = intensity;
}

function animate() {
  const dt = Math.min(0.05, clock.getDelta());

  //  airplane related stuff
  controller.update(dt);
  updateFanRotation(
    clock.elapsedTime,
    controller.getStatus().speed
  );
  updateTopLight(
    clock.elapsedTime,
    20 * 0.0001 * controller.getStatus().speed,
    mainCamera === 4
      ? 0xff0000
      : mainCamera === 5
      ? 0x00ff00
      : mainCamera === 6
      ? 0x0000ff
      : 0xffffff
  );
  updateWindWakerWaves(clock.elapsedTime);

  // hud and help
  updateHUD();
  updateHelp();

  // boat and turret stuff
  if (updateTurret) {
    updateTurret(dt, clock.elapsedTime);
  }
  updateBoat(dt);
  turretShooting(dt);
  updateExplosions(clock.elapsedTime);

  // lighting
  updateAirportLights(clock.elapsedTime);

  renderer.render(scene, cameras[mainCamera]);
  requestAnimationFrame(animate);
}

// start
init().catch(err => {
  console.error('Initialization failed:', err);
});
