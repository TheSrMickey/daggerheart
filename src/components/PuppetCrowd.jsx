"use client";
// Monigotes 3D con físicas que pasean por el borde inferior de su contenedor, uno por persona.
// people: [{ id, color, name }] · meId: el id propio (su nombre se resalta).
import { useEffect, useRef } from "react";
import { loadKit, createStage, createRig } from "@/lib/puppet3d";

export default function PuppetCrowd({ people, meId }) {
  const host = useRef(null), labels = useRef(null), api = useRef(null), latest = useRef({ people, meId });
  latest.current = { people, meId };
  const key = people.map((p) => p.id + "|" + p.color + "|" + p.name).join(",") + "#" + meId;
  useEffect(() => {
    let dead = false, raf = 0, cleanup = () => {};
    (async () => {
      try {
        const kit = await loadKit();
        const el = host.current;
        if (dead || !el) return;
        const st = createStage(kit, el);
        const rigs = new Map();
        // Altas y bajas según la lista de personas más reciente.
        const sync = () => {
          const { people: ps, meId: me } = latest.current;
          const ids = new Set(ps.map((p) => p.id));
          for (const [id, r] of rigs) if (!ids.has(id)) { r.rig.dispose(); r.label.remove(); rigs.delete(id); }
          ps.forEach((p) => {
            let r = rigs.get(p.id);
            if (r && r.color !== p.color) { r.rig.dispose(); r.label.remove(); rigs.delete(p.id); r = null; }
            if (!r) {
              const hw = Math.max(1, st.halfWidth() - 1.4), x = (Math.random() * 2 - 1) * hw, z = (Math.random() * 2 - 1) * 0.9;
              const label = document.createElement("span");
              labels.current.appendChild(label);
              r = { color: p.color, rig: createRig(kit, st.scene, st.world, { color: p.color, x, z }), label, w: { x, z, tx: x, wait: 0.4 + Math.random() * 2, phase: Math.random() * 6, speed: 1.1 + Math.random() * 0.5 } };
              rigs.set(p.id, r);
            }
            r.label.textContent = p.name;
            r.label.className = "pp-lab" + (p.id === me ? " is-me" : "");
          });
        };
        api.current = { sync };
        sync();
        let t = 0, acc = 0, last = performance.now();
        const step = () => {
          const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000);
          last = now; t += dt;
          const hw = Math.max(1, st.halfWidth() - 1.4);
          for (const r of rigs.values()) {
            const w = r.w;
            let sw = 0, ty;
            if (w.wait > 0) { // parado: respira y se balancea un poco
              w.wait -= dt;
              ty = r.rig.HOVER + Math.sin(t * 2 + w.phase) * 0.025;
              sw = Math.sin(t * 1.6 + w.phase) * 0.12;
            } else {
              const d = w.tx - w.x;
              if (Math.abs(d) < 0.06) { w.wait = 1.2 + Math.random() * 3; w.tx = (Math.random() * 2 - 1) * hw; } else { w.x += Math.sign(d) * w.speed * dt; sw = Math.sin(t * 7.5 + w.phase); }
              ty = r.rig.HOVER + Math.abs(Math.sin(t * 7.5 + w.phase)) * 0.07;
            }
            w.x = Math.max(-hw, Math.min(hw, w.x));
            r.rig.drive(dt, w.x, ty, w.z, sw);
          }
          acc += dt;
          while (acc >= 1 / 120) { for (const r of rigs.values()) r.rig.forces(); st.world.step(1 / 120); acc -= 1 / 120; }
          for (const r of rigs.values()) {
            r.rig.sync();
            const [px, py] = st.project(r.w.x, r.rig.topY + 0.3, r.w.z);
            r.label.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) translate(-50%, -100%)`;
          }
          st.render();
          raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        cleanup = () => {
          cancelAnimationFrame(raf);
          api.current = null;
          for (const r of rigs.values()) { r.rig.dispose(); r.label.remove(); }
          rigs.clear();
          st.dispose();
        };
      } catch {
        // sin WebGL no se muestran los monigotes y el contenedor queda vacío
      }
    })();
    return () => { dead = true; cleanup(); };
  }, []);
  useEffect(() => { if (api.current) api.current.sync(); }, [key]);
  return (
    <div className="pp-crowd" aria-hidden="true" style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={host} style={{ position: "absolute", inset: 0 }} />
      <div ref={labels} className="pp-labels" />
    </div>
  );
}
