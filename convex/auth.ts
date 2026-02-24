import GitHub from "@auth/core/providers/github";
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { query, QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";
import { v } from "convex/values";

type AuthContext = QueryCtx | MutationCtx | ActionCtx;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [GitHub],
});

// Re-export getAuthUserId for use in other files
export { getAuthUserId };

/**
 * Helper to check if the current user is an admin (@convex.dev email).
 * Returns the user info if admin, throws an error otherwise.
 * Uses getAuthUserId to fetch user from database (where @convex-dev/auth stores user data).
 */
export async function requireAdminIdentity(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Authentication required");
  }
  
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }
  
  const email = user.email;
  if (!email?.endsWith("@convex.dev")) {
    throw new Error("Admin access requires @convex.dev email");
  }
  
  return { email, user, userId };
}

/**
 * Helper to check if the current user is an admin without throwing.
 * Returns the user info if admin, null otherwise.
 */
export async function getAdminIdentity(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return null;
  }
  
  const user = await ctx.db.get(userId);
  if (!user) {
    return null;
  }
  
  const email = user.email;
  if (!email?.endsWith("@convex.dev")) {
    return null;
  }
  
  return { email, user, userId };
}

// Query to get the currently logged in user info
// Uses getAuthUserId to fetch user from the database (where @convex-dev/auth stores user data)
export const loggedInUser = query({
  args: {},
  returns: v.union(
    v.object({
      email: v.optional(v.string()),
      name: v.optional(v.string()),
      pictureUrl: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    
    // Get user from the users table (created by @convex-dev/auth)
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    
    return {
      email: user.email,
      name: user.name,
      pictureUrl: user.image,
    };
  },
});

// Query to check if current user is an admin
export const isAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }
    
    const user = await ctx.db.get(userId);
    if (!user || !user.email) {
      return false;
    }
    
    return user.email.endsWith("@convex.dev");
  },
});
