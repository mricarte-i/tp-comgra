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
	let y = bodyLength * v - bodyLength / 2;
	let z = r * Math.sin(2 * Math.PI * u);

	// Nose taper (front)
	const vNose = noseLength / bodyLength;
	if (v < vNose) {
		let noseTaper = 1 - (vNose - v) / vNose;
		noseTaper = Math.max(0, Math.min(1, noseTaper));
		x *= noseTaper;
		z *= noseTaper;
	}

	// Tail taper (back)
	const vTailStart = 1 - tailLength / bodyLength;
	if (v > vTailStart) {
		let tailTaper = 1 - (v - vTailStart) / (1 - vTailStart);
		tailTaper = Math.max(0, Math.min(1, tailTaper));
		x *= tailTaper;
		z *= tailTaper;

		// Move tail end upwards along the spine
		// This adds an offset to z that goes from 0 at vTailStart to r at v=1
		const tailUp = (r * (v - vTailStart)) / (1 - vTailStart);
		z -= tailUp;
	}

	target.set(x, y, z);
}

function MainBodyMesh() {
	const geometry = new ParametricGeometry(mainbody, 20, 20);
	const material = new THREE.MeshPhongMaterial({
		color: 0x2194ce,
		side: THREE.DoubleSide,
		flatShading: true,
	});
	const mesh = new THREE.Mesh(geometry, material);
	mesh.scale.set(0.5, 0.5, 0.5);
	mesh.rotation.x = Math.PI / 2;
	return mesh;
}

const windSpan = 8;

function mainwing(u, v, target) {
	// the wing should be extruded along the x axis
	// the side rofile from the xz plane is a tear drop shape, the pointy end is at the back
	// Wing lies flat on the xy plane
	const x = windSpan * (v - 0.5); // span: -windSpan/2 to +windSpan/2
	const chord = 1.5 * (1 - Math.abs(2 * v - 1) * 0.8); // chord length at this span position
	const z = chord * (0.5 - Math.abs(2 * u - 1)); // chord: 0 to chord
	const y = 0; // flat on xy plane

	target.set(x, y, z);
}

function MainWingMesh() {
	const geometry = new ParametricGeometry(mainwing, 20, 20);
	const material = new THREE.MeshPhongMaterial({ color: 0x8ac926, flatShading: true });
	const mesh = new THREE.Mesh(geometry, material);
	//mesh.rotation.y = Math.PI / 2;
	//mesh.position.set(-1, 0, 0);
	return mesh;
}

export function AirplaneGeometry() {
	const airplane = new THREE.Group();

	const mainbody = MainBodyMesh();
	airplane.add(mainbody);

	const mainWing = MainWingMesh();
	airplane.add(mainWing);

	return airplane;
}
