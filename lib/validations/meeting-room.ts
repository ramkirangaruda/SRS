// Validation for meeting-room group + message operations. Shared client/server.
import { z } from "zod";

export const groupCreateSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional().or(z.literal("")),
  memberIds: z.array(z.string()).default([]),
});

export const groupUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().or(z.literal("")),
});

export const addMembersSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1, "Pick at least one member"),
});

export const messageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(5000),
});

export type GroupCreateInput = z.infer<typeof groupCreateSchema>;
