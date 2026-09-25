import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  return (
    <AuthShell title="Bienvenido de vuelta" subtitle="Entra para ver tus personajes">
      <AuthForm
        mode="login"
        next={typeof next === "string" ? next : undefined}
        notice={error === "confirm" ? "El enlace de confirmación no es válido o ha caducado." : undefined}
      />
    </AuthShell>
  );
}
