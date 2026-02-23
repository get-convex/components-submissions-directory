import { query, QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";
import { v } from "convex/values";

type AuthContext = QueryCtx | MutationCtx | ActionCtx;

/**
 * Helper to check if the current user is an admin (@convex.dev email).
 * Returns the identity if admin, throws an error otherwise.
 */
export async function requireAdminIdentity(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
  const email = identity.email;
  if (!email?.endsWith("@convex.dev")) {
    throw new Error("Admin access requires @convex.dev email");
  }
  return identity;
}

/**
 * Helper to check if the current user is an admin without throwing.
 * Returns the identity if admin, null otherwise.
 */
export async function getAdminIdentity(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  const email = identity.email;
  if (!email?.endsWith("@convex.dev")) {
    return null;
  }
  return identity;
}

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    
    return {
      email: identity.email,
      name: identity.name,
      pictureUrl: identity.pictureUrl,
    };
  },
});

export const isAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }
    
    const email = identity.email;
    if (!email) {
      return false;
    }
    
    return email.endsWith("@convex.dev");
  },
});
