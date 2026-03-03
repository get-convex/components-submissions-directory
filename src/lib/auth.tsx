export { useConvexAuth } from "convex/react";

import { useConvexAuth } from "convex/react";
import { useConnectAuth } from "./connectAuth";
import { useCallback } from "react";

export function useAuth() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn, signOut } = useConnectAuth();

  const handleSignIn = useCallback(() => signIn(), [signIn]);

  return {
    isLoading,
    isAuthenticated,
    signIn: handleSignIn,
    signOut,
  };
}
