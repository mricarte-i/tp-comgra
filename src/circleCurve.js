import * as THREE from 'three';

export class CircleCurve3 extends THREE.Curve {
  constructor(
    center = new THREE.Vector3(),
    radius = 100,
    axis = new THREE.Vector3(0, 1, 0)
  ) {
    super();
    this.center = center.clone();
    this.radius = radius;
    this.axis = axis.clone().normalize(); // currently only supports Y-up plane well
  }
  // t in [0,1]
  getPoint(t, optionalTarget = new THREE.Vector3()) {
    const angle = t * Math.PI * 2;
    // circle in XZ plane around center (Y preserved)
    const x = this.center.x + Math.cos(angle) * this.radius;
    const z = this.center.z + Math.sin(angle) * this.radius;
    const y = this.center.y;
    return optionalTarget.set(x, y, z);
  }
  // return unit tangent (direction of travel)
  getTangent(t, optionalTarget = new THREE.Vector3()) {
    const angle = t * Math.PI * 2;
    // derivative normalized for unit radius -> (-sin, 0, cos)
    return optionalTarget
      .set(-Math.sin(angle), 0, Math.cos(angle))
      .normalize();
  }
}
