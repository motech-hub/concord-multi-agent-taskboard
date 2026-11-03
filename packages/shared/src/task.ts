import { z } from 'zod';

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;

export const taskStatusSchema = z.enum(TASK_STATUSES);
export const taskPrioritySchema = z.enum(TASK_PRIORITIES);

export const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  status: taskStatusSchema.default('TODO'),
  priority: taskPrioritySchema.default('MEDIUM'),
});

export const updateTaskSchema = z.object({
  title: createTaskSchema.shape.title.optional(),
  description: createTaskSchema.shape.description,
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
}).strict().refine(
  (value) => Object.values(value).some((field) => field !== undefined),
  'At least one field must be provided',
);

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type Task = z.infer<typeof taskSchema>;
export type CreateTaskInput = z.input<typeof createTaskSchema>;
export type UpdateTaskInput = z.input<typeof updateTaskSchema>;

export interface TaskStats {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
}

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}
