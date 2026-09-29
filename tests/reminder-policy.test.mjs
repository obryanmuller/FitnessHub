import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const compile = (file) => ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const modelUrl = "data:text/javascript;base64," + Buffer.from(compile("../src/features/fitness/model.ts")).toString("base64");
const source = compile("../src/lib/reminder-policy.ts").replaceAll("@/features/fitness/model", modelUrl);
const policy = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
const model = await import(modelUrl);
const routine = [{id:"meal",time:"08:00",title:"Café",entries:["Ovos"]},{id:model.WORKOUT_ID,time:"09:00",title:"Treino",entries:[]}];
const settings = {...policy.defaultNotificationSettings,water:true};

test("old notification settings are accepted and malformed schedules are rejected", () => {
  assert.ok(policy.isNotificationSettings(settings));
  assert.ok(policy.isNotificationSettings({meals:true,workout:true,water:false}));
  assert.equal(policy.normalizeNotificationSettings({meals:true,workout:true,water:false}).waterInterval,120);
  assert.equal(policy.isNotificationSettings({...settings,waterStart:"25:00"}),false);
  assert.equal(policy.isNotificationSettings({...settings,waterEnd:"07:00"}),false);
  assert.equal(policy.isNotificationSettings({...settings,waterInterval:0}),false);
  assert.equal(policy.isNotificationSettings({...settings,quietEnd:"22:00"}),false);
});
test("quiet hours support midnight and same-day windows with exact boundaries", () => {
  assert.ok(policy.inQuietHours(23*60,settings));
  assert.ok(policy.inQuietHours(6*60,settings));
  assert.equal(policy.inQuietHours(7*60,settings),false);
  const afternoon={...settings,quietStart:"13:00",quietEnd:"15:00"};
  assert.ok(policy.inQuietHours(14*60,afternoon));
  assert.equal(policy.inQuietHours(15*60,afternoon),false);
});
test("completed tasks, rest days and achieved water goals suppress reminders", () => {
  let data=model.initialData(routine);
  assert.equal(policy.scheduledReminders(data,settings,"2026-09-28",480).length,2);
  data=model.changeDay(data,"2026-09-28",day=>({...day,completed:["meal"],waterMl:day.waterGoal}));
  assert.equal(policy.scheduledReminders(data,settings,"2026-09-28",480).length,0);
  data=model.changeDay(data,"2026-09-28",day=>({...day,completed:["meal",model.WORKOUT_ID]}));
  assert.equal(policy.scheduledReminders(data,settings,"2026-09-28",540).length,0);
  data=model.changeWorkoutDay(data,"2026-09-29","2",{title:"Descanso",kind:"rest",exercises:[]});
  assert.equal(policy.scheduledReminders(data,settings,"2026-09-29",540).length,0);
});
test("water intervals, silence and dispatch retry keys are deterministic", () => {
  const data=model.initialData(routine), custom={...settings,meals:false,workout:false,waterStart:"09:30",waterEnd:"18:00",waterInterval:60};
  assert.equal(policy.scheduledReminders(data,custom,"2026-09-28",569).length,0);
  const first=policy.scheduledReminders(data,custom,"2026-09-28",570);
  assert.equal(first.length,1);
  assert.equal(policy.scheduledReminders(data,custom,"2026-09-28",575)[0].key,first[0].key);
  assert.equal(policy.scheduledReminders(data,custom,"2026-09-28",580).length,0);
  assert.equal(policy.scheduledReminders(data,custom,"2026-09-28",1110).length,0);
  assert.equal(policy.scheduledReminders(data,{...custom,quietStart:"09:00",quietEnd:"11:00"},"2026-09-28",570).length,0);
});
test("an ongoing guided workout does not receive a start reminder", () => {
  let data=model.initialData(routine);
  data=model.changeWorkoutDay(data,"2026-09-28","1",{title:"Treino",time:"09:00",kind:"strength",exercises:[{id:"squat",name:"Agachamento",sets:2,reps:"10",load:"40 kg"}]});
  data=model.startWorkout(data,"2026-09-28",1000);
  assert.equal(policy.scheduledReminders(data,settings,"2026-09-28",540).length,0);
});
