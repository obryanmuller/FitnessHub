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

test('weekly comparison uses equal weekday windows and each historical water goal', () => {
  let data = model.initialData(routine);
  data = model.changeDay(data, '2026-09-21', day => ({ ...day, waterGoal: 1500, waterMl: 1500, completed: [model.WORKOUT_ID] }));
  data = model.changeDay(data, '2026-09-22', day => ({ ...day, waterGoal: 2000, waterMl: 1000 }));
  data = model.changeDay(data, '2026-09-28', day => ({ ...day, waterGoal: 2500, waterMl: 2500 }));
  const result = model.weeklyComparison(data, '2026-09-28');
  assert.equal(result.previous.end, '2026-09-21');
  assert.equal(result.previousRecorded, 1);
  assert.equal(result.previous.averageWaterMl, 1500);
  assert.equal(result.currentWaterGoals, 1);
  assert.equal(result.previousWaterGoals, 1);
  assert.equal(result.currentRecorded, 1);
});

test('historical correction preserves plan, exercise logs and neighboring days', () => {
  let data = model.initialData(routine);
  data = model.changeDay(data, '2026-09-21', day => ({ ...day, waterMl: 500 }));
  data = model.changeDay(data, '2026-09-28', day => ({ ...day, waterMl: 900 }));
  const previous = data.days['2026-09-21'];
  const corrected = model.changeDay(data, '2026-09-21', day => ({ ...day, waterMl: 1200, completed: [day.routine[0].id] }));
  assert.deepEqual(corrected.days['2026-09-21'].routine, previous.routine);
  assert.deepEqual(corrected.days['2026-09-21'].exerciseLogs, previous.exerciseLogs);
  assert.equal(corrected.days['2026-09-28'].waterMl, 900);
  assert.equal(data.days['2026-09-21'].waterMl, 500);
  assert.ok(model.isFitnessData(corrected));
});

test('guided session persists series, starts rest, prevents double submissions and finishes into history', () => {
  let data = model.initialData(routine);
  data = model.changeWorkoutDay(data, '2026-09-28', '1', { title: 'Força', kind: 'strength', exercises: [{ ...exercise, sets: 2 }] });
  data = model.startWorkout(data, '2026-09-28', 1000, 60);
  data = model.recordWorkoutSet(data, '2026-09-28', exercise.id, 0, { reps: '10', load: '45 kg' }, 2000);
  assert.equal(data.days['2026-09-28'].session.restUntil, 62000);
  assert.equal(model.sessionCounts(data.days['2026-09-28'].session).done, 1);
  assert.equal(model.recordWorkoutSet(data, '2026-09-28', exercise.id, 0, { reps: '12', load: '50 kg' }, 3000), data);
  assert.ok(model.isFitnessData(JSON.parse(JSON.stringify(data))));
  data = model.pauseWorkout(data, '2026-09-28', 5000);
  assert.equal(model.workoutElapsed(data.days['2026-09-28'].session, 20000), 4000);
  assert.equal(model.recordWorkoutSet(data, '2026-09-28', exercise.id, 1, { reps: '10', load: '40 kg' }, 6000), data);
  data = model.pauseWorkout(data, '2026-09-28', 15000);
  data = model.recordWorkoutSet(data, '2026-09-28', exercise.id, 1, { reps: '8', load: '45 kg' }, 16000);
  assert.equal(data.days['2026-09-28'].session.restUntil, undefined);
  data = model.finishWorkout(data, '2026-09-28', 20000);
  const day = data.days['2026-09-28'];
  assert.equal(model.workoutElapsed(day.session, 90000), 9000);
  assert.equal(day.exerciseLogs[exercise.id].load, '45 kg');
  assert.ok(day.exerciseCompleted.includes(exercise.id));
  assert.ok(day.completed.includes(model.WORKOUT_ID));
  assert.ok(model.isFitnessData(data));
  assert.equal(model.finishWorkout(data, '2026-09-28', 30000), data);
});

test('sessions isolate dates, preserve their original plan and support partial completion', () => {
  let data = model.initialData(routine);
  data = model.changeWorkoutDay(data, '2026-09-28', '1', { title: 'Força', kind: 'strength', exercises: [{ ...exercise, sets: 2 }] });
  data = model.startWorkout(data, '2026-09-28', 1000);
  assert.equal(model.startWorkout(data, '2026-09-29', 2000), data);
  data = model.recordWorkoutSet(data, '2026-09-28', exercise.id, 0, { reps: '10', load: '40 kg' }, 3000);
  data = model.changeWorkoutDay(data, '2026-09-28', '1', { title: 'Outra ficha', kind: 'rest', exercises: [] });
  assert.equal(data.days['2026-09-28'].session.title, 'Força');
  data = model.finishWorkout(data, '2026-09-28', 4000);
  assert.equal(data.days['2026-09-29'], undefined);
  assert.equal(model.sessionCounts(data.days['2026-09-28'].session).done, 1);
  assert.ok(model.isFitnessData(data));
});

