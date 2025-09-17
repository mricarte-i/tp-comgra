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

function wingsFunc(
	wingSpan,
	wingThickness, // thickness as a fraction of chord (e.g., 0.15 = 15%)
	chordMax, // maximum chord length at the wing root
	chordShrink // how much the chord reduces towards the wingtips (0 to 1)
) {
	return function (u, v, target) {
		// Wing lies on the xz plane, with thickness in y
		const x = wingSpan * (v - 0.5);
		const chord = chordMax * (1 - Math.abs(2 * v - 1) * chordShrink);
		const chordPos = Math.abs(2 * u - 1); // 0 at center, 1 at edges
		const z = chord * (0.5 - chordPos);

		const maxThickness = wingThickness * chord;
		// max at center, 0 at edges
		const thicknessProfile = maxThickness * (1 - chordPos * chordPos);

		// If u < 0.5, lower surface; if u >= 0.5, upper surface
		const y = u < 0.5 ? thicknessProfile / 2 : -thicknessProfile / 2;

		// hacky caps for the wings
		//on the last unit, make the wing end in a point
		if (v === 1 || v === 0) {
			target.set(x, 0, z);
			return;
		}

		target.set(x, y, z);
	};
}

function MainWingMesh() {
	const mainWingSpan = 5;
	const mainWingThickness = 0.1;
	const mainChordShrink = 0.5;
	const mainChordMax = 0.75;

	const geometry = new ParametricGeometry(
		wingsFunc(mainWingSpan, mainWingThickness, mainChordMax, mainChordShrink),
		20,
		20
	);
	const material = new THREE.MeshPhongMaterial({
		color: 0x8ac926,
		flatShading: true,
		//side: THREE.DoubleSide,
	});
	const mesh = new THREE.Mesh(geometry, material);
	//mesh.rotation.x = Math.PI;
	mesh.position.set(0, 0.15, -0.25);
	return mesh;
}

function TailWingMesh() {
	const tailWingSpan = 1;
	const tailWingThickness = 0.05;
	const tailChordShrink = 0.5;
	const tailChordMax = 0.5;

	const geometry = new ParametricGeometry(
		wingsFunc(tailWingSpan, tailWingThickness, tailChordMax, tailChordShrink),
		20,
		20
	);
	const material = new THREE.MeshPhongMaterial({
		color: 0xff6f91,
		flatShading: true,
		//side: THREE.DoubleSide,
	});
	const mesh = new THREE.Mesh(geometry, material);
	//mesh.rotation.x = Math.PI;
	mesh.position.set(0, 0.23, 1.2);
	return mesh;
}

export function AirplaneGeometry() {
	const airplane = new THREE.Group();

	const mainbody = MainBodyMesh();
	airplane.add(mainbody);

	const mainWing = MainWingMesh();
	airplane.add(mainWing);

	const tailWing = TailWingMesh();
	airplane.add(tailWing);

	return airplane;
}
