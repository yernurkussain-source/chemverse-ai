import * as THREE from "three";
import { C, legacy, legacyPoint } from "./three-utils";

/** WebGL рендерер, сахна және бірінші жақтан көретін камера (прототиптегі баптаулар) */
export function createRenderer(canvas: HTMLCanvasElement, isTouch: boolean) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouch ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8;
  renderer.shadowMap.enabled = true;
  // PCFSoftShadowMap жаңа нұсқада ескірген; PCFShadowMap енді өзі жұмсақ (shadow.radius)
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = C(0xd9e0e8);
  const camera = new THREE.PerspectiveCamera(68, 1, 0.02, 40);
  camera.rotation.order = "YXZ";
  scene.add(camera);
  return { renderer, scene, camera };
}

/** Жарықтар: аспан + терезеден түсетін күн (көлеңкемен) + төбедегі 4 шам */
export function addLights(scene: THREE.Scene, isTouch: boolean): void {
  scene.add(new THREE.HemisphereLight(C(0xffffff), C(0x8e9aab), legacy(0.48)));
  const sun = new THREE.DirectionalLight(C(0xfff3e2), legacy(0.95));
  sun.position.set(4.2, 4.6, 1.2);
  sun.target.position.set(0, 0, -0.8);
  scene.add(sun.target);
  sun.castShadow = true;
  const size = isTouch ? 1024 : 2048;
  sun.shadow.mapSize.set(size, size);
  Object.assign(sun.shadow.camera, { left: -5.5, right: 5.5, top: 4.5, bottom: -4.5, near: 1, far: 14 });
  sun.shadow.bias = -0.0004;
  sun.shadow.radius = 2;
  scene.add(sun);
  // Төбедегі шамдар 2,8 м биіктікте: үстел мен шкафтарға дейін ≈ 2,5 м. Төбе шамға 0,2 м қана жақын,
  // сондықтан әлсіреу көрсеткіші 0,6 (2 болса, төбеде шамның айналасы ақ дақ болып жанып кетеді)
  const CEILING_DECAY = 0.6;
  const ceiling = legacyPoint(0.22, 7, 2, 2.5, CEILING_DECAY);
  for (const [x, z] of [
    [-2, -1],
    [2, -1],
    [-2, 1.6],
    [2, 1.6],
  ]) {
    const p = new THREE.PointLight(C(0xf4f7ff), ceiling, 7, CEILING_DECAY);
    p.position.set(x, 2.8, z);
    scene.add(p);
  }
}

/** Шырпы мен спиртовка жалынының жарығы: ескі қарқындылықты осы көбейткішке көбейтеміз (≈ 0,3 м қашықтықта теңестірілген) */
export const SPLINT_LIGHT = legacyPoint(1, 1.6, 2, 0.3);
export const LAMP_LIGHT = legacyPoint(1, 1.4, 2, 0.3);
