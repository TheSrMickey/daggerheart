import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export default function RegisterPage() {
  return (
    <AuthShell title="Crea tu cuenta" subtitle="Reúne a tu grupo y empieza tu próxima campaña.">
      <AuthForm mode="register" />
    </AuthShell>
  );
}
