import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

export const list = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    // Verify document ownership
    const doc = await ctx.db.get(args.documentId)
    if (!doc || doc.userId !== userId) return []

    const snaps = await ctx.db
      .query("snapshots")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .order("desc")
      .take(50)
    // Strip large fields — timeline only needs metadata.
    // contentJson is fetched separately via getSnapshot when restoring.
    return snaps.map(({ markdown, contentJson, ...meta }) => ({
      ...meta,
      hasContentJson: !!contentJson,
    }))
  },
})

export const create = mutation({
  args: {
    documentId: v.id("documents"),
    markdown: v.string(),
    contentJson: v.optional(v.string()),
    wordCount: v.number(),
    label: v.string(),
    trigger: v.union(
      v.literal("auto"),
      v.literal("manual"),
      v.literal("ai-before"),
      v.literal("ai-after")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const doc = await ctx.db.get(args.documentId)
    if (!doc || doc.userId !== userId) throw new Error("Document not found")

    const id = await ctx.db.insert("snapshots", {
      documentId: args.documentId,
      markdown: args.markdown,
      contentJson: args.contentJson,
      wordCount: args.wordCount,
      label: args.label,
      trigger: args.trigger,
      createdAt: Date.now(),
    })

    // Prune oldest auto-snapshots beyond 200 cap
    const all = await ctx.db
      .query("snapshots")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .order("asc")
      .collect()

    if (all.length > 200) {
      const excess = all.length - 200
      const autoSnapshots = all.filter((s) => s.trigger === "auto")
      const toDelete = autoSnapshots.slice(0, excess)
      for (const snap of toDelete) {
        await ctx.db.delete(snap._id)
      }
    }

    return id
  },
})

export const getSnapshot = query({
  args: { id: v.id("snapshots") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const snap = await ctx.db.get(args.id)
    if (!snap) return null

    const doc = await ctx.db.get(snap.documentId)
    if (!doc || doc.userId !== userId) return null

    return snap
  },
})

export const getTwo = query({
  args: {
    id1: v.id("snapshots"),
    id2: v.id("snapshots"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const [s1, s2] = await Promise.all([
      ctx.db.get(args.id1),
      ctx.db.get(args.id2),
    ])

    if (!s1 || !s2) return null

    // Verify both belong to same document owned by user
    const doc = await ctx.db.get(s1.documentId)
    if (!doc || doc.userId !== userId) return null
    if (s1.documentId !== s2.documentId) return null

    return { s1, s2 }
  },
})
