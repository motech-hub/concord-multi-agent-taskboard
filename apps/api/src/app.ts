import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import { createTaskSchema, taskPrioritySchema, taskStatusSchema, updateTaskSchema } from '@taskboard/shared';
import { z } from 'zod';
import { createDatabase, type Database } from './database.js';

const filtersSchema = z.object({
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  search: z.string().trim().max(160).optional(),
}).strict();

export interface AppOptions {
  databasePath?: string;
  allowedOrigins?: string[];
  database?: Database;
}

export function createApp(options: AppOptions = {}) {
  const database = options.database ?? createDatabase(options.databasePath ?? process.env.DATABASE_PATH ?? 'data/tasks.sqlite');
  const allowedOrigins = options.allowedOrigins ?? (process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
    : ['http://localhost:5173', 'http://127.0.0.1:5173']);
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: allowedOrigins, methods: ['GET', 'POST', 'PATCH', 'DELETE'], allowedHeaders: ['Content-Type'] }));
  app.use(express.json({ limit: '64kb', strict: true }));

  app.get('/api/health', (_request, response) => response.json({ data: { status: 'ok' } }));

  // Keep this static route above /:id so it is not mistaken for a task identifier.
  app.get('/api/tasks/stats', (_request, response) => response.json({ data: database.getStats() }));

  app.get('/api/tasks', (request, response) => {
    const parsed = filtersSchema.safeParse(request.query);
    if (!parsed.success) return validationError(response, parsed.error.issues);
    const filters = parsed.data;
    return response.json({ data: database.listTasks({
      ...(filters.status === undefined ? {} : { status: filters.status }),
      ...(filters.priority === undefined ? {} : { priority: filters.priority }),
      ...(filters.search === undefined ? {} : { search: filters.search }),
    }) });
  });

  app.get('/api/tasks/:id', (request, response) => {
    const task = database.getTask(request.params.id ?? '');
    return task ? response.json({ data: task }) : notFound(response);
  });

  app.post('/api/tasks', (request, response) => {
    const parsed = createTaskSchema.safeParse(request.body);
    if (!parsed.success) return validationError(response, parsed.error.issues);
    return response.status(201).json({ data: database.createTask({
      ...parsed.data,
      description: parsed.data.description ?? null,
    }) });
  });

  app.patch('/api/tasks/:id', (request, response) => {
    const parsed = updateTaskSchema.safeParse(request.body);
    if (!parsed.success) return validationError(response, parsed.error.issues);
    const task = database.updateTask(request.params.id ?? '', parsed.data);
    return task ? response.json({ data: task }) : notFound(response);
  });

  app.delete('/api/tasks/:id', (request, response) => {
    const id = request.params.id ?? '';
    return database.deleteTask(id) ? response.json({ data: { id } }) : notFound(response);
  });

  app.use((_request, response) => response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }));

  const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
    const candidate = error as { status?: number; type?: string; message?: string };
    if (candidate.type === 'entity.too.large' || candidate.status === 413) {
      return response.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds 64kb' } });
    }
    if (error instanceof SyntaxError && candidate.status === 400) {
      return response.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Malformed JSON request body' } });
    }
    return response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  };
  app.use(errorHandler);

  return { app, database };
}

function validationError(response: express.Response, issues: z.core.$ZodIssue[]) {
  return response.status(400).json({ error: {
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    details: issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
  } });
}

function notFound(response: express.Response) {
  return response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Task not found' } });
}
