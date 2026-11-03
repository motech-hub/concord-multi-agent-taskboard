import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './app.js';
import { createDatabase, type Database } from './database.js';

describe('task API', () => {
  let database: Database | undefined;

  afterEach(() => {
    database?.close();
    database = undefined;
  });

  function app() {
    const instance = createApp({ databasePath: ':memory:' });
    database = instance.database;
    return instance.app;
  }

  it('creates and lists a persisted task with the shared task fields', async () => {
    const server = app();
    const created = await request(server).post('/api/tasks').send({
      title: 'Ship the MVP', description: 'Finish CRUD', priority: 'HIGH', status: 'TODO',
    }).expect(201);

    expect(created.body.data).toMatchObject({
      title: 'Ship the MVP', description: 'Finish CRUD', priority: 'HIGH', status: 'TODO',
    });
    expect(created.body.data.id).toEqual(expect.any(String));
    expect(created.body.data.createdAt).toEqual(expect.any(String));
    expect(created.body.data.updatedAt).toEqual(created.body.data.createdAt);
    await request(server).get('/api/tasks').expect(200).expect(({ body }) => {
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(created.body.data.id);
    });
  });

  it('rejects empty titles and unknown enum values', async () => {
    const server = app();
    await request(server).post('/api/tasks').send({ title: '  ' }).expect(400);
    await request(server).post('/api/tasks').send({ title: 'Valid', priority: 'URGENT' }).expect(400);
  });

  it('gets, updates, and deletes a task and returns 404 after deletion', async () => {
    const server = app();
    const { body } = await request(server).post('/api/tasks').send({ title: 'Draft' }).expect(201);
    const id = body.data.id as string;

    await request(server).get(`/api/tasks/${id}`).expect(200).expect(({ body: result }) => {
      expect(result.data.id).toBe(id);
    });
    await request(server).patch(`/api/tasks/${id}`).send({ status: 'IN_PROGRESS', priority: 'MEDIUM' })
      .expect(200).expect(({ body: result }) => {
        expect(result.data).toMatchObject({ status: 'IN_PROGRESS', priority: 'MEDIUM' });
      });
    await request(server).delete(`/api/tasks/${id}`).expect(200);
    await request(server).get(`/api/tasks/${id}`).expect(404);
    await request(server).patch('/api/tasks/missing').send({ status: 'DONE' }).expect(404);
  });

  it('calculates status statistics from stored tasks', async () => {
    const server = app();
    await request(server).post('/api/tasks').send({ title: 'One' }).expect(201);
    await request(server).post('/api/tasks').send({ title: 'Two', status: 'IN_PROGRESS' }).expect(201);
    await request(server).post('/api/tasks').send({ title: 'Three', status: 'DONE' }).expect(201);

    await request(server).get('/api/tasks/stats').expect(200).expect(({ body }) => {
      expect(body.data).toEqual({ total: 3, todo: 1, inProgress: 1, done: 1 });
    });
  });

  it('filters tasks by search, priority, and status', async () => {
    const server = app();
    await request(server).post('/api/tasks').send({ title: 'Write API docs', description: 'REST guide', priority: 'HIGH' }).expect(201);
    await request(server).post('/api/tasks').send({ title: 'Polish board', status: 'DONE' }).expect(201);

    await request(server).get('/api/tasks?search=rest&priority=HIGH').expect(200).expect(({ body }) => {
      expect(body.data).toHaveLength(1);
      expect(body.data[0].title).toBe('Write API docs');
    });
    await request(server).get('/api/tasks?status=DONE').expect(200).expect(({ body }) => {
      expect(body.data).toHaveLength(1);
      expect(body.data[0].title).toBe('Polish board');
    });
  });

  it('retains tasks after the database connection is reopened', () => {
    const directory = mkdtempSync(join(tmpdir(), 'taskboard-api-'));
    const path = join(directory, 'test.sqlite');
    const first = createDatabase(path);
    const stored = first.createTask({ title: 'Persisted', description: null, status: 'TODO', priority: 'LOW' });
    first.close();

    const reopened = createDatabase(path);
    expect(reopened.getTask(stored.id)?.title).toBe('Persisted');
    reopened.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('reports malformed JSON and missing resources in a consistent error shape', async () => {
    const server = app();
    await request(server).get('/api/tasks/missing').expect(404).expect(({ body }) => {
      expect(body.error.code).toBe('NOT_FOUND');
    });
    await request(server).post('/api/tasks').set('Content-Type', 'application/json').send('{')
      .expect(400).expect(({ body }) => {
        expect(body.error.code).toBe('BAD_REQUEST');
      });
  });
});
