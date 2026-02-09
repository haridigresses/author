import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"
import { authTables } from "@convex-dev/auth/server"

export default defineSchema({
  ...authTables,
  documents: defineTable({
    title: v.string(),
    content: v.string(), // TipTap JSON content as string
    createdAt: v.number(),
    updatedAt: v.number(),
    userId: v.optional(v.id("users")), // Auth user ID
  }),
})
