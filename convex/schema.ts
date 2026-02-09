import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"
import { authTables } from "@convex-dev/auth/server"

export default defineSchema({
  ...authTables,
  documents: defineTable({
    title: v.string(),
    content: v.string(), // TipTap JSON content as string
    status: v.optional(v.string()), // idea, draft, review, completed, published, archived
    createdAt: v.number(),
    updatedAt: v.number(),
    userId: v.optional(v.id("users")), // Auth user ID
  }),
  snapshots: defineTable({
    documentId: v.id("documents"),
    markdown: v.string(),
    contentJson: v.optional(v.string()), // TipTap JSON (only for restore-point snapshots)
    wordCount: v.number(),
    label: v.string(),
    trigger: v.union(
      v.literal("auto"),
      v.literal("manual"),
      v.literal("ai-before"),
      v.literal("ai-after")
    ),
    createdAt: v.number(),
  }).index("by_document", ["documentId", "createdAt"]),
})
