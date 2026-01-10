import * as THREE from 'three';

// simple stylized waves
export function triangleGeo() {
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

export function windWakerWaves() {
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

export function spawnExplosion(position, startTime) {
  const geo = new THREE.SphereGeometry(0.1, 16, 16);
  const mat = new THREE.MeshPhongMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 1,
    emissive: 0xff6600,
    emissiveIntensity: 12,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(position);
  scene.add(mesh);
  explosions.push({ mesh, mat, geo, startTime });
}
