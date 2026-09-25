import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/features/fitness/model.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { dayKey, initialData, getDay, changeDay, changePlan, toggleId, streak, isFitnessData, validDate } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const routine = [
  { id: 'breakfast', time: '05:30', title: 'Pré-treino', entries: ['Banana'] },
  { id: 'workout-gym', time: '06:00', title: 'Academia', entries: ['Musculação'] },
];

test('new personal account contains no fabricated consumption or weight records', () => {
  const data = initialData(routine);
  assert.equal(isFitnessData(data), true);
  assert.equal(getDay(data, '2026-09-24').waterMl, 0);
  assert.deepEqual(data.weights, []);
  assert.equal(data.profile.bottleMl, 800);
});
test('midnight resets daily progress while preserving yesterday', () => {
  const data = changeDay(initialData(routine), '2026-09-24', (day) => ({ ...day, waterMl: 1600, completed: ['breakfast'] }));
  assert.equal(getDay(data, '2026-09-25').waterMl, 0);
  assert.deepEqual(getDay(data, '2026-09-25').completed, []);
  assert.equal(data.days['2026-09-24'].waterMl, 1600);
  assert.equal(dayKey(new Date(2026, 8, 24, 23, 59)), '2026-09-24');
});
test('editing a plan preserves past snapshots and removes stale current completion IDs', () => {
  let data = initialData(routine);
  data = changeDay(data, '2026-09-23', (day) => ({ ...day, completed: ['breakfast'] }));
  data = changeDay(data, '2026-09-24', (day) => ({ ...day, completed: ['breakfast'] }));
  data = changePlan(data, '2026-09-24', [routine[1], { id: 'lunch', time: '13:00', title: 'Almoço', entries: ['Arroz'] }]);
  assert.equal(data.days['2026-09-23'].routine[0].title, 'Pré-treino');
  assert.deepEqual(data.days['2026-09-23'].completed, ['breakfast']);
  assert.deepEqual(data.days['2026-09-24'].completed, []);
  assert.equal(data.routine[0].time, '06:00');
  assert.equal(isFitnessData(data), true);
});
test('streak includes yesterday until today is complete and stops at a gap', () => {
  let data = initialData(routine);
  for (const date of ['2026-09-21', '2026-09-22', '2026-09-23']) data = changeDay(data, date, (day) => ({ ...day, completed: routine.map((r) => r.id) }));
  assert.equal(streak(data, '2026-09-24'), 3);
  data = changeDay(data, '2026-09-24', (day) => ({ ...day, completed: routine.map((r) => r.id) }));
  assert.equal(streak(data, '2026-09-24'), 4);
  assert.equal(streak(data, '2026-09-26'), 0);
});
test('checkbox toggle is reversible without duplicate IDs', () => {
  assert.deepEqual(toggleId(['breakfast'], 'breakfast'), []);
  assert.deepEqual(toggleId([], 'breakfast'), ['breakfast']);
});
test('valid backup survives JSON round trip', () => {
  let data = initialData(routine);
  data = changeDay(data, '2026-09-24', (day) => ({ ...day, waterMl: 3200 }));
  data.weights.push({ date: '2026-09-24', kg: 105.2 });
  assert.equal(isFitnessData(JSON.parse(JSON.stringify(data))), true);
});
test('reject invalid dates, impossible values, duplicate and orphan IDs, unsupported versions', () => {
  assert.equal(validDate('2026-02-30'), false);
  assert.equal(validDate('2024-02-29'), true);
  const data = initialData(routine);
  assert.equal(isFitnessData({ ...data, version: 2 }), false);
  assert.equal(isFitnessData({ ...data, profile: { ...data.profile, waterGoal: 0 } }), false);
  assert.equal(isFitnessData({ ...data, profile: { ...data.profile, bottleMl: NaN } }), false);
  assert.equal(isFitnessData({ ...data, routine: [routine[0], routine[0]] }), false);
  assert.equal(isFitnessData({ ...data, weights: [{ date: '2026-02-30', kg: 100 }] }), false);
  assert.equal(isFitnessData(changeDay(data, '2026-09-24', (day) => ({ ...day, completed: ['missing'] }))), false);
  assert.equal(isFitnessData(changeDay(data, '2026-09-24', (day) => ({ ...day, completed: ['breakfast', 'breakfast'] }))), false);
  assert.equal(isFitnessData(changeDay(data, '2026-09-24', (day) => ({ ...day, exerciseCompleted: ['missing'] }))), false);
  assert.equal(isFitnessData(null), false);
});
