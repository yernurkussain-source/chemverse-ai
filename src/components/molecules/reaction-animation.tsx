"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Button } from "@/components/ui/button";
import { getMolecule } from "@/lib/chemistry/molecules";
import { parseMolfile } from "@/lib/chemistry/molfile";
import { equation, layoutRow, mapAtoms, REACTIONS, sideAtoms, type Reaction, type ReactionId } from "@/lib/chemistry/reactions";
import { cn } from "@/lib/utils";

const DURATION = 5; // секунд
// CPK түстері мен радиустары (scripts/sdf-to-glb.mjs-тегідей)
const STYLE: Record<string, { color: number; radius: number }> = {
  H: { color: 0xffffff, radius: 0.28 },
  C: { color: 0x909090, radius: 0.4 },
  N: { color: 0x3050f8, radius: 0.39 },
  O: { color: 0xff0d0d, radius: 0.38 },
  Cl: { color: 0x1ff01f, radius: 0.5 },
};

type Phase = "reactants" | "breaking" | "products";
const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
// Кезеңдер: реагент байланыстары өшеді → атомдар жылжиды → өнім байланыстары пайда болады
const breakAt = (t: number) => 1 - smooth((t - 0.1) / 0.25);
const moveAt = (t: number) => smooth((t - 0.3) / 0.4);
const formAt = (t: number) => smooth((t - 0.65) / 0.25);
const phaseOf = (t: number): Phase => (t < 0.3 ? "reactants" : t < 0.75 ? "breaking" : "products");

const sdfText = new Map<string, Promise<string>>();
const loadSdf = (url: string) => {
  if (!sdfText.has(url)) sdfText.set(url, fetch(url).then((r) => r.text()));
  return sdfText.get(url)!;
};

/** Реагенттер мен өнімдердің қатарлары (әр молекула коэффициентіне қарай қайталанады) */
async function buildRows(reaction: Reaction) {
  const row = async (side: Reaction["reactants"]) =>
    layoutRow(await Promise.all(side.flatMap(([id, n]) => Array.from({ length: n }, async () => parseMolfile(await loadSdf(getMolecule(id)!.sdf))))));
  return { from: await row(reaction.reactants), to: await row(reaction.products) };
}