test('session validator rejects malformed imported series and old backups still work', () => {
  let data = model.initialData(routine);
  assert.ok(model.isFitnessData(data));
  data = model.changeWorkoutDay(data, '2026-09-28', '1', { title: 'Força', kind: 'strength', exercises: [exercise] });
  data = model.startWorkout(data, '2026-09-28', 1000);
  const bad = structuredClone(data);
  bad.days['2026-09-28'].session.exercises[0].series[0].done = 'yes';
  assert.equal(model.isFitnessData(bad), false);
  const badTime = structuredClone(data);
  badTime.days['2026-09-28'].session.finishedAt = 0;
  assert.equal(model.isFitnessData(badTime), false);
  assert.equal(model.finishWorkout(data, '2026-09-28', 4000), data);
});

test('weekly frequency goals preserve prior targets and include full boundary weeks', () => {
  let data = model.initialData(routine);
  data = model.setWorkoutTarget(data, '2026-09-21', 3);
  data = model.setWorkoutTarget(data, '2026-09-29', 4);
  assert.equal(model.workoutTarget(data, '2026-09-27'), 3);
  assert.equal(model.workoutTarget(data, '2026-09-29'), 4);
  assert.equal(model.workoutTarget(data, '2026-09-20'), undefined);
  for (const date of ['2026-08-31','2026-09-01','2026-09-29']) data = model.changeDay(data, date, day => ({ ...day, completed: [model.WORKOUT_ID] }));
  const month = model.monthlyWorkoutFrequency(data, '2026-09', '2026-09-29');
  assert.equal(month.days.length, 30);
  assert.equal(month.days.filter(day => day.done).length, 2);
  assert.equal(month.weeks[0].start, '2026-08-31');
  assert.equal(month.weeks[0].done, 2);
  assert.equal(month.weeks.at(-1).target, 4);
  assert.equal(month.weeks.at(-1).closed, false);
  assert.ok(model.isFitnessData(JSON.parse(JSON.stringify(data))));
  assert.equal(model.isFitnessData({ ...data, workoutGoals: { '2026-09-29': 3 } }), false);
  assert.equal(model.setWorkoutTarget(data, '2026-09-29', 8), data);
});

test('optional routine items never change required progress or break a streak', () => {
  let data = model.initialData([...routine, {id:'optional-supper',time:'22:00',title:'Ceia opcional',entries:['Fruta']}, {id:'extra',time:'16:00',title:'Extra',entries:['Fruta'],optional:true}]);
  data = model.changeDay(data, '2026-09-28', day => ({...day,completed:['breakfast',model.WORKOUT_ID]}));
  assert.deepEqual(model.routineProgress(data.days['2026-09-28']), {total:2,completed:2});
  assert.equal(model.streak(data,'2026-09-28'),1);
  assert.equal(model.weeklySummary(data,'2026-09-28').routinePercent,100);
  data = model.changeDay(data,'2026-09-28',day=>({...day,completed:[...day.completed,'extra']}));
  assert.deepEqual(model.routineProgress(data.days['2026-09-28']), {total:2,completed:2});
  assert.equal(model.isOptionalRoutine({id:'optional-supper',optional:false}),false);
  assert.deepEqual(model.routineProgress({...data.days['2026-09-28'],routine:[],completed:[]}),{total:0,completed:0});
});

test('recorded actions preserve exact write times, log reversal and do not invent old timestamps', () => {
  const original = model.initialData(routine);
  let next = model.changeDay(original,'2026-09-28',day=>({...day,waterMl:800,completed:['breakfast']}));
  next = model.stampRecordedActions(original,next,123456789);
  assert.equal(next.days['2026-09-28'].activity.length,2);
  assert.ok(next.days['2026-09-28'].activity.every(event=>event.at===123456789));
  const undone = model.stampRecordedActions(next,model.changeDay(next,'2026-09-28',day=>({...day,waterMl:0})),123456999);
  assert.equal(undone.days['2026-09-28'].activity.length,3);
  assert.equal(undone.days['2026-09-28'].activity.at(-1).at,123456999);
  assert.equal(model.stampRecordedActions(next,next,999999999).days['2026-09-28'].activity.length,2);
  assert.ok(model.isFitnessData(undone));
  assert.equal(original.days['2026-09-28'],undefined);
  assert.equal(model.isFitnessData({...next,days:{'2026-09-28':{...next.days['2026-09-28'],activity:[{at:'bad',target:'water',label:'Test'}]}}}),false);
});
