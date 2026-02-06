import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

const LOCK_TIMEOUT = 30000 // 30 seconds

export const list = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (!args.userId) {
      return []
    }
    return await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("userId"), args.userId))
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
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert("documents", {
      title: args.title,
      content: args.content ?? "",
      userId: args.userId,
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

export const acquireLock = mutation({
  args: {
    id: v.id("documents"),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id)
    if (!doc) throw new Error("Document not found")

    const now = Date.now()

    // Check if already locked by another session
    if (doc.lockedBy && doc.lockedBy !== args.sessionId) {
      // Check if lock has expired
      if (doc.lockedAt && now - doc.lockedAt < LOCK_TIMEOUT) {
        return { success: false, lockedBy: doc.lockedBy }
      }
    }

    // Acquire or renew lock
    await ctx.db.patch(args.id, {
      lockedBy: args.sessionId,
      lockedAt: now,
    })

    return { success: true }
  },
})

export const releaseLock = mutation({
  args: {
    id: v.id("documents"),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id)
    if (!doc) return

    // Only release if we own the lock
    if (doc.lockedBy === args.sessionId) {
      await ctx.db.patch(args.id, {
        lockedBy: undefined,
        lockedAt: undefined,
      })
    }
  },
})
