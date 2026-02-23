"use client";
import { useAuth } from "@workos-inc/authkit-react";
import { useConvexAuth } from "convex/react";
import { SignOut } from "@phosphor-icons/react";

export function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <button
      className="p-2 rounded-full bg-white text-text-secondary border border-gray-200 hover:bg-gray-50 hover:text-text-primary transition-colors"
      onClick={() => signOut()}
      title="Sign out"
    >
      <SignOut size={18} weight="bold" />
    </button>
  );
}
