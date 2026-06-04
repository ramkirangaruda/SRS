// The `cn` ("class names") helper used throughout shadcn/ui components.
//
// It does two things:
//  1. clsx: conditionally join class names (e.g. cn("p-2", isActive && "bg-blue")).
//  2. twMerge: intelligently de-duplicate conflicting Tailwind classes so the
//     last one wins (e.g. cn("p-2", "p-4") -> "p-4", not "p-2 p-4").
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
