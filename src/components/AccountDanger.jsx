"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Ajustes · acciones delicadas: reiniciar las estadísticas de «Tus dados» y borrar la cuenta (con doble comprobación).
export function ResetDiceCard({ onReset, hasStats }) {
  const [sure, setSure] = useState(false);
  return (
    <div className="mh-card" style={{ margin: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--mh-panel3)", color: "var(--mh-gold-ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <RotateCcw size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--mh-ink)" }}>Estadísticas de dados</div>
          <div style={{ fontSize: 12.5, color: "var(--mh-muted)", marginTop: 3, lineHeight: 1.5 }}>
            Pone a cero el widget «Tus dados» del inicio: tiradas, críticos, porcentaje con Esperanza y la gráfica de los últimos días. No afecta a tus logros.
          </div>
        </div>
        {sure ? (
          <div className="mh-st-act">
            <button type="button" className="mh-btn-ghost" onClick={() => setSure(false)}>Cancelar</button>
            <button type="button" className="mh-btn" onClick={() => (onReset(), setSure(false))}>Sí, reiniciar</button>
          </div>
        ) : (
          <button type="button" className="mh-btn-ghost" disabled={!hasStats} onClick={() => setSure(true)}>Reiniciar</button>
        )}
      </div>
    </div>
  );
}

export function DeleteAccountCard({ username }) {
  const [step, setStep] = useState(0); // 0 cerrado · 1 aviso · 2 confirmar escribiendo
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const word = "BORRAR";
  const del = async () => {
    setBusy(true);
    setErr("");
    try {
      const sb = createClient();
      const { error } = await sb.rpc("delete_my_account");
      if (error) throw error;
      await sb.auth.signOut();
      window.location.href = "/login";
    } catch (e) {
      setBusy(false);
      setErr(/delete_my_account|function/i.test(String(e?.message)) ? "Todavía no está activado el borrado de cuentas en el servidor. Avisa al administrador." : "No se pudo borrar la cuenta. Inténtalo de nuevo.");
    }
  };
  return (
    <div className="mh-card mh-danger" style={{ margin: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(217,100,78,.15)", color: "#D9644E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Trash2 size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--mh-ink)" }}>Borrar cuenta</div>
          <div style={{ fontSize: 12.5, color: "var(--mh-muted)", marginTop: 3, lineHeight: 1.5 }}>
            Elimina tu cuenta de forma permanente: tu perfil, tus personajes, tus campañas guardadas, tus amigos y tus mensajes. No se puede deshacer.
          </div>
        </div>
        {step === 0 && <button type="button" className="mh-btn-ghost mh-danger-btn" onClick={() => setStep(1)}>Borrar mi cuenta</button>}
      </div>
      {step >= 1 && (
        <div className="mh-danger-box" role="alertdialog" aria-label="Confirmar el borrado de la cuenta">
          <p><AlertTriangle size={15} /> <b>Primera comprobación.</b> Vas a perder todo lo de la cuenta de <b>{username || "este usuario"}</b>. Las campañas en las que seas DJ dejarán de existir para tu grupo.</p>
          {step === 1 ? (
            <div className="mh-danger-acts">
              <button type="button" className="mh-btn-ghost" onClick={() => setStep(0)}>Me lo he pensado mejor</button>
              <button type="button" className="mh-btn-ghost mh-danger-btn" onClick={() => setStep(2)}>Entiendo, continuar</button>
            </div>
          ) : (
            <>
              <p><b>Segunda comprobación.</b> Escribe <code>{word}</code> para confirmar:</p>
              <input className="mh-input" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={word} aria-label={"Escribe " + word} autoFocus autoComplete="off" />
              {err && <div className="mh-friends-msg">{err}</div>}
              <div className="mh-danger-acts">
                <button type="button" className="mh-btn-ghost" onClick={() => (setStep(0), setTyped(""), setErr(""))}>Cancelar</button>
                <button type="button" className="mh-btn mh-danger-go" disabled={typed.trim().toUpperCase() !== word || busy} onClick={del}>{busy ? "Borrando…" : "Borrar mi cuenta para siempre"}</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
