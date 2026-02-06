import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Simple anonymous user creation
export const createAnonymous = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name: `User-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    })
    return userId
  },
})

export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})
