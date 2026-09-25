import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const compile = (file) => ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const modelModule = { exports: {} };
vm.runInNewContext(compile('../src/features/fitness/model.ts'), { exports: modelModule.exports, module: modelModule });
const model = modelModule.exports;
const routine = [{ id: 'workout-gym', title: 'Academia', time: '06:00', entries: ['Musculação'] }];
const clone = (value) => JSON.parse(JSON.stringify(value));

function harness({ legacy = null, profiles: seed = [] } = {}) {
  const database = new Map(seed.map((profile) => [profile.id, clone(profile.data)]));
  const local = new Map();
  if (legacy !== null) local.set('fitnesshub.personal.v1', legacy);
  let getter;
  let failWrites = false;
  let sequence = seed.length;
  const events = new Map(), timers = new Set(), unsubscribes = [];
  const localStorage = { getItem: (key) => local.get(key) ?? null, setItem: (key, value) => local.set(key, value), removeItem: (key) => local.delete(key) };
  const response = (status, body) => ({ ok: status >= 200 && status < 300, json: async () => clone(body) });
  const fetch = async (url, init = {}) => {
    const method = init.method ?? 'GET';
    if (url === '/api/profiles' && method === 'GET') {
      return response(200, { profiles: [...database].map(([id, data]) => ({ id, name: data.profile.name, updatedAt: '2026-01-01T00:00:00Z' })) });
    }
    if (url === '/api/profiles' && method === 'POST') {
      if (failWrites) return response(503, { error: 'Banco indisponível.' });
      const id = `profile-${++sequence}`;
      const data = JSON.parse(init.body).data;
      database.set(id, clone(data));
      return response(201, { id, data, updatedAt: '2026-01-01T00:00:00Z' });
    }
    const id = decodeURIComponent(url.slice('/api/profiles/'.length));
    if (!database.has(id)) return response(404, { error: 'Perfil não encontrado.' });
    if (method === 'GET') return response(200, { id, data: database.get(id), revision: 1 });
    if (method === 'PUT') {
      if (failWrites) return response(503, { error: 'Banco indisponível.' });
      database.set(id, clone(JSON.parse(init.body).data));
      return response(200, { id, revision: 2, updatedAt: '2026-01-02T00:00:00Z' });
    }
    return response(405, {});
  };
  class BroadcastChannel { postMessage() {} close() {} }
  const window = {
    addEventListener: (event, fn) => events.set(event, fn),
    removeEventListener: (event) => events.delete(event),
    setInterval: (fn) => { timers.add(fn); return fn; },
    clearInterval: (fn) => timers.delete(fn),
  };
  const mod = { exports: {} };
  vm.runInNewContext(compile('../src/features/fitness/store.ts'), {
    module: mod, exports: mod.exports, window, localStorage, fetch, BroadcastChannel,
    require: (id) => {
      if (id === './model') return model;
      if (id === '@/data/today-dashboard') return { todayDashboardMock: { routine } };
      if (id === 'react') return { useSyncExternalStore: (subscribe, get) => { getter = get; unsubscribes.push(subscribe(() => {})); return get(); } };
      throw new Error(`Unexpected import ${id}`);
    },
  });
  mod.exports.useFitness();
  const settle = async () => {
    for (let index = 0; index < 5; index++) await new Promise((resolve) => setImmediate(resolve));
  };
  return { ...mod.exports, snapshot: () => getter(), database, local, events, timers, unsubscribes, settle, failWrites: () => { failWrites = true; }, recoverWrites: () => { failWrites = false; } };
}

test('first cloud profile imports valid legacy browser data', async () => {
  const old = model.initialData(routine);
  old.profile.name = 'Bryan migrado';
  old.weights.push({ date: '2026-01-01', kg: 100 });
  const app = harness({ legacy: JSON.stringify(old) });
  await app.settle();
  assert.equal(app.snapshot().ready, true);
  assert.equal(app.snapshot().data.profile.name, 'Bryan migrado');
  assert.equal([...app.database.values()][0].weights.length, 1);
});

test('saving is optimistic and persists the active profile in the cloud', async () => {
  const app = harness();
  await app.settle();
  assert.equal(app.saveFitness((data) => model.changeDay(data, model.dayKey(), (day) => ({ ...day, waterMl: 1600 }))), true);
  assert.equal(model.getDay(app.snapshot().data, model.dayKey()).waterMl, 1600);
  await app.settle();
  assert.equal(model.getDay([...app.database.values()][0], model.dayKey()).waterMl, 1600);
});

test('profiles can be created and switched without sharing their records', async () => {
  const app = harness();
  await app.settle();
  const firstId = app.snapshot().activeProfileId;
  assert.equal(await app.createFitnessProfile('Segundo perfil'), true);
  app.saveFitness((data) => ({ ...data, weights: [{ date: '2026-01-01', kg: 70 }] }));
  await app.settle();
  await app.switchFitnessProfile(firstId);
  await app.settle();
  assert.equal(app.snapshot().data.profile.name, 'Bryan');
  assert.equal(app.snapshot().data.weights.length, 0);
  assert.equal(app.snapshot().profiles.length, 2);
});

test('a failed cloud write stays available offline and syncs after reconnection', async () => {
  const app = harness();
  await app.settle();
  app.failWrites();
  assert.equal(app.saveFitness((data) => ({ ...data, profile: { ...data.profile, bottleMl: 900 } })), true);
  await app.settle();
  assert.equal(app.snapshot().data.profile.bottleMl, 900);
  assert.equal(app.snapshot().syncStatus, 'offline');
  assert.ok(app.local.has('fitnesshub.outbox.v1'));
  assert.equal([...app.database.values()][0].profile.bottleMl, 800);
  app.recoverWrites();
  await app.events.get('online')();
  await app.settle();
  assert.equal([...app.database.values()][0].profile.bottleMl, 900);
  assert.equal(app.snapshot().syncStatus, 'saved');
});

test('store listeners stay active until the final screen subscriber leaves', async () => {
  const app = harness();
  app.useFitness();
  await app.settle();
  app.unsubscribes[0]();
  assert.equal(app.events.has('focus'), true);
  assert.equal(app.timers.size, 1);
  app.unsubscribes[1]();
  assert.equal(app.events.size, 0);
  assert.equal(app.timers.size, 0);
});
