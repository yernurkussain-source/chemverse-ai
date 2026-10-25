import type * as THREE from "three";
import type { GasType, IndicatorId, IonId, LiquidId, PptMap, SolidId, Vessel } from "@/features/chem-engine";

/** Орны мен бұрылысы */
export type Pose = { pos: THREE.Vector3; quat: THREE.Quaternion };
/** Штативтегі орын */
export type Slot = { pos: THREE.Vector3; item: Item | null };
export type Rack = { g: THREE.Group; slots: Slot[] };

type ItemBase = {
  g: THREE.Group;
  /** Биіктігі және радиусы (м) */
  H: number;
  R: number;
  /** HUD-тағы аты және қосымша түсіндірмесі */
  name: string;
  full: string;
  /** Қолда емес кездегі орны; null — көрінбейді (мысалы түтік екі ыдысқа жалғанғанда) */
  rest: Pose | null;
  /** Q / Z басқанда қайтатын орны */
  home: (Pose & { slot?: Slot }) | null;
  slot: Slot | null;
  /** Бөтелке не құты қақпағы (қолға алғанда жасырылады) */
  cap?: THREE.Object3D;
};

/** mystery — «X» бөтелкесі (rid жасырын); liq — сұйықтың материалы (X ауысқанда түсі өзгереді) */
export type BottleItem = ItemBase & { type: "bottle"; rid: LiquidId; mystery?: boolean; liq?: THREE.MeshStandardMaterial };
export type DropperItem = ItemBase & { type: "dropper"; rid: IndicatorId };
export type JarItem = ItemBase & { type: "jar"; rid: SolidId };
export type VesselItem = ItemBase & { type: "vessel"; v: LabVessel };
export type FunnelItem = ItemBase & {
  type: "funnel";
  /** Воронкадағы әлі сүзілмеген ерітінді */
  fv: Vessel;
  /** Сүзгі қағаздағы тұнба (моль) */
  paper: PptMap;
  paperMat: THREE.MeshStandardMaterial;
  fliq: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  on: VesselItem | null;
  dripT: number;
};
export type DTubeItem = ItemBase & { type: "dtube"; A: VesselItem | null; B: VesselItem | null };
export type SplintState = "unlit" | "burning" | "smolder" | "burnt";
export type SplintItem = ItemBase & {
  type: "splint";
  st: SplintState;
  life: number;
  smolderT: number;
  tip: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  fl: THREE.Group;
  f1: THREE.Mesh;
  light: THREE.PointLight;
};
/** mystery — сымдағы сынама X ерітіндісінен алынды (иондары жазылмайды) */
export type WireItem = ItemBase & { type: "wire"; sample: Partial<Record<IonId, number>>; acid: boolean; naRes: boolean; mystery?: boolean };

export type ReagentItem = BottleItem | DropperItem | JarItem;
export type Item = BottleItem | DropperItem | JarItem | VesselItem | FunnelItem | DTubeItem | SplintItem | WireItem;

/** Ыдыстағы қатты кесектің 3D модельі */
export type PieceMesh = { obj: THREE.Object3D; mat: THREE.MeshStandardMaterial; base: THREE.Color };

type LiquidMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;

/** Стакан не пробирка: химиялық күйі (s) + 3D бөліктері */
export type LabVessel = {
  s: Vessel;
  g: THREE.Group;
  r: number;
  h: number;
  cap: number;
  kind: "beaker" | "tube";
  liq: LiquidMesh;
  surf: LiquidMesh;
  layer: LiquidMesh;
  bub: THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  par: THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  pieces: THREE.Group;
  steam: { sp: THREE.Sprite; t: number; x: number }[];
  stopper: THREE.Mesh;
  lab: THREE.Sprite;
  bubs: { x: number; y: number; z: number; v: number; s: number }[];
  pars: { x: number; y: number; z: number; s: number }[];
  pieceMeshes: PieceMesh[];
  /** Ыдыстың аузында жиналған газ (моль) — шырпы сынағы осыны тексереді */
  head: Record<GasType, number>;
  /** Газ өткізгіш түтік: A — газ шығатын пробирка, B — газ баратын ыдыс */
  link: { A: VesselItem; B: VesselItem | null } | null;
  linkIn: VesselItem | null;
  funnel: FunnelItem | null;
  it: VesselItem;
};

/** Құюға болатын, бірақ қолға алынбайтын нысандар */
export type BuretteTarget = { type: "burette"; g: THREE.Object3D; H: number; name: string };
export type LampTarget = { type: "lamp"; g: THREE.Object3D; H: number; name: string };
export type PourTarget = VesselItem | FunnelItem | BuretteTarget | LampTarget;

export type Door = { piv: THREE.Group; open: boolean; ang: number; sign: number; name: string };

/** 3D нысанға тағылатын белгі (raycast кезінде не екенін білу үшін), object.userData ішінде */
export type Tag = {
  item?: Item;
  door?: Door;
  rack?: Rack;
  surface?: boolean;
  block?: boolean;
  heaterTop?: boolean;
  knob?: boolean;
  waste?: boolean;
  ppe?: "goggles" | "gloves";
  stopcock?: boolean;
  burette?: boolean;
  lamp?: boolean;
  dt?: boolean;
};

export const tagOf = (obj: THREE.Object3D) => obj.userData as Tag;
