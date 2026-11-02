import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Estado que se puede escribir cientos de veces por segundo y se redibuja como
 * mucho `hz` veces por segundo. Los datos del exchange llegan mucho más rápido
 * de lo que una persona puede leer: guardar cada mensaje en React trabaría la
 * pantalla. El último valor se guarda en una ref y un intervalo lo publica.
 */
export function useThrottledState<T>(initial: T, hz: number): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState(initial);
  const latest = useRef(initial);
  const dirty = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (!dirty.current) return;
      dirty.current = false;
      setValue(latest.current);
    }, 1000 / hz);
    return () => clearInterval(id);
  }, [hz]);

  const write = useCallback((next: T | ((prev: T) => T)) => {
    latest.current = typeof next === 'function' ? (next as (prev: T) => T)(latest.current) : next;
    dirty.current = true;
  }, []);

  return [value, write];
}
