import { useEffect, useRef, type RefObject } from 'react';

export const useClickOutside = <T extends HTMLElement>(
  enabled: boolean,
  onClickOutside: () => void,
): RefObject<T | null> => {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClickOutside();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [enabled, onClickOutside]);

  return ref;
};
