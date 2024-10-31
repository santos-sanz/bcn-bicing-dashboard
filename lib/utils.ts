import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const someUtilityFunction = () => {
  if (typeof window !== 'undefined') {
    // Uso de `window` aquí
  }
  // ...código existente...
}
