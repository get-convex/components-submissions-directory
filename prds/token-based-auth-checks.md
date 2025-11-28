# Token Based Auth Checks in Convex Components

Summary of how the [Convex Presence Component](https://github.com/get-convex/presence/blob/main/src/client/index.ts) handles mutations with the Convex database.

## Architecture Overview

The Presence component uses a **delegation pattern** where the client class acts as a thin wrapper around Convex component functions. It doesn't directly interact with the database but instead delegates all operations to the component's public API.

## Key Design Patterns

### 1. Context Injection Pattern

Every method receives a `ctx` parameter (`RunMutationCtx` or `RunQueryCtx`) from the caller. This allows the component to run within the context of your application's functions:

```typescript
async heartbeat(
  ctx: RunMutationCtx,  // Context passed from caller
  roomId: RoomId,
  userId: UserId,
  sessionId: string,
  interval: number,
): Promise<{ roomToken: string; sessionToken: string }>
```

### 2. Component API Delegation

All database operations are delegated through `ctx.runMutation()` or `ctx.runQuery()` to the component's public API:

```typescript
return ctx.runMutation(this.component.public.heartbeat, {
  roomId,
  userId,
  sessionId,
  interval,
});
```

This separation keeps the component's internal implementation hidden while exposing a clean public interface.

### 3. Token Based Authorization

The component uses a clever token system:

- `heartbeat()` returns `roomToken` and `sessionToken`
- `list()` requires `roomToken` to read room data
- `disconnect()` requires `sessionToken` to end a session

This allows the parent application to handle authentication while the component handles authorization internally.

## Mutation Categories

| Function | Type | Purpose |
|----------|------|---------|
| `heartbeat` | Mutation | Keeps user session alive, returns auth tokens |
| `updateRoomUser` | Mutation | Updates user's presence data in a room |
| `disconnect` | Mutation | Gracefully ends a user session |
| `removeRoomUser` | Mutation | Admin removal of user from room |
| `removeRoom` | Mutation | Admin removal of entire room |

## Session Lifecycle

1. **Connect**: Call `heartbeat()` to establish presence, receive tokens
2. **Maintain**: Call `heartbeat()` at regular intervals (before 2.5x timeout)
3. **Update**: Call `updateRoomUser()` to change presence data
4. **Disconnect**: Call `disconnect()` with session token for clean exit

## What Makes This Pattern Effective

### Separation of Concerns

The component handles presence logic. Your app handles user authentication. They communicate through tokens.

### No Direct DB Access

The client class never calls `ctx.db` directly. All database operations live in the component's internal implementation.

### Type Safety

Generic types `RoomId` and `UserId` ensure type safety flows through the entire API.

### Idempotent Design

`heartbeat()` is safe to call repeatedly. If a session exists, it updates. If not, it creates.

## Applying This Pattern

This pattern is a clean example of how to build reusable Convex components that integrate with parent applications while maintaining clear boundaries between authentication (your app) and authorization (the component).

### Example Usage

```typescript
// In your Convex function
export const joinRoom = mutation({
  args: { roomId: v.string() },
  returns: v.object({
    roomToken: v.string(),
    sessionToken: v.string(),
  }),
  handler: async (ctx, args) => {
    // Your app handles authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Component handles presence with tokens
    return await presence.heartbeat(
      ctx,
      args.roomId,
      identity.subject,
      crypto.randomUUID(),
      30000 // 30 second heartbeat interval
    );
  },
});
```

## References

- [Convex Presence Component](https://github.com/get-convex/presence)
- [Source: src/client/index.ts](https://github.com/get-convex/presence/blob/main/src/client/index.ts)

