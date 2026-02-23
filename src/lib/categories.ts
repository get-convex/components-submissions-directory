// Component categories - fetched from DB with static fallback
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

// Static fallback categories (used when DB is empty or loading)
export const CATEGORIES = [
  { id: "ai", label: "AI", description: "Components for building AI-powered applications." },
  { id: "auth", label: "Authentication", description: "Components for authentication and authorization." },
  { id: "backend", label: "Backend", description: "Backend capabilities powering features throughout the stack." },
  { id: "database", label: "Database", description: "Components for real-time data management and synchronization." },
  { id: "durable-functions", label: "Durable Functions", description: "Workflows, crons, and background jobs." },
  { id: "integrations", label: "Integrations", description: "Third-party service integrations." },
  { id: "payments", label: "Payments", description: "Payment processing and billing." },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

// Category shape returned from the DB or fallback
export interface CategoryItem {
  id: string;
  label: string;
  description: string;
}

// Hook: fetch directory categories from admin-managed source, with loading fallback.
export function useDirectoryCategories(): CategoryItem[] {
  const dbCategories = useQuery(api.packages.listCategories);

  // While loading, keep existing fallback behavior for a stable UI.
  if (!dbCategories) {
    return CATEGORIES.map((c) => ({
      id: c.id,
      label: c.label,
      description: c.description,
    }));
  }

  // Once loaded, always use admin-managed categories as the source of truth.
  return dbCategories.map((c) => ({
    id: c.category,
    label: c.label,
    description: c.description,
  }));
}

// Backwards-compatible alias to avoid breaking existing imports.
export const useCategories = useDirectoryCategories;

// Get category label from id (static fallback for non-hook contexts)
export function getCategoryLabel(id: string): string {
  const cat = CATEGORIES.find((c) => c.id === id);
  return cat?.label || id;
}
