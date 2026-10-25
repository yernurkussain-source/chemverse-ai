"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Button } from "@/components/ui/button";
import { classifyHand, smoothHands, type Gesture, type Point } from "@/features/gesture/classify";
import { useHandTracking } from "@/features/gesture/use-hand-tracking";
import { electronShells } from "@/lib/chemistry/electron-config";
import type { ChemicalElement } from "@/lib/chemistry/elements";
import { cn } from "@/lib/utils";

const PROTON = "#ff5f6d";
const NEUTRON = "#9aa6b8";
const ELECTRON = "#3fe0f0";
const NUCLEON_RADIUS = 0.5;
const ROTATE_PER_UNIT = 6; // радиан: кадр енінің бір бірлігіне
const ZOOM_PER_UNIT = 4;

type AtomApi = { rotate: (dx: number, dy: number) => void; zoom: (factor: number) => void; reset: () => void };

/** Атомның Бор моделі: ядро (протон + нейтрон) және қабаттарда айналатын электрондар */
export function AtomModel({ element, onClose }: { element: ChemicalElement; onClose: () => void }) {
  const t = useTranslations("PeriodicTable");
  const tg = useTranslations("GestureLab");
  const locale = useLocale();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const api = useRef<AtomApi>(null);
  const [handVisible, setHandVisible] = useState(false);

  const protons = element.number;
  const neutrons = Math.max(0, Math.round(element.mass) - protons);
  const shells = useMemo(() => electronShells(protons), [protons]);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    const stage = stageRef.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    stage.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    scene.add(new THREE.AmbientLight(0xffffff, 1.2), camera);
    const light = new THREE.DirectionalLight(0xffffff, 2.2);
    light.position.set(4, 6, 8);
    camera.add(light); // жарық камерамен бірге жүреді — қай жағынан қарасаң да ядро жарық

    const atom = new THREE.Group();
    scene.add(atom);

    // Ядро: нуклондар Фибоначчи спиралімен шар ішіне таралады; протондар нейтрондар арасына біркелкі араласады
    const total = protons + neutrons;
    const nucleusRadius = NUCLEON_RADIUS * 1.25 * Math.cbrt(total);
    const sphere = new THREE.SphereGeometry(NUCLEON_RADIUS, 20, 14);
    const protonMesh = new THREE.InstancedMesh(sphere, new THREE.MeshStandardMaterial({ color: PROTON, roughness: 0.45 }), protons);
    const neutronMesh = new THREE.InstancedMesh(sphere, new THREE.MeshStandardMaterial({ color: NEUTRON, roughness: 0.55 }), Math.max(1, neutrons));
    neutronMesh.count = neutrons;
    const matrix = new THREE.Matrix4();
    let p = 0;
    let n = 0;
    for (let i = 0; i < total; i++) {
      const y = total === 1 ? 0 : 1 - (2 * (i + 0.5)) / total;
      const ring = Math.sqrt(1 - y * y);
      const angle = i * Math.PI * (3 - Math.sqrt(5));
      const r = total === 1 ? 0 : nucleusRadius * Math.cbrt((i + 1) / total) * 0.85;
      matrix.setPosition(Math.cos(angle) * ring * r, y * r, Math.sin(angle) * ring * r);
      const isProton = Math.floor(((i + 1) * protons) / total) > Math.floor((i * protons) / total);
      if (isProton) protonMesh.setMatrixAt(p++, matrix);
      else neutronMesh.setMatrixAt(n++, matrix);
    }
    atom.add(protonMesh, neutronMesh);

    // Қабаттар: әр орбита әр бұрышқа еңкейтілген, ішкі қабаттар жылдамырақ айналады
    const electronGeometry = new THREE.SphereGeometry(0.24, 16, 12);
    const electronMaterial = new THREE.MeshStandardMaterial({ color: ELECTRON, emissive: ELECTRON, emissiveIntensity: 0.8 });
    const orbitMaterial = new THREE.MeshBasicMaterial({ color: ELECTRON, transparent: true, opacity: 0.5 });
    const spinners: THREE.Group[] = [];
    let outer = nucleusRadius;
    shells.forEach((count, k) => {
      const radius = nucleusRadius + 1.6 + k * 1.5;
      outer = radius;
      const tilt = new THREE.Group();
      tilt.rotation.set(Math.PI / 2 + k * 0.55, k * 0.9, 0);
      const spin = new THREE.Group();
      tilt.add(new THREE.Mesh(new THREE.TorusGeometry(radius, 0.03, 8, 160), orbitMaterial), spin);
      for (let j = 0; j < count; j++) {
        const e = new THREE.Mesh(electronGeometry, electronMaterial);
        const a = (2 * Math.PI * j) / count;
        e.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
        spin.add(e);
      }
      spinners.push(spin);
      atom.add(tilt);
    });

    const distance = outer * 2.6 + 3;
    camera.position.set(0, distance * 0.25, distance);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.minDistance = nucleusRadius + 2;
    controls.maxDistance = distance * 2.5;

    api.current = {
      rotate(dx, dy) {
        atom.rotation.y += dx;
        atom.rotation.x += dy;
      },
      zoom(factor) {
        const length = THREE.MathUtils.clamp(camera.position.length() / factor, controls.minDistance, controls.maxDistance);
        camera.position.setLength(length);
      },
      reset() {
        atom.rotation.set(0, 0, 0);
        camera.position.set(0, distance * 0.25, distance);
      },
    };

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = stage;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      // Тар экранда (телефон) көлденең көру бұрышы 45° болып қалады — атом жиегі кесілмейді
      camera.fov = camera.aspect < 1 ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(Math.PI / 8) / camera.aspect)) : 45;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    resize();

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let last = performance.now();
    const loop = (time = last) => {
      const dt = (time - last) / 1000;
      last = time;
      if (!still) spinners.forEach((s, k) => (s.rotation.z += dt * (1.2 / (k + 1))));
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      api.current = null;
    };
  }, [protons, neutrons, shells]);

  // Қол қимылы: ☝ — айналдыру, 🤏 — үлкейту, ✋ — бастапқы күй (GestureLab-тағы қимылдар)
  const history = useRef<Point[][]>([]);
  const previous = useRef<Point | null>(null);
  const last = useRef<Gesture>("none");
  function handleFrame(hand: Point[] | null) {
    setHandVisible(!!hand);
    if (!hand) {
      history.current = [];
      previous.current = null;
      return;
    }
    history.current = [...history.current, hand].slice(-5);
    const smooth = smoothHands(history.current);
    if (!smooth) return;
    const gesture = classifyHand(smooth);
    if (gesture !== last.current) previous.current = null;
    if (gesture === "open" && last.current !== "open") api.current?.reset();
    last.current = gesture;
    const point = gesture === "pinch" ? { x: (smooth[4].x + smooth[8].x) / 2, y: (smooth[4].y + smooth[8].y) / 2 } : smooth[8];
    if (previous.current && gesture === "point") {
      // Кескін айнадай, сондықтан x таңбасы кері
      api.current?.rotate(-(point.x - previous.current.x) * ROTATE_PER_UNIT, (point.y - previous.current.y) * ROTATE_PER_UNIT);
    }
    if (previous.current && gesture === "pinch") {
      api.current?.zoom(Math.min(1.15, Math.max(0.87, 1 - (point.y - previous.current.y) * ZOOM_PER_UNIT)));
    }
    previous.current = point;
  }
  const { videoRef, canvasRef, state, start, stop } = useHandTracking(handleFrame);
  const running = state === "running";
  const errorKey = state === "denied" || state === "unavailable" || state === "insecure" || state === "model" ? state : null;

  return (
    <dialog
      ref={dialogRef}
      onClose={() => {
        stop();
        onClose();
      }}
      onClick={(e) => e.target === dialogRef.current && dialogRef.current.close()}
      aria-labelledby="atom-model-title"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[880px] overflow-y-auto rounded-3xl border border-line bg-panel p-0 text-foreground backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="atom-model-title" className="font-display text-xl font-bold">
              {element.name[locale]} ({element.symbol}) — {t("atomModel")}
            </h2>
            <p className="font-mono text-[0.8rem] text-muted-foreground">{shells.join(" · ")}</p>
          </div>
          <Button variant="panel" size="pill-sm" onClick={() => dialogRef.current?.close()}>
            ✕ {t("close")}
          </Button>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-line bg-[radial-gradient(120%_90%_at_50%_40%,var(--stage-a)_0%,var(--panel)_55%,var(--stage-b)_100%)]">
          <div ref={stageRef} className="aspect-square w-full cursor-grab sm:aspect-auto sm:h-[min(60dvh,520px)] touch-none active:cursor-grabbing" />
          <div
            className={cn("absolute bottom-3 left-3 aspect-[4/3] w-32 overflow-hidden rounded-xl border-2 border-cyan bg-black sm:w-44", !running && "hidden")}
            role="img"
            aria-label={tg("cameraLabel")}
          >
            <video ref={videoRef} muted playsInline className="absolute inset-0 size-full -scale-x-100 object-cover" />
            <canvas ref={canvasRef} className="absolute inset-0 size-full -scale-x-100 object-cover" />
          </div>
          {running && !handVisible && (
            <p className="pointer-events-none absolute top-3 left-3 rounded-full bg-panel/80 px-3 py-1 text-[0.8rem]">{tg("noHand")}</p>
          )}
        </div>

        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[0.9rem]">
          <Particle color={PROTON} label={t("protons")} count={protons} />
          <Particle color={NEUTRON} label={t("neutrons")} count={neutrons} />
          <Particle color={ELECTRON} label={t("electrons")} count={protons} />
        </ul>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant={running ? "panel" : "glow"} size="pill-sm" onClick={running ? stop : start} disabled={state === "loading"}>
            {state === "loading" ? tg("loading") : running ? tg("stop") : `✋ ${t("gestureControl")}`}
          </Button>
          <p className="text-[0.82rem] text-muted-foreground">{running ? t("gestureHint") : t("atomHint")}</p>
        </div>
        {errorKey && (
          <p role="alert" className="rounded-[10px] border border-pink/40 bg-pink/10 px-3 py-2 text-[0.85rem] text-pink">
            {tg(`errors.${errorKey}`)}
          </p>
        )}
      </div>
    </dialog>
  );
}

function Particle({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <li className="flex items-center gap-2">
      <span className="size-3.5 rounded-full" style={{ background: color }} aria-hidden="true" />
      {label}: <b className="font-mono tabular-nums">{count}</b>
    </li>
  );
}
