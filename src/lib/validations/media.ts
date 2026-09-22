import { z } from "zod";

export const uploadMediaSchema = z.object({
  parentType: z.enum(["car", "part"]),
  parentId: z.string().regex(/^\d+$/, "Parent ID must be a positive integer"),
  caption: z.string().max(500).optional(),
});

export type UploadMediaInput = z.input<typeof uploadMediaSchema>;
export type UploadMediaData = z.output<typeof uploadMediaSchema>;

export const setPrimaryMediaSchema = z.object({
  parentType: z.enum(["car", "part"]),
  parentId: z.string().regex(/^\d+$/, "Parent ID must be a positive integer"),
  mediaId: z.string().regex(/^\d+$/, "Media ID must be a positive integer"),
});

export type SetPrimaryMediaInput = z.input<typeof setPrimaryMediaSchema>;
export type SetPrimaryMediaData = z.output<typeof setPrimaryMediaSchema>;

export const reorderMediaSchema = z.object({
  parentType: z.enum(["car", "part"]),
  parentId: z.string().regex(/^\d+$/, "Parent ID must be a positive integer"),
  orderedMediaIds: z
    .array(z.string().regex(/^\d+$/, "Media ID must be a positive integer"))
    .min(1, "At least one media ID required"),
});

export type ReorderMediaInput = z.input<typeof reorderMediaSchema>;
export type ReorderMediaData = z.output<typeof reorderMediaSchema>;

export const deleteMediaSchema = z.object({
  parentType: z.enum(["car", "part"]),
  parentId: z.string().regex(/^\d+$/, "Parent ID must be a positive integer"),
  mediaId: z.string().regex(/^\d+$/, "Media ID must be a positive integer"),
});

export type DeleteMediaInput = z.input<typeof deleteMediaSchema>;
export type DeleteMediaData = z.output<typeof deleteMediaSchema>;