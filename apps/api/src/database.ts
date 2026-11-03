import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import type { Task, TaskPriority, TaskStatus, UpdateTaskInput } from '@taskboard/shared';

export type { Task, TaskPriority, TaskStatus } from '@taskboard/shared';
export type TaskInput = Pick<Task, 'title' | 'description' | 'status' | 'priority'>;
export type TaskPatch = UpdateTaskInput;

export interface Database {
  listTasks(filters?: { status?: TaskStatus; priority?: TaskPriority; search?: string }): Task[];
  getTask(id: string): Task | undefined;
  createTask(input: TaskInput): Task;
  updateTask(id: string, input: TaskPatch): Task | undefined;
  deleteTask(id: string): boolean;
  getStats(): { total: number; todo: number; inProgress: number; done: number };
  close(): void;
}

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  created_at: string;
  updated_at: string;
}

function asTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createDatabase(path: string): Database {
  if (path !== ':memory:') {
    mkdirSync(path.slice(0, path.lastIndexOf('/')) || '.', { recursive: true });
  }
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');
  if (path !== ':memory:') db.exec('PRAGMA journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 120),
      description TEXT CHECK(description IS NULL OR length(description) <= 2000),
      status TEXT NOT NULL CHECK(status IN ('TODO', 'IN_PROGRESS', 'DONE')),
      priority TEXT NOT NULL CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
    CREATE INDEX IF NOT EXISTS tasks_priority_idx ON tasks(priority);
  `);

  const selectTask = db.prepare('SELECT * FROM tasks WHERE id = ?');
  return {
    listTasks(filters = {}) {
      const clauses: string[] = [];
      const values: string[] = [];
      if (filters.status) { clauses.push('status = ?'); values.push(filters.status); }
      if (filters.priority) { clauses.push('priority = ?'); values.push(filters.priority); }
      if (filters.search) {
        clauses.push('(title LIKE ? COLLATE NOCASE OR description LIKE ? COLLATE NOCASE)');
        const search = `%${filters.search}%`;
        values.push(search, search);
      }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const rows = db.prepare(`SELECT * FROM tasks ${where} ORDER BY created_at DESC, id DESC`).all(...values) as unknown as TaskRow[];
      return rows.map(asTask);
    },
    getTask(id) {
      const row = selectTask.get(id) as unknown as TaskRow | undefined;
      return row ? asTask(row) : undefined;
    },
    createTask(input) {
      const now = new Date().toISOString();
      const task: Task = { id: randomUUID(), ...input, createdAt: now, updatedAt: now };
      db.prepare(`INSERT INTO tasks (id,title,description,status,priority,created_at,updated_at)
        VALUES (@id,@title,@description,@status,@priority,@createdAt,@updatedAt)`).run(task);
      return task;
    },
    updateTask(id, input) {
      const current = this.getTask(id);
      if (!current) return undefined;
      const next: Task = {
        ...current,
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.description === undefined ? {} : { description: input.description }),
        ...(input.status === undefined ? {} : { status: input.status }),
        ...(input.priority === undefined ? {} : { priority: input.priority }),
        updatedAt: new Date().toISOString(),
      };
      db.prepare(`UPDATE tasks SET title=@title, description=@description, status=@status,
        priority=@priority, updated_at=@updatedAt WHERE id=@id`).run({
        id: next.id,
        title: next.title,
        description: next.description,
        status: next.status,
        priority: next.priority,
        updatedAt: next.updatedAt,
      });
      return next;
    },
    deleteTask(id) {
      return Number(db.prepare('DELETE FROM tasks WHERE id = ?').run(id).changes) > 0;
    },
    getStats() {
      const result = db.prepare(`SELECT COUNT(*) AS total,
        SUM(CASE WHEN status='TODO' THEN 1 ELSE 0 END) AS todo,
        SUM(CASE WHEN status='IN_PROGRESS' THEN 1 ELSE 0 END) AS inProgress,
        SUM(CASE WHEN status='DONE' THEN 1 ELSE 0 END) AS done FROM tasks`).get() as unknown as {
          total: number; todo: number | null; inProgress: number | null; done: number | null;
        };
      return { total: result.total, todo: result.todo ?? 0, inProgress: result.inProgress ?? 0, done: result.done ?? 0 };
    },
    close() { db.close(); },
  };
}
