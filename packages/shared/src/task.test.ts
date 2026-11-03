import { describe, expect, it } from 'vitest';
import { createTaskSchema, taskSchema, updateTaskSchema } from './task.js';

describe('task contracts', () => {
  it('accepts a task matching the API contract', () => {
    expect(taskSchema.safeParse({
      id: 'task-1', title: 'Ship the board', description: null,
      status: 'IN_PROGRESS', priority: 'HIGH',
      createdAt: '2026-11-03T10:00:00.000Z', updatedAt: '2026-11-03T10:00:00.000Z',
    }).success).toBe(true);
  });

  it('rejects blank task titles and defaults status and priority', () => {
    expect(createTaskSchema.safeParse({ title: '  ' }).success).toBe(false);
    expect(createTaskSchema.parse({ title: 'Plan release' })).toMatchObject({ status: 'TODO', priority: 'MEDIUM' });
  });

  it('rejects empty patches', () => {
    expect(updateTaskSchema.safeParse({}).success).toBe(false);
    expect(updateTaskSchema.safeParse({ status: 'DONE' }).success).toBe(true);
  });
});
