"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { storageGet, storageSet } from "@/lib/storage";

// Documentos compartidos de una campaña (calendario, votaciones, descansos, crónica): una clave por documento.
export const readDoc = async (key, fallback) => {
  try {
    const r = await storageGet(key, true);
    return r ? JSON.parse(r.value) : fallback;
  } catch (e) {
    return fallback;
  }
};
export const writeDoc = async (key, value) => {
  try {
    await storageSet(key, JSON.stringify(value), true);
  } catch (e) {}
};
// Lee, aplica el cambio y guarda; devuelve el valor nuevo.
export const mutateDoc = async (key, fallback, fn) => {
  const next = fn(await readDoc(key, fallback));
  await writeDoc(key, next);
  return next;
};

// Documento que se vuelve a leer cada `ms` milisegundos. `update(fn)` guarda y refresca al momento.
export function useDoc(key, fallback, ms = 5000) {
  const [doc, setDoc] = useState(fallback);
  const fb = useRef(fallback);
  const keyRef = useRef(key);
  useEffect(() => {
    keyRef.current = key;
    if (!key) return;
    let alive = true;
    const pull = async () => {
      const d = await readDoc(key, fb.current);
      if (alive && keyRef.current === key) setDoc(d);
    };
    pull();
    const t = setInterval(pull, ms);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [key, ms]);
  const update = useCallback(
    async (fn) => {
      if (!keyRef.current) return;
      const next = await mutateDoc(keyRef.current, fb.current, fn);
      setDoc(next);
      return next;
    },
    [],
  );
  return [doc, update];
}
