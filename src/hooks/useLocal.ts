import { useEffect, useState } from 'react';

/**
 * Lets a control work on its own when a screen only supplies its initial
 * value, while still following a screen that manages the value itself.
 */
export function useLocal<T>(value: T, onChange?: (v: T) => void): [T, (v: T) => void] {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return [
    local,
    (v: T) => {
      setLocal(v);
      onChange?.(v);
    },
  ];
}
