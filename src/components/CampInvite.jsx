"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useSocial, Avatar } from "./Social";
import { inviteToCampaign } from "@/lib/social";

// Invitar a la campaña: lista de amigos con un botón por persona (la invitación les llega como aviso y se unen con uno de sus personajes).
export default function CampInvite({ camp, players, onClose }) {
  const s = useSocial();
  const [state, setState] = useState({}); // id -> "ok" | mensaje de error
  const friends = s.friends || [];
  const send = async (p) => {
    setState((o) => ({ ...o, [p.id]: "…" }));
    const msg = await inviteToCampaign(p, { campId: camp.id, name: camp.name || "Campaña", desc: camp.description || "", gm: s.me?.username || "", players }).catch(() => "No se pudo enviar.");
    setState((o) => ({ ...o, [p.id]: /enviada/i.test(msg) ? "ok" : msg }));
  };
  return (
    <div className="mh-chn-ov" role="dialog" aria-modal="true" aria-label="Invitar jugadores" onClick={onClose}>
      <div className="mh-chn cgp-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="mh-inv-x mh-chn-x" aria-label="Cerrar" onClick={onClose}><X size={16} /></button>
        <h3 className="mh-serif">Invitar jugadores</h3>
        <p className="mh-pst-hint">Les llega un aviso a «{camp.name || "Campaña"}» y se unen con uno de sus personajes.</p>
        {friends.length === 0 ? (
          <p className="mh-pst-hint">Aún no tienes amigos. Búscalos por su nombre de usuario en el panel de la derecha y, cuando acepten, podrás invitarlos aquí.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 340, overflowY: "auto" }}>
            {friends.map((p) => {
              const st = state[p.id];
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 12, border: "1px solid var(--mh-line)", background: "var(--mh-panel2)" }}>
                  <Avatar name={p.username} size={30} status={p.dnd ? "dnd" : p.status} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: "var(--mh-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.username}</span>
                  {st && st !== "ok" && st !== "…" && <small style={{ color: "#D9644E", fontSize: 11.5, maxWidth: 160 }}>{st}</small>}
                  <button type="button" className="mh-btn" disabled={st === "ok" || st === "…"} onClick={() => send(p)}>{st === "ok" ? "Enviada" : "Invitar"}</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
