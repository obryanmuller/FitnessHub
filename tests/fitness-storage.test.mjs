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

function harness(saved = null) {
  let value = saved, fail = false, getter;
  const events = new Map(), timers = new Set(), unsubscribes = [];
  const localStorage = { getItem: () => value, setItem: (_key, next) => { if (fail) throw new Error('QuotaExceededError'); value = next; } };
  const window = {
    addEventListener: (event, fn) => events.set(event, fn),
    removeEventListener: (event) => events.delete(event),
    setInterval: (fn) => { timers.add(fn); return fn; },
    clearInterval: (fn) => timers.delete(fn),
  };
  const mod = { exports: {} };
  vm.runInNewContext(compile('../src/features/fitness/store.ts'), {
    module: mod, exports: mod.exports, window, localStorage,
    require: (id) => {
      if (id === './model') return model;
      if (id === '@/data/today-dashboard') return { todayDashboardMock: { routine } };
      if (id === 'react') return { useSyncExternalStore: (subscribe, get) => { getter = get; unsubscribes.push(subscribe(() => {})); return get(); } };
      throw new Error(`Unexpected import ${id}`);
    },
  });
  mod.exports.useFitness();
  return { ...mod.exports, snapshot: () => getter(), saved: () => value, setSaved: (next) => { value = next; }, failWrite: () => { fail = true; }, events, timers, unsubscribes };
}

test('saving commits persistent data and reloading restores it', () => {
  const app = harness();
  assert.equal(app.saveFitness((data) => model.changeDay(data, model.dayKey(), (day) => ({ ...day, waterMl: 1600 }))), true);
  assert.equal(model.getDay(app.snapshot().data, model.dayKey()).waterMl, 1600);
  const reloaded = harness(app.saved());
  assert.equal(model.getDay(reloaded.snapshot().data, model.dayKey()).waterMl, 1600);
});
test('storage write failure preserves prior state and reports an error', () => {
  const app = harness();
  app.failWrite();
  assert.equal(app.saveFitness((data) => ({ ...data, profile: { ...data.profile, name: 'Updated' } })), false);
  assert.equal(app.snapshot().data.profile.name, 'Bryan');
  assert.ok(app.snapshot().error);
  assert.equal(app.saved(), null);
});
test('corrupted storage is not overwritten; explicit validated restore recovers it', () => {
  const app = harness('{bad json');
  assert.ok(app.snapshot().error);
  assert.equal(app.saveFitness((data) => data), false);
  assert.equal(app.saved(), '{bad json');
  assert.equal(app.saveFitness(() => model.initialData(routine), true), true);
  assert.equal(app.snapshot().error, '');
});
test('switching screens retains storage and date listeners until the last subscriber leaves', () => {
  const app = harness();
  app.useFitness();
  app.unsubscribes[0]();
  assert.equal(app.events.has('storage'), true);
  assert.equal(app.timers.size, 1);
  app.unsubscribes[1]();
  assert.equal(app.events.size, 0);
  assert.equal(app.timers.size, 0);
});
test('storage events sync tabs and mutations refresh data before writing', () => {
  const app = harness();
  const other = model.initialData(routine);
  other.profile.name = 'Outro nome';
  app.setSaved(JSON.stringify(other));
  app.events.get('storage')({ key: 'fitnesshub.personal.v1' });
  assert.equal(app.snapshot().data.profile.name, 'Outro nome');
  other.profile.bottleMl = 900;
  app.setSaved(JSON.stringify(other));
  app.saveFitness((data) => model.changeDay(data, model.dayKey(), (day) => ({ ...day, waterMl: 900 })));
  assert.equal(app.snapshot().data.profile.bottleMl, 900);
});
