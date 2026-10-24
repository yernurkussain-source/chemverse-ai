import * as THREE from "three";

/*
 * Прототип three.js r128-де жазылған. Қазіргі нұсқада (r183) түс пен жарық басқаша есептеледі,
 * сондықтан көрініс бірдей болуы үшін мына көмекшілер қолданылады:
 * - C(hex), CR(r,g,b): sRGB түсті сызықтық кеңістікке аудару (прототиптегі convertSRGBToLinear()).
 *   Жаңа нұсқада Color(hex) мұны өзі істейді.
 * - RAW(hex): прототипте түрлендірусіз берілген түстер (жалын, LED, шыны реңі). r128 оларды
 *   сызықтық деп қабылдайтын, сондықтан мұнда да солай аламыз — экранда бұрынғыдай көрінеді.
 * - Жарық: r155-тен бастап тек физикалық режим. Ескі режим жарықты π-ге көбейтетін,
 *   ал нүктелік жарықтың әлсіреуі басқа формуламен есептелетін (legacyPoint() қараңыз).
 */

export const C = (hex: number) => new THREE.Color(hex);
export const CR = (r: number, g: number, b: number) => new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
export const RAW = (hex: number) => new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace);
export const setRaw = (color: THREE.Color, hex: number) => color.setHex(hex, THREE.LinearSRGBColorSpace);
/** color.copy(CR(r, g, b)) — бірақ әр кадрда жаңа объект жасамайды */
export const setCR = (color: THREE.Color, r: number, g: number, b: number) => color.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);

export const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** Жоғары бағыт. Өзгертуге болмайды: керек болса UP.clone() */
export const UP = V3(0, 1, 0);

/** Ескі режимдегі (hemisphere, directional) жарық қарқындылығы → жаңа режим */
export const legacy = (intensity: number) => intensity * Math.PI;

/**
 * Ескі режимдегі нүктелік жарық → жаңа режим. Ескіде әлсіреу (1 − d/cutoff)^decay еді,
 * жаңада 1/d^newDecay · (1 − (d/cutoff)⁴)². Екеуі dRef қашықтықта (жарық негізгі түсетін жерде) теңестіріледі.
 * newDecay < 2 болса, жарық жақын жерде тым күшейіп кетпейді (ескі қисыққа ұқсайды).
 */
export function legacyPoint(intensity: number, cutoff: number, decay: number, dRef: number, newDecay = decay): number {
  const oldFalloff = Math.pow(Math.max(0, 1 - dRef / cutoff), decay);
  const window = Math.pow(Math.max(0, 1 - Math.pow(dRef / cutoff, 4)), 2);
  const newFalloff = window / Math.pow(dRef, newDecay);
  return (Math.PI * intensity * oldFalloff) / newFalloff;
}

/** Canvas-қа сызылған текстура (жазулар, плакаттар, шкала). rep — қайталану (еден) */
export function canvasTex(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  rep?: [number, number],
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (rep) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rep[0], rep[1]);
  }
  return t;
}

type StdOptions = { r?: number; m?: number; map?: THREE.Texture; t?: boolean; o?: number; e?: number; ei?: number };

/** Қарапайым PBR материалы: r — кедір-бұдырлық, m — металдық, e — жарқырау түсі */
export function std(col: number, o: StdOptions = {}): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: C(col),
    roughness: o.r ?? 0.6,
    metalness: o.m ?? 0,
    map: o.map ?? null,
    transparent: !!o.t,
    opacity: o.o ?? 1,
    emissiveIntensity: o.ei ?? 1,
  });
  // undefined мәнін конструкторға бермейміз — three.js консольге ескерту жазады
  if (o.e !== undefined) mat.emissive = C(o.e);
  return mat;
}

export const boxG = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

/** Сахнаны тазалау: геометриялар, материалдар, текстуралар (бет жабылғанда) */
export function disposeScene(scene: THREE.Scene): void {
  const textures = new Set<THREE.Texture>();
  scene.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
    for (const mat of mats) {
      for (const value of Object.values(mat)) if (value instanceof THREE.Texture) textures.add(value);
      mat.dispose();
    }
  });
  textures.forEach((t) => t.dispose());
}
