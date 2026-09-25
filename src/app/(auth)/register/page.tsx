import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export default function RegisterPage() {
  return (
    <AuthShell title="Únete a la mesa" subtitle="Crea tu cuenta de jugador">
      <AuthForm mode="register" />
    </AuthShell>
  );
}
