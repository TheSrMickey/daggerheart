import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export default function RegisterPage() {
  return (
    <AuthShell title="Crea tu cuenta" mode="register">
      <AuthForm mode="register" />
    </AuthShell>
  );
}
