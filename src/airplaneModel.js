import * as THREE from 'three';
import { ParametricGeometry } from 'three/examples/jsm/Addons.js';

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
  let uvs = [];
  for (let i = 0; i < geometry.attributes.uv.count; i++) {
    let u = geometry.attributes.uv.getX(i);
    let v = geometry.attributes.uv.getY(i);
    // get vertex positions
    let x = geometry.attributes.position.getX(i);
    let y = geometry.attributes.position.getY(i);
    let z = geometry.attributes.position.getZ(i);

    // define UVs
    u = y / 6 + 0.5;
    v = -z / 6 + 0.5;

    uvs.push(u, v);
  }
  geometry.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(uvs, 2)
  );
  let uvTexture = new THREE.TextureLoader().load(
    '/airplane/main_body.jpg'
  );
  uvTexture.wrapS = THREE.RepeatWrapping;
  uvTexture.wrapT = THREE.RepeatWrapping;
  const material = new THREE.MeshPhongMaterial({
    //color: 0x2194ce,
    map: uvTexture,
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

  let uvs = [];
  for (let i = 0; i < geometry.attributes.uv.count; i++) {
    let u = geometry.attributes.uv.getX(i);
    let v = geometry.attributes.uv.getY(i);
    // get vertex positions
    let x = geometry.attributes.position.getX(i);
    let y = geometry.attributes.position.getY(i);
    let z = geometry.attributes.position.getZ(i);

    // define UVs
    u = -x / 2 + 0.5;
    v = -z / 4 + 0.5;

    uvs.push(u, v);
  }
  geometry.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(uvs, 2)
  );
  let uvTexture = new THREE.TextureLoader().load(
    '/airplane/wing_map.jpg'
  );
  uvTexture.wrapS = THREE.RepeatWrapping;
  uvTexture.wrapT = THREE.RepeatWrapping;

  const material = new THREE.MeshPhongMaterial({
    //color: 0x8ac926,
    map: uvTexture,
    //flatShading: true,
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

  let uvs = [];
  for (let i = 0; i < geometry.attributes.uv.count; i++) {
    let u = geometry.attributes.uv.getX(i);
    let v = geometry.attributes.uv.getY(i);
    // get vertex positions
    let x = geometry.attributes.position.getX(i);
    let y = geometry.attributes.position.getY(i);
    let z = geometry.attributes.position.getZ(i);

    // define UVs
    u = -x * 2;
    v = -z / 2 + 0.5;

    uvs.push(u, v);
  }
  geometry.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(uvs, 2)
  );
  let uvTexture = new THREE.TextureLoader().load(
    '/airplane/wing_map.jpg'
  );
  uvTexture.wrapS = THREE.RepeatWrapping;
  uvTexture.wrapT = THREE.RepeatWrapping;
  const material = new THREE.MeshPhongMaterial({
    //color: 0xff6f91,
    map: uvTexture,
    //flatShading: true,
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
  let uvs = [];
  for (let i = 0; i < geometry.attributes.uv.count; i++) {
    let u = geometry.attributes.uv.getX(i);
    let v = geometry.attributes.uv.getY(i);
    // get vertex positions
    let x = geometry.attributes.position.getX(i);
    let y = geometry.attributes.position.getY(i);
    let z = geometry.attributes.position.getZ(i);

    // define UVs
    u = -x * 2;
    v = -z / 2 + 0.65;

    uvs.push(u, v);
  }
  geometry.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(uvs, 2)
  );
  let uvTexture = new THREE.TextureLoader().load(
    '/airplane/wing_map.jpg'
  );
  uvTexture.wrapS = THREE.RepeatWrapping;
  uvTexture.wrapT = THREE.RepeatWrapping;
  const material = new THREE.MeshPhongMaterial({
    map: uvTexture,
    //flatShading: true,
    //side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.z = Math.PI / 2;
  mesh.rotation.x = -0.05;
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
  let uvs = [];
  for (let i = 0; i < geometry.attributes.uv.count; i++) {
    let u = geometry.attributes.uv.getX(i);
    let v = geometry.attributes.uv.getY(i);
    // get vertex positions
    let x = geometry.attributes.position.getX(i);
    let y = geometry.attributes.position.getY(i);
    let z = geometry.attributes.position.getZ(i);

    // define UVs
    u = -x + 0.5;
    v = -z / 2 + 0.5;

    uvs.push(u, v);
  }
  geometry.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(uvs, 2)
  );
  let uvTexture = new THREE.TextureLoader().load(
    '/airplane/engine_map.jpg'
  );
  uvTexture.wrapS = THREE.RepeatWrapping;
  uvTexture.wrapT = THREE.RepeatWrapping;
  const material = new THREE.MeshPhongMaterial({
    //color,
    map: uvTexture,
    //side: THREE.DoubleSide,
    //flatShading: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, -length, 0);
  return mesh;
}

function FanBlades(color = 0xcdcdcd) {
  const engGroup = new THREE.Group();

  // A few shapes for the fan blades
  const bladeGeometry = new THREE.BoxGeometry(0.05, 0.02, 0.5);
  const bladeMaterial = new THREE.MeshPhongMaterial({
    color,
    //side: THREE.DoubleSide,
    //flatShading: true,
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

  const fan1 = FanBlades();
  fan1.position.set(
    -primaryEngineXOffset,
    primaryEngineYOffset,
    primaryEngineZOffset - 0.02
  );
  airplane.add(fan1);
  const fan2 = FanBlades();
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

  const fan3 = FanBlades();
  fan3.position.set(
    -secondaryEngineXOffset,
    primaryEngineYOffset,
    secondaryEngineZOffset - 0.02
  );
  airplane.add(fan3);
  const fan4 = FanBlades();
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

  const wingLightL = new THREE.PointLight(0x00ff00, 20);
  wingLightL.castShadow = true;
  airplane.add(wingLightL);
  wingLightL.position.set(-2.5, 0.1, 0.1);

  const wingLightR = new THREE.PointLight(0xff0000, 20);
  wingLightR.castShadow = true;
  airplane.add(wingLightR);
  wingLightR.position.set(2.5, 0.1, 0.1);

  const topLight = new THREE.PointLight(0xff0000, 5);
  topLight.castShadow = true;
  airplane.add(topLight);
  topLight.position.set(0, 0.5, -1.25);

  function updateTopLight(time, intensity, color) {
    topLight.intensity =
      intensity * (Math.sin(time * 10) * 0.5 + 0.5);

    wingLightL.intensity =
      intensity * 4 * (Math.sin(time * 10) * 0.5 + 0.5);
    wingLightR.intensity =
      intensity * 4 * (Math.sin(time * 10) * 0.5 + 0.5);
    headLight.intensity =
      intensity * 10 * (Math.sin(time * 10) * 0.5 + 0.5);

    topLight.color = color
      ? new THREE.Color(color)
      : topLight.color;
  }

  function updateFanRotation(time, speed) {
    const angle = (time * speed) % (2 * Math.PI);
    fan1.rotation.z = angle;
    fan2.rotation.z = angle;
    fan3.rotation.z = angle;
    fan4.rotation.z = angle;
  }

  return { airplane, updateFanRotation, updateTopLight };
}
