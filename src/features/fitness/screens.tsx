"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Check, Download, Dumbbell, Flame, Leaf, Pencil, Plus, Scale, Trash2, Upload, Utensils } from "lucide-react";
import { changeDay, changePlan, dayKey, isFitnessData, streak, workoutExerciseCount, WORKOUT_ID, type FitnessData, type Routine } from "./model";
import { saveFitness, useFitness } from "./store";
import { ProfileManager } from "./profile-manager";
import { NotificationSettings } from "./notification-settings";
import styles from "./fitness.module.css";

export { Workouts } from "./workouts";

const createId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
const number = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const dateLabel = (date: string) => new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const read = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

function Heading({ eyebrow, title, description, icon }: { eyebrow: string; title: string; description: string; icon: ReactNode }) {
  return <header className={styles.heading}><div className={styles.eyebrow}><span><Leaf size={14} aria-hidden="true" /> FITNESSHUB</span>{icon}</div><p>{eyebrow}</p><h1>{title}</h1><div className={styles.description}>{description}</div></header>;
}
function Notice({ children }: { children: ReactNode }) { return <p className={styles.notice} role="status">{children}</p>; }
function Remove({ label, onRemove }: { label: string; onRemove: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return confirm ? <div className={styles.confirm}><span>Remover {label}?</span><button type="button" className={styles.danger} onClick={() => { onRemove(); setConfirm(false); }}>Remover</button><button type="button" onClick={() => setConfirm(false)}>Cancelar</button></div> : <button type="button" className={styles.iconButton} aria-label={`Remover ${label}`} onClick={() => setConfirm(true)}><Trash2 size={17} /></button>;
}
function FormActions({ cancel }: { cancel: () => void }) { return <div className={styles.actions}><button className={styles.primary} type="submit"><Check size={17} aria-hidden="true" /> Salvar</button><button className={styles.secondary} type="button" onClick={cancel}>Cancelar</button></div>; }

export function Meals() {
  const { data } = useFitness();
  const [editing, setEditing] = useState<Routine | null>(null);
  const [notice, setNotice] = useState("");
  const meals = data.routine.filter((item) => item.id !== WORKOUT_ID);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const item = { id: editing.id, title: read(form, "title"), time: read(form, "time"), entries: read(form, "entries").split("\n").map((line) => line.trim()).filter(Boolean) };
    if (!item.title || !item.entries.length || item.entries.length > 50 || item.entries.some((entry) => entry.length > 300)) { setNotice("Preencha o nome e até 50 alimentos, com no máximo 300 caracteres por linha."); return; }
    const ok = saveFitness((current) => changePlan(current, dayKey(), current.routine.some((r) => r.id === item.id) ? current.routine.map((r) => r.id === item.id ? item : r) : [...current.routine, item]));
    if (ok) { setEditing(null); setNotice("Refeição salva. Sua rotina de hoje já foi atualizada."); }
  }
  return <main className={styles.page}>
    <Heading eyebrow="ENERGIA PARA O SEU DIA" title="Alimentação" description="Seu plano, do café da manhã à última refeição." icon={<Utensils size={22} aria-hidden="true" />} />
    <div className={styles.sectionHeading}><h2>{meals.length} refeições no plano</h2><button className={styles.add} type="button" disabled={data.routine.length >= 100} onClick={() => { setEditing({ id: createId(), time: "12:00", title: "", entries: [] }); setNotice(""); }}><Plus size={16} /> Adicionar</button></div>
    {editing && <form key={editing.id} className={styles.form} onSubmit={submit}><h2>{meals.some((item) => item.id === editing.id) ? "Editar refeição" : "Nova refeição"}</h2><label>Nome<input name="title" defaultValue={editing.title} maxLength={80} required autoFocus placeholder="Ex.: Lanche da tarde" /></label><label>Horário<input name="time" type="time" defaultValue={editing.time} required /></label><label>Alimentos · um por linha<textarea name="entries" rows={4} defaultValue={editing.entries.join("\n")} maxLength={5000} required placeholder={"Iogurte natural\nUma fruta"} /></label><p className={styles.hint}>As mudanças valem a partir de hoje. Os dias anteriores ficam preservados.</p><FormActions cancel={() => setEditing(null)} /></form>}
    <Notice>{notice}</Notice>
    {meals.length === 0 && <div className={styles.empty}><Utensils aria-hidden="true" /><h2>Um plano do seu jeito</h2><p>Adicione sua primeira refeição com os alimentos e o horário que você já segue.</p></div>}
    <ol className={styles.list}>{meals.map((item) => <li key={item.id}><div className={styles.row}><span className={styles.time}>{item.time}</span><div className={styles.grow}><h3>{item.title}</h3><p>{item.entries.join(" · ")}</p></div><button type="button" className={styles.iconButton} aria-label={`Editar ${item.title}`} onClick={() => setEditing(item)}><Pencil size={17} /></button></div><div className={styles.rowEnd}><Remove label={item.title} onRemove={() => { if (saveFitness((current) => changePlan(current, dayKey(), current.routine.filter((r) => r.id !== item.id)))) { if (editing?.id === item.id) setEditing(null); setNotice("Refeição removida do plano."); } }} /></div></li>)}</ol>
  </main>;
}

