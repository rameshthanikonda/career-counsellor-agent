import type { Role } from "@/lib/types";

export function homeFor(role: Role): string {
  if (role === "admin") return "/admin";
  if (role === "counsellor") return "/counsellor";
  return "/learner";
}