/** Реакция анимациясы: байланыстар үзіліп, атомдар қайта топтасып, жаңа заттар түзіледі */
export function ReactionAnimation() {
  const t = useTranslations("MoleculesPage.reactions");
  const [reactionId, setReactionId] = useState<ReactionId>("methane-burning");
  const [playing, setPlaying] = useState(false);
  const [phase, setPhase] = useState<Phase>("reactants");
  const stageRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const progress = useRef(0);
  const playingRef = useRef(false);
  const reaction = REACTIONS.find((r) => r.id === reactionId)!;

  function play(value: boolean) {
    if (value && progress.current >= 1) progress.current = 0;
    playingRef.current = value;
    setPlaying(value);
  }

  useEffect(() => {
    const stage = stageRef.current!;
    let disposed = false;
    let cleanup = () => {};
    progress.current = 0;
    if (sliderRef.current) sliderRef.current.value = "0";

    buildRows(reaction).then(({ from, to }) => {
      if (disposed) return;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      stage.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
      scene.add(new THREE.AmbientLight(0xffffff, 1.3), camera);
      const light = new THREE.DirectionalLight(0xffffff, 2);
      light.position.set(3, 5, 6);
      camera.add(light);

      const map = mapAtoms(from.atoms, to.atoms);
      const sphere = new THREE.SphereGeometry(1, 28, 18);
      const cylinder = new THREE.CylinderGeometry(1, 1, 1, 14);
      const materials = new Map<string, THREE.Material>();
      const atomMeshes = from.atoms.map((a) => {
        const style = STYLE[a.elem] ?? STYLE.C;
        if (!materials.has(a.elem)) materials.set(a.elem, new THREE.MeshStandardMaterial({ color: style.color, roughness: 0.35 }));
        const mesh = new THREE.Mesh(sphere, materials.get(a.elem));
        mesh.scale.setScalar(style.radius);
        scene.add(mesh);
        return mesh;
      });

      // Байланыс: еселігіне қарай бірнеше цилиндр; ұштары әр кадрда атомдардың орнына қарай жаңарады
      type Bond = { a: number; b: number; order: number; meshes: THREE.Mesh[]; material: THREE.MeshStandardMaterial };
      const makeBonds = (bonds: { a: number; b: number; order: number }[], toGlobal: (i: number) => number): Bond[] =>
        bonds.map((b) => {
          const material = new THREE.MeshStandardMaterial({ color: 0xb4bccc, transparent: true, roughness: 0.5 });
          const meshes = Array.from({ length: Math.min(b.order, 3) }, () => {
            const mesh = new THREE.Mesh(cylinder, material);
            scene.add(mesh);
            return mesh;
          });
          return { a: toGlobal(b.a), b: toGlobal(b.b), order: b.order, meshes, material };
        });
      const globalOfProduct = new Map(map.map((productIndex, i) => [productIndex, i]));
      const oldBonds = makeBonds(from.bonds, (i) => i);
      const newBonds = makeBonds(to.bonds, (i) => globalOfProduct.get(i)!);

      const up = new THREE.Vector3(0, 1, 0);
      const pa = new THREE.Vector3();
      const pb = new THREE.Vector3();
      const dir = new THREE.Vector3();
      const side = new THREE.Vector3();
      function placeBonds(bonds: Bond[], opacity: number) {
        for (const bond of bonds) {
          bond.material.opacity = opacity;
          bond.meshes.forEach((m) => (m.visible = opacity > 0.01));
          if (opacity <= 0.01) continue;
          pa.copy(atomMeshes[bond.a].position);
          pb.copy(atomMeshes[bond.b].position);
          dir.subVectors(pb, pa);
          const length = dir.length();
          side.crossVectors(dir, new THREE.Vector3(0, 0, 1));
          if (side.lengthSq() < 1e-6) side.set(0, 1, 0);
          side.normalize();
          const radius = bond.order === 1 ? 0.1 : 0.07;
          const offsets = bond.order === 1 ? [0] : bond.order === 2 ? [-0.13, 0.13] : [-0.2, 0, 0.2];
          bond.meshes.forEach((mesh, k) => {
            mesh.position.copy(pa).add(pb).multiplyScalar(0.5).addScaledVector(side, offsets[k]);
            mesh.quaternion.setFromUnitVectors(up, dir.clone().normalize());
            mesh.scale.set(radius, length, radius);
          });
        }
      }

      const start = from.atoms.map((a) => new THREE.Vector3(a.x, a.y, a.z));
      const end = map.map((j) => new THREE.Vector3(to.atoms[j].x, to.atoms[j].y, to.atoms[j].z));
      function pose(time: number) {
        const p = moveAt(time);
        atomMeshes.forEach((mesh, i) => mesh.position.lerpVectors(start[i], end[i], p));
        placeBonds(oldBonds, breakAt(time));
        placeBonds(newBonds, formAt(time));
      }

      // Камера: ең кең қатар рамкаға сыйсын
      const width = Math.max(...[...start, ...end].map((v) => Math.abs(v.x))) * 2 + 1.2;
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enablePan = false;
      controls.enableDamping = true;
      const resize = () => {
        const { clientWidth: w, clientHeight: h } = stage;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        const distance = width / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.min(1, camera.aspect) + 0.8;
        if (!camera.userData.placed) {
          camera.position.set(0, distance * 0.15, distance);
          camera.userData.placed = true;
        }
        controls.maxDistance = distance * 3;
      };
      const observer = new ResizeObserver(resize);
      observer.observe(stage);
      resize();

      let frame = 0;
      let last = performance.now();
      let shownPhase: Phase = "reactants";
      const loop = (now = last) => {
        const dt = (now - last) / 1000;
        last = now;
        if (playingRef.current) {
          progress.current = Math.min(1, progress.current + dt / DURATION);
          if (sliderRef.current) sliderRef.current.value = String(Math.round(progress.current * 100));
          if (progress.current >= 1) {
            playingRef.current = false;
            setPlaying(false);
          }
        }
        const current = phaseOf(progress.current);
        if (current !== shownPhase) {
          shownPhase = current;
          setPhase(current);
        }
        pose(progress.current);
        controls.update();
        renderer.render(scene, camera);
        frame = requestAnimationFrame(loop);
      };
      loop();

      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        controls.dispose();
        sphere.dispose();
        cylinder.dispose();
        materials.forEach((m) => m.dispose());
        [...oldBonds, ...newBonds].forEach((b) => b.material.dispose());
        renderer.dispose();
        renderer.domElement.remove();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [reaction]);

  const before = sideAtoms(reaction.reactants);
  const after = sideAtoms(reaction.products);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="flex min-w-0 flex-col gap-3">
        <div role="group" aria-label={t("choose")} className="flex flex-wrap gap-1.5">
          {REACTIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={r.id === reactionId}
              onClick={() => {
                play(false);
                setPhase("reactants");
                setReactionId(r.id);
              }}
              className={cn(
                "min-h-9 rounded-full border px-3.5 text-[0.82rem] font-semibold transition-colors",
                r.id === reactionId ? "border-cyan bg-cyan text-on-accent" : "border-line bg-panel hover:border-cyan-dim",
              )}
            >
              {t(`names.${r.id}`)}
            </button>
          ))}
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-line bg-[radial-gradient(120%_90%_at_50%_40%,var(--stage-a)_0%,var(--panel)_55%,var(--stage-b)_100%)]">
          <div ref={stageRef} className="aspect-[4/3] w-full cursor-grab touch-none active:cursor-grabbing" role="img" aria-label={`${t(`names.${reactionId}`)}: ${equation(reaction)}`} />
          <p className="pointer-events-none absolute top-3 left-3 rounded-full bg-overlay px-3 py-1 font-mono text-[0.95rem] font-semibold">{equation(reaction)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="glow" size="pill-sm" onClick={() => play(!playing)}>
            {playing ? `⏸ ${t("pause")}` : `▶ ${t("play")}`}
          </Button>
          <label className="flex min-w-48 flex-1 items-center gap-2 text-[0.8rem] text-muted-foreground">
            {t("progress")}
            <input
              ref={sliderRef}
              type="range"
              min={0}
              max={100}
              defaultValue={0}
              onInput={(e) => {
                play(false);
                progress.current = Number(e.currentTarget.value) / 100;
              }}
              className="flex-1 accent-cyan"
            />
          </label>
        </div>
        <p aria-live="polite" className="rounded-2xl border border-cyan-dim bg-linear-135 from-task-a to-task-b px-4 py-3 text-[0.9rem] font-semibold">
          {t(`phases.${phase}`)}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-[0.92rem]">{t(`descriptions.${reactionId}`)}</p>
        <section className="rounded-2xl border border-line bg-panel p-4">
          <h2 className="text-[0.95rem] font-semibold">{t("conservation")}</h2>
          <table className="mt-2 w-full text-left text-[0.88rem]">
            <thead className="text-[0.75rem] text-muted-foreground">
              <tr>
                <th className="py-1 font-medium">{t("element")}</th>
                <th className="py-1 font-medium">{t("before")}</th>
                <th className="py-1 font-medium">{t("after")}</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {Object.keys(before).map((el) => (
                <tr key={el} className="border-t border-line">
                  <td className="py-1 font-bold">{el}</td>
                  <td className="py-1">{before[el]}</td>
                  <td className="py-1">
                    {after[el]} {before[el] === after[el] && <span className="text-good">✓</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <p className="text-[0.82rem] text-muted-foreground">{t("hint")}</p>
      </div>
    </div>
  );
}
