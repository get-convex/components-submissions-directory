"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { SignOut } from "@phosphor-icons/react";

export function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <button
      className="p-2 rounded-full bg-white text-text-secondary border border-gray-200 hover:bg-gray-50 hover:text-text-primary transition-colors"
      onClick={() => void signOut()}
      title="Sign out"
    >
      <SignOut size={18} weight="bold" />
    </button>
  );
}