export function Progress() {
  const { data, today } = useFitness();
  const [notice, setNotice] = useState("");
  const [selectedDate, setSelectedDate] = useState(today);
  const weights = [...data.weights].sort((a, b) => a.date.localeCompare(b.date));
  const last = weights.at(-1);
  const chartWeights = weights.slice(-14);
  const min = Math.min(...chartWeights.map((w) => w.kg)) - 1;
  const max = Math.max(...chartWeights.map((w) => w.kg)) + 1;
  const points = chartWeights.map((w, i) => `${24 + (chartWeights.length > 1 ? i / (chartWeights.length - 1) * 272 : 136)},${128 - (w.kg - min) / (max - min) * 104}`);
  const history = Object.entries(data.days).filter(([date]) => date <= today).sort(([a], [b]) => b.localeCompare(a));
  const selected = data.days[selectedDate];
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const date = read(form, "date"), kg = Number(form.get("kg"));
    if (date > today) { setNotice("Escolha hoje ou uma data anterior."); return; }
    if (saveFitness((current) => ({ ...current, weights: [...current.weights.filter((w) => w.date !== date), { date, kg }].sort((a, b) => a.date.localeCompare(b.date)) }))) { setNotice("Peso salvo no seu histórico."); event.currentTarget.reset(); }
  }
  return <main className={`${styles.page} ${styles.orange}`}>
    <Heading eyebrow="CADA PASSO CONTA" title="Seu progresso" description="Uma visão do caminho que você está construindo." icon={<Scale size={22} aria-hidden="true" />} />
    <div className={styles.stats}><div><Flame size={20} aria-hidden="true" /><strong>{streak(data, today)} dias</strong><span>de rotina completa</span></div><div><Dumbbell size={20} aria-hidden="true" /><strong>{history.filter(([, day]) => day.completed.includes(WORKOUT_ID)).length} treinos</strong><span>concluídos</span></div></div>
    <section className={styles.hero}><div className={styles.sectionHeading}><h2>Evolução do peso</h2>{last && <span className={styles.tag}>{dateLabel(last.date)}</span>}</div><p className={styles.bigNumber}>{last ? <>{number(last.kg)} <small>kg</small></> : "—"}</p><p>{data.profile.targetKg ? `Sua meta: ${number(data.profile.targetKg)} kg` : "Você pode definir uma meta no Perfil."}</p>{chartWeights.length > 0 ? <><svg className={styles.chart} viewBox="0 0 320 154" role="img" aria-label={`Últimos ${chartWeights.length} registros de peso, de ${number(chartWeights[0].kg)} a ${number(chartWeights.at(-1)!.kg)} kg. Valores detalhados na lista abaixo.`}><path d="M24 128H296 M24 76H296 M24 24H296" stroke="currentColor" opacity=".12" fill="none" /><polyline points={points.join(" ")} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />{points.map((point, i) => { const [cx, cy] = point.split(","); return <circle key={chartWeights[i].date} cx={cx} cy={cy} r="4" fill="currentColor" />; })}</svg><div className={styles.chartLabels}><span>{dateLabel(chartWeights[0].date)}</span><span>{dateLabel(chartWeights.at(-1)!.date)}</span></div><p className={styles.hint}>Últimos {chartWeights.length} registros · cada ponto é uma pesagem</p></> : <p className={styles.emptyInline}>Registre seu primeiro peso para começar a acompanhar.</p>}</section>
    <form className={styles.form} onSubmit={submit}><h2>Registrar peso</h2><div className={styles.fieldGrid}><label>Peso (kg)<input name="kg" type="number" min={20} max={500} step="0.1" placeholder="Ex.: 105" required /></label><label>Data<input type="date" name="date" min="1900-01-01" max={today} defaultValue={today} required /></label></div><p className={styles.hint}>Um registro por dia. Salvar na mesma data atualiza o peso anterior.</p><button className={styles.primary} type="submit"><Plus size={17} /> Registrar peso</button></form>
    <Notice>{notice}</Notice>
    {weights.length > 0 && <details className={styles.details}><summary>Pesagens · {weights.length} registros</summary><ul className={styles.list}>{[...weights].reverse().map((w) => <li key={w.date}><div className={styles.row}><div className={styles.grow}><h3>{number(w.kg)} kg</h3><p>{dateLabel(w.date)}</p></div><Remove label={`peso de ${dateLabel(w.date)}`} onRemove={() => { if (saveFitness((current) => ({ ...current, weights: current.weights.filter((item) => item.date !== w.date) }))) setNotice("Registro de peso removido."); }} /></div></li>)}</ul></details>}
    <section className={styles.history}><h2>Seu histórico diário</h2><p className={styles.hint}>Refeições, treino e água registrados em cada dia.</p><label>Consultar dia<input type="date" value={selectedDate} max={today} min="1900-01-01" onChange={(event) => setSelectedDate(event.target.value)} /></label>{selected ? <div className={styles.dayDetail}><div className={styles.sectionHeading}><strong>{dateLabel(selectedDate)}</strong><span>{selected.completed.length}/{selected.routine.length} etapas</span></div><p>Água: {number(selected.waterMl)} / {number(selected.waterGoal)} ml</p><ul>{selected.routine.map((item) => <li key={item.id}><span aria-label={selected.completed.includes(item.id) ? "Concluído" : "Não concluído"}>{selected.completed.includes(item.id) ? "✓" : "○"}</span><span>{item.time} · {item.title}</span></li>)}</ul>{selected.exercises.length > 0 && <p>{selected.exerciseCompleted.length}/{selected.exercises.length} exercícios marcados.</p>}</div> : <p className={styles.emptyInline}>Ainda não há registros nesse dia.</p>}</section>
  </main>;
}

