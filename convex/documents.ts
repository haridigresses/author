import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return []
    }
    return await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("userId"), userId))
      .order("desc")
      .collect()
  },
})

export const get = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

export const create = mutation({
  args: {
    title: v.string(),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")
    const now = Date.now()
    return await ctx.db.insert("documents", {
      title: args.title,
      content: args.content ?? "",
      userId,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    })
  },
})

export const remove = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
  },
})
