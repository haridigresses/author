import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  users: defineTable({
    name: v.string(),
    createdAt: v.number(),
  }),
  documents: defineTable({
    title: v.string(),
    content: v.string(), // TipTap JSON content as string
    createdAt: v.number(),
    updatedAt: v.number(),
    userId: v.optional(v.id("users")), // Link to user who created it
  }),
})
