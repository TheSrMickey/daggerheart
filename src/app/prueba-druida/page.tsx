import DruidaTest from "./DruidaTest";

// PRUEBA TEMPORAL del splash art animado del druida. Para quitarla: borrar esta carpeta, src/components/AnimatedSplash.jsx y la línea de /prueba-druida en src/lib/supabase/proxy.ts.
export const metadata = { title: "Prueba · splash art animado" };
export default function Page() {
  return <DruidaTest />;
}
