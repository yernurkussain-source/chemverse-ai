import * as THREE from "three";
import type { Vessel } from "@/features/chem-engine";
import type { Fmt, Tr } from "../game/i18n";
import type { HudStore } from "../game/store";
import type { Sound } from "../audio/snd";
import { createMaterials, type Materials } from "../items/materials";
import type {
  Door,
  DTubeItem,
  FunnelItem,
  Item,
  LabVessel,
  PourTarget,
  Rack,
  SplintItem,
  Tag,
  VesselItem,
  WireItem,
} from "../items/types";
import type { Rig } from "../player/hands";
import type { Bench, HotPlate } from "../scene/bench";
import type { Burette } from "../scene/burette";
import type { Cabinets } from "../scene/cabinets";
import type { Lamp } from "../scene/lamp";
import type { Ppe } from "../scene/ppe";
import type { Effects } from "../systems/effects";
import { createRenderer } from "./renderer";

/** Жүруге кедергі (тікбұрыш, жоғарыдан қарағанда) */
export type Collider = { x0: number; x1: number; z0: number; z1: number };
/** cast / recv — көлеңке түсіреді / қабылдайды; surface — үстіне зат қоюға болады; block — сәуле өтпейді */
export type MeshOpts = { cast?: boolean; recv?: boolean; block?: boolean; surface?: boolean };

export const ROOM = { x0: -4.5, x1: 4.5, z0: -3.3, z1: 3.3, h: 3.0 };

/** Ойынның негізі: рендерер, сахна, тіркелімдер және 3D нысан жасау көмекшілері */
export type Base = {
  tr: Tr;
  fmt: Fmt;
  locale: string;
  isTouch: boolean;
  reducedMotion: boolean;
  store: HudStore;
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Raycast тексеретін нысандар */
  interactive: THREE.Object3D[];
  colliders: Collider[];
  items: Item[];
  vessels: LabVessel[];
  /** Химиялық ыдыс → оның 3D нысаны (журналдағы хабарлама жақын тұрса ғана көрсетіледі) */
  vesselOf: WeakMap<Vessel, LabVessel>;
  doors: Door[];
  racks: Rack[];
  mats: Materials;
  mesh: <M extends THREE.Material>(
    geo: THREE.BufferGeometry,
    mat: M,
    x: number,
    y: number,
    z: number,
    parent?: THREE.Object3D | null,
    o?: MeshOpts,
  ) => THREE.Mesh<THREE.BufferGeometry, M>;
  collider: (x0: number, x1: number, z0: number, z1: number) => void;
};

export function createBase(opts: {
  canvas: HTMLCanvasElement;
  tr: Tr;
  fmt: Fmt;
  locale: string;
  store: HudStore;
  isTouch: boolean;
  reducedMotion: boolean;
}): Base {
  const { renderer, scene, camera } = createRenderer(opts.canvas, opts.isTouch);
  const interactive: THREE.Object3D[] = [];
  const colliders: Collider[] = [];
  return {
    ...opts,
    renderer,
    scene,
    camera,
    interactive,
    colliders,
    items: [],
    vessels: [],
    vesselOf: new WeakMap(),
    doors: [],
    racks: [],
    mats: createMaterials(),
    mesh: (geo, mat, x, y, z, parent, o = {}) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = o.cast ?? true;
      m.receiveShadow = o.recv ?? true;
      (parent || scene).add(m);
      const tag = m.userData as Tag;
      if (o.block) {
        tag.block = true;
        interactive.push(m);
      }
      if (o.surface) {
        tag.surface = true;
        if (!o.block) interactive.push(m);
      }
      return m;
    },
    collider: (x0, x1, z0, z1) => {
      colliders.push({ x0, x1, z0, z1 });
    },
  };
}

/** Құю, тамызу, сынау кезіндегі күй. dropOnly — қысқа әрекет (тамшы, кесек, шырпы, сым) */
export type PourState = {
  target: PourTarget;
  intoLeft: boolean;
  dropOnly?: boolean;
  test?: boolean;
  dip?: boolean;
  flame?: boolean;
};

export type GameState = {
  speed: number;
  goggles: boolean;
  gloves: boolean;
  heaterOn: boolean;
  held: Item | null;
  heldL: Item | null;
  pour: PourState | null;
  pourAmt: number;
  pourStartT: number;
  xp: number;
  safety: number;
  /** Ойын уақыты, с (жылдамдатуды ескереді) */
  gameT: number;
  done: Set<string>;
  /** Қауіпсіздік ескертулері (бір затқа бір рет) */
  warned: Record<string, boolean>;
  started: boolean;
  /** Терезе ашық (қош келдің, тапсырмалар) — жүру мен басу тоқтайды */
  paused: boolean;
  locked: boolean;
  lockFailed: boolean;
};

export type Player = { x: number; z: number; yaw: number; pitch: number; bob: number; stepAcc: number };

export type Aim = { h: THREE.Intersection; u: Tag; n: THREE.Vector3 };

/** Прототиптегі STATS: қозғалтқыштан тыс тапсырма белгілері */
export type GameStats = { pop: boolean; o2: boolean; co2splint: boolean; filter: boolean; twohand: boolean; titr: boolean; lamp: boolean };

export type Game = Base & {
  state: GameState;
  stats: GameStats;
  snd: Sound;
  /** Жалын сынағында анықталған катиондар (тапсырма: 3 түрлі) */
  flameSeen: Set<string>;
  /** Кешіктірілген әрекеттер (тамшы, шырпы сынағы…) — ойын жабылғанда тоқтатылады */
  timers: Set<ReturnType<typeof setTimeout>>;
  /** Прогресс өзгерді (тапсырма, айып) — сақтауды жоспарлау */
  progress: { changed: () => void };
  player: Player;
  keys: Record<string, boolean>;
  joy: { x: number; y: number };
  aimRes: Aim | null;
  cooldown: number;
  bench: Bench;
  hp: HotPlate;
  cabinets: Cabinets;
  ppe: Ppe;
  bur: Burette;
  lamp: Lamp;
  beakers: VesselItem[];
  rackCab: Rack;
  rackBench: Rack;
  funnel: FunnelItem;
  dtube: DTubeItem;
  splint: SplintItem;
  wire: WireItem;
  rigR: Rig;
  rigL: Rig;
  fx: Effects;
};

/** ms миллисекундтан кейін орындау (ойын жабылса — орындалмайды) */
export function later(G: Game, fn: () => void, ms: number): void {
  const id = setTimeout(() => {
    G.timers.delete(id);
    fn();
  }, ms);
  G.timers.add(id);
}
