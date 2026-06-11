import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with intelligent handling of conflicting utilities.
 * Combines clsx (conditional classes) with twMerge (Tailwind conflict resolution).
 *
 * @example
 * cn('px-2 px-4') // Returns 'px-4' (latter wins)
 * cn('px-2', condition && 'px-4') // Conditionally merges
 * cn('text-lg', ['font-bold', 'text-white']) // Merges arrays
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
