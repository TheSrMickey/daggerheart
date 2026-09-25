import { AppHeader } from "@/components/AppHeader";

export default function PersonajesLayout({ children }: LayoutProps<"/personajes">) {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
