import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="auth-page">
      <div className="auth-win">
        <section className="auth-left">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="auth-logo" src="/logo.svg" alt="Daggerheart" />
          <h1 className="auth-title">{title}</h1>
          <p className="auth-sub">{subtitle}</p>
          <div className="auth-form">{children}</div>
        </section>
        <section className="auth-art" aria-hidden="true">
          <p className="auth-quote">«Cada aventura empieza con un paso… y una tirada de dados.»</p>
          <span className="auth-tag">Enaris · Mickey</span>
        </section>
      </div>
    </main>
  );
}
