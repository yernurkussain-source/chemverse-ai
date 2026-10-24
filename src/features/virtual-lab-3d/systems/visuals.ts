import * as THREE from "three";
import { entries, liquidColor, PPT, settledInfo } from "@/features/chem-engine";
import { C, setCR } from "../core/three-utils";
import { pieceMesh } from "../items/materials";
import type { LabVessel } from "../items/types";

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const COPPER = C(0xb4532a);
const SILVER = C(0xd9dde2);

/**
 * Ыдыстың химиялық күйін 3D-ге көшіру (әр кадр): сұйықтың деңгейі мен түсі, шөккен тұнба қабаты,
 * көпіршіктер (газ), қалқып жүрген тұнба бөлшектері, қатты кесектер (еруі, мыс/күміс қабаты), бу.
 */
export function vesselVisual(o: LabVessel, rdt: number): void {
  const s = o.s;
  const inner = o.h * 0.92;
  const H = Math.max(0, Math.min(1, s.V / o.cap)) * inner;
  const lc = liquidColor(s);
  o.liq.visible = o.surf.visible = H > 0.0006;
  if (o.liq.visible) {
    o.liq.scale.y = H;
    o.liq.position.y = 0.0018 + H / 2;
    o.surf.position.y = 0.0018 + H;
    setCR(o.liq.material.color, lc.r, lc.g, lc.b);
    o.liq.material.opacity = Math.max(0.28, Math.min(0.94, lc.a + 0.12));
    o.surf.material.color.copy(o.liq.material.color);
  }

  const st = settledInfo(s);
  const lh = st.mol > 0 ? Math.max(0.0012, Math.min(o.h * 0.3, (0.0012 + st.mol * 4) * (o.kind === "tube" ? 3 : 1))) : 0;
  o.layer.visible = lh > 0;
  if (lh > 0) {
    o.layer.scale.y = lh;
    o.layer.position.y = 0.0016 + lh / 2;
    setCR(o.layer.material.color, ...st.col);
  }

  // Көпіршіктер: саны газ бөліну қарқынына (fizz) тәуелді
  const N = H > 0.002 ? Math.min(40, Math.round(s.fizz * (o.kind === "tube" ? 250 : 380))) : 0;
  o.bub.count = N;
  for (let i = 0; i < N; i++) {
    const b = o.bubs[i];
    if (b.y < 0 || b.y > H) {
      const a = Math.random() * 6.283;
      const rr = Math.sqrt(Math.random()) * o.r * 0.75;
      b.x = Math.cos(a) * rr;
      b.z = Math.sin(a) * rr;
      b.y = 0.002 + Math.random() * Math.min(H, 0.01);
      b.v = 0.03 + Math.random() * 0.05;
      b.s = (o.kind === "tube" ? 0.0006 : 0.001) + Math.random() * 0.001;
    }
    b.y += b.v * rdt;
    tmpM.compose(tmpV.set(b.x, b.y, b.z), tmpQ.identity(), tmpS.set(b.s, b.s, b.s));
    o.bub.setMatrixAt(i, tmpM);
  }
  o.bub.instanceMatrix.needsUpdate = true;

  // Қалқып жүрген тұнба: лайлылыққа қарай бөлшектер саны
  let tot = 0;
  let cr = 0;
  let cg = 0;
  let cb = 0;
  for (const [k, n] of entries(s.susp)) {
    tot += n;
    const c = PPT[k].col;
    cr += c[0] * n;
    cg += c[1] * n;
    cb += c[2] * n;
  }
  const L = Math.max(s.V, 0.01) / 1000;
  const turb = tot > 1e-8 ? Math.min(1, (tot / L) * 14) : 0;
  const P = H > 0.002 ? Math.min(60, Math.round(turb * 70)) : 0;
  o.par.count = P;
  if (P > 0) {
    setCR(o.par.material.color, cr / tot, cg / tot, cb / tot);
    for (let i = 0; i < P; i++) {
      const p = o.pars[i];
      p.y -= rdt * 0.04;
      if (p.y < 0) p.y = 1;
      tmpM.compose(tmpV.set(p.x * 0.6, 0.002 + p.y * H, p.z * 0.6), tmpQ.identity(), tmpS.set(p.s, p.s, p.s));
      o.par.setMatrixAt(i, tmpM);
    }
    o.par.instanceMatrix.needsUpdate = true;
  }

  // Қатты кесектер: жаңасы түскенде модель қосылады, ерігенде кішірейеді, бетіне мыс не күміс қонады
  while (o.pieceMeshes.length < s.pieces.length) {
    const pc = s.pieces[o.pieceMeshes.length];
    const pm = pieceMesh(pc.metal, o.kind === "tube" ? 0.45 : 1);
    const m = pm.obj;
    const a = o.pieceMeshes.length * 1.9;
    m.position.set(Math.cos(a) * o.r * 0.35, o.kind === "tube" ? 0.008 : 0.004, Math.sin(a) * o.r * 0.35);
    if (pc.metal === "Fe") m.rotation.set(o.kind === "tube" ? 0.1 : Math.PI / 2, 0, a);
    else if (pc.metal === "Cu") m.rotation.set(o.kind === "tube" ? 0 : Math.PI / 2, a, 0);
    else m.rotation.set(0, a, 0);
    o.pieces.add(m);
    o.pieceMeshes.push(pm);
  }
  s.pieces.forEach((pc, i) => {
    const pm = o.pieceMeshes[i];
    if (!pm) return;
    const f = Math.cbrt(Math.max(0, pc.n / pc.n0));
    pm.obj.visible = pc.n > pc.n0 * 0.004;
    pm.obj.scale.setScalar(Math.max(0.15, f));
    const cu = Math.min(1, pc.coatCu / 1.5e-4);
    const ag = Math.min(1, pc.coatAg / 3e-4);
    pm.mat.color.copy(pm.base);
    if (cu > 0) pm.mat.color.lerp(COPPER, cu * 0.9);
    if (ag > 0) pm.mat.color.lerp(SILVER, ag * 0.9);
  });

  // Қайнағанда бу көтеріледі
  for (const st2 of o.steam) {
    if (s.boil && s.V > 0.05) {
      st2.sp.visible = true;
      st2.t += rdt * 0.5;
      if (st2.t > 1) {
        st2.t = 0;
        st2.x = (Math.random() - 0.5) * o.r;
      }
      const t = st2.t;
      st2.sp.position.set(st2.x, o.h + 0.01 + t * 0.12, 0);
      st2.sp.material.opacity = 0.35 * (1 - t);
      st2.sp.scale.setScalar(0.02 + t * 0.05);
    } else st2.sp.visible = false;
  }
}
