import { useEffect, useState } from "react";

/** Retorna undefined até montar no navegador (evita divergência com a renderização no servidor). */
export function useMediaQuery(query: string): boolean | undefined {
  const [matches, setMatches] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);
  return matches;
}

export const DESKTOP_QUERY = "(min-width: 1024px)";
