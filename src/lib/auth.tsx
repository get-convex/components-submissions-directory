// Re-export auth hooks from @convex-dev/auth for convenience
export { useAuthActions } from "@convex-dev/auth/react";
export { useConvexAuth } from "convex/react";

// Custom hook that provides a unified auth interface
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useCallback } from "react";

export function useAuth() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();

  // Wrapper for signIn that defaults to GitHub
  const handleSignIn = useCallback(
    (provider = "github") => {
      return signIn(provider);
    },
    [signIn]
  );

  return {
    isLoading,
    isAuthenticated,
    signIn: handleSignIn,
    signOut,
  };
}
