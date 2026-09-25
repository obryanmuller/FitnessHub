import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/features/fitness/model.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const model = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const routine = [
  { id: 'breakfast', time: '08:00', title: 'Café', entries: ['Fruta'] },
  { id: 'workout-gym', time: '06:00', title: 'Academia', entries: ['Musculação'] },
];
const exercise = { id: 'squat', name: 'Agachamento', sets: 3, reps: '10', load: '40 kg' };

test('rest days remove workout from the daily routine and use no pending workout', () => {
  let data = model.initialData(routine);
  data = model.changeWorkoutDay(data, '2026-09-27', '0', { title: 'Descanso', kind: 'rest', time: '09:00', exercises: [] });
  const day = model.getDay(data, '2026-09-27');
  assert.equal(day.routine.some((item) => item.id === model.WORKOUT_ID), false);
  assert.equal(model.isFitnessData(data), true);
});

test('each workout day can define its own time', () => {
  let data = model.initialData(routine);
  data = model.changeWorkoutDay(data, '2026-09-21', '1', { title: 'Pernas', kind: 'strength', time: '19:30', exercises: [exercise] });
  assert.equal(model.workoutPlanForWeekday(data, '1').time, '19:30');
  assert.equal(model.getDay(data, '2026-09-21').routine.find((item) => item.id === model.WORKOUT_ID).time, '19:30');
});

test('performance history exposes the latest mark and detects a new load record', () => {
  let data = model.initialData(routine);
  data = model.changeWorkoutDay(data, '2026-09-21', '1', { title: 'Pernas', kind: 'strength', time: '06:00', exercises: [exercise] });
  data = model.recordExercisePerformance(data, '2026-09-21', exercise.id, { reps: '10', load: '40 kg' });
  data = model.changeWorkoutDay(data, '2026-09-28', '1', { title: 'Pernas', kind: 'strength', time: '06:00', exercises: [exercise] });
  assert.equal(model.exerciseHistory(data, exercise.id, '2026-09-28')[0].load, '40 kg');
  assert.equal(model.isPersonalRecord(data, exercise.id, '2026-09-28', '42,5 kg'), true);
  data = model.recordExercisePerformance(data, '2026-09-28', exercise.id, { reps: '8', load: '42,5 kg' });
  assert.equal(model.getDay(data, '2026-09-28').exerciseCompleted.includes(exercise.id), true);
  assert.equal(model.isFitnessData(data), true);
});

test('weekly summary counts planned/completed workouts and earned achievements', () => {
  let data = model.initialData(routine);
  data = model.changeWorkoutDay(data, '2026-09-21', '1', { title: 'Pernas', kind: 'strength', time: '06:00', exercises: [exercise] });
  data = model.changeWorkoutDay(data, '2026-09-21', '0', { title: 'Descanso', kind: 'rest', exercises: [] });
  data = model.changeDay(data, '2026-09-21', (day) => ({ ...day, completed: day.routine.map((item) => item.id), waterMl: 3000 }));
  const summary = model.weeklySummary(data, '2026-09-21');
  assert.equal(summary.workoutsDone, 1);
  assert.equal(summary.workoutsPlanned, 1);
  assert.equal(summary.routinePercent, 100);
  assert.equal(model.achievements(data, '2026-09-21').some((item) => item.id === 'first-workout'), true);
});
