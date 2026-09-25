import { notFound } from "next/navigation";
import DaggerheartApp from "@/components/DaggerheartApp";

// Vista previa sin sesión para revisar el diseño en local. No existe en producción.
export default function DevPreview() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <DaggerheartApp onSignOut={undefined} />;
}