export function ProfilePage() {
  const { data } = useFitness();
  const [notice, setNotice] = useState("");
  const [backup, setBackup] = useState<FitnessData | null>(null);
  const input = useRef<HTMLInputElement>(null);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = read(form, "name");
    if (!name) { setNotice("Informe como você quer ser chamado."); return; }
    const profile = { name, waterGoal: Number(form.get("waterGoal")), bottleMl: Number(form.get("bottleMl")), targetKg: read(form, "targetKg") ? Number(form.get("targetKg")) : null };
    if (saveFitness((current) => changeDay({ ...current, profile }, dayKey(), (day) => ({ ...day, waterGoal: profile.waterGoal })))) setNotice("Perfil salvo. Suas preferências já estão valendo.");
  }
  function download() {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `fitnesshub-${dayKey()}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("Backup preparado para download.");
    } catch { setNotice("Não foi possível preparar o backup neste navegador."); }
  }
  return <main className={styles.page}>
    <Heading eyebrow="DO SEU JEITO" title="Seu perfil" description="Pequenos ajustes para uma rotina que combina com você." icon={<Leaf size={22} aria-hidden="true" />} />
    <div className={styles.identity}><span>{data.profile.name.slice(0, 1).toLocaleUpperCase("pt-BR")}</span><div><h2>{data.profile.name}</h2><p>Um dia de cada vez.</p></div><ProfileManager /></div>
    <form key={JSON.stringify(data.profile)} className={styles.form} onSubmit={submit}><label>Como você quer ser chamado?<input name="name" defaultValue={data.profile.name} maxLength={60} required autoComplete="given-name" /></label><div className={styles.fieldGrid}><label>Meta de água (ml)<input type="number" name="waterGoal" min={200} max={10000} step={1} defaultValue={data.profile.waterGoal} required /></label><label>Sua garrafa (ml)<input type="number" name="bottleMl" min={100} max={3000} step={1} defaultValue={data.profile.bottleMl} required /></label></div><label>Meta de peso (kg, opcional)<input name="targetKg" type="number" min={20} max={500} step="0.1" defaultValue={data.profile.targetKg ?? ""} placeholder="Sua meta pessoal" /></label><p className={styles.hint}>A meta de água muda a partir de hoje. O consumo já registrado é mantido.</p><button className={styles.primary} type="submit"><Check size={17} /> Salvar perfil</button></form>
    <NotificationSettings />
    <Notice>{notice}</Notice>
    <section className={styles.backup}><h2>Seus dados, com você</h2><p>Os registros deste perfil ficam sincronizados no banco e disponíveis nos seus dispositivos. Guarde um backup para ter uma cópia independente.</p><div className={styles.actions}><button type="button" className={styles.secondary} onClick={download}><Download size={17} /> Exportar backup</button><button type="button" className={styles.secondary} onClick={() => input.current?.click()}><Upload size={17} /> Restaurar</button></div><input ref={input} className={styles.fileInput} tabIndex={-1} type="file" accept="application/json,.json" aria-label="Selecionar backup do FitnessHub" onChange={async (event) => { const file = event.target.files?.[0]; event.target.value = ""; setBackup(null); if (!file) return; if (file.size > 5_000_000) { setNotice("O backup deve ter no máximo 5 MB."); return; } try { const parsed: unknown = JSON.parse(await file.text()); if (!isFitnessData(parsed)) throw new Error("invalid"); setBackup(parsed); setNotice(""); } catch { setNotice("Arquivo inválido. Escolha um backup JSON exportado pelo FitnessHub."); } }} />{backup && <div className={styles.restore}><h3>Restaurar backup de {backup.profile.name}?</h3><p>{Object.keys(backup.days).length} dias · {backup.weights.length} pesagens · {workoutExerciseCount(backup)} exercícios</p><p>Isso substitui todos os dados do perfil ativo no banco. Exporte o backup atual se quiser guardá-lo.</p><div className={styles.actions}><button className={styles.primary} type="button" onClick={() => { if (saveFitness(() => backup, true)) { setBackup(null); setNotice("Backup restaurado com sucesso."); } }}>Substituir e restaurar</button><button className={styles.secondary} type="button" onClick={() => setBackup(null)}>Cancelar</button></div></div>}</section>
    <p className={styles.footnote}>FitnessHub · Seu espaço para cuidar de você.</p>
  </main>;
}
