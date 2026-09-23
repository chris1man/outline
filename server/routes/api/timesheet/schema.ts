import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const date = z.string().date();
const hours = z.number().min(0).max(24).refine((value) => Number.isInteger(value * 4), {
  message: "hours must use 0.25 steps",
});

export const TimesheetListSchema = BaseSchema.extend({
  body: z.object({
    month,
    userId: z.uuid().optional(),
    all: z.boolean().optional(),
  }),
});
export type TimesheetListReq = z.infer<typeof TimesheetListSchema>;

export const TimesheetUpsertSchema = BaseSchema.extend({
  body: z.object({
    id: z.uuid().optional(),
    userId: z.uuid().optional(),
    date,
    hours,
    workplace: z.string().trim().max(100).default(""),
    comment: z.string().trim().max(2000).default(""),
  }),
});
export type TimesheetUpsertReq = z.infer<typeof TimesheetUpsertSchema>;

export const TimesheetDeleteSchema = BaseSchema.extend({
  body: z.object({ id: z.uuid() }),
});
export type TimesheetDeleteReq = z.infer<typeof TimesheetDeleteSchema>;

export const TimesheetWorkplaceDeleteSchema = BaseSchema.extend({
  body: z.object({ id: z.uuid() }),
});
export type TimesheetWorkplaceDeleteReq = z.infer<
  typeof TimesheetWorkplaceDeleteSchema
>;
