import { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUpRight, ArrowRight, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Menu, MessageCircle, Moon, PanelLeftClose, PanelRightClose, Play, Pause, RotateCcw, Settings, Sun, Target, X } from "lucide-react";
import { activity, dateKey, lessonComplete, monthCells, progress, remaining } from "./learning.js";
import "./style.css";

const nav = [["home", "Обзор", "Overview"], ["courses", "Курсы", "Courses"], ["calendar", "Активность", "Activity"], ["artifacts", "Материалы", "Artifacts"], ["review", "Повторение", "Review"], ["skills", "Компетенции", "Skills"], ["settings", "Настройки", "Settings"]];
const modes = [["tutor", "Наставник", "Tutor"], ["reviewer", "Ревью", "Reviewer"], ["interviewer", "Интервью", "Interviewer"], ["stakeholder", "Заказчик", "Stakeholder"], ["planner", "Планировщик", "Planner"]];
const readLocal = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
async function api(path, options = {}) {
  const response = await fetch("/api/" + path, { ...options, headers: { "Content-Type": "application/json", "X-Workspace": "1", ...options.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : "HTTP " + response.status);
  }
  return response.json();
}
function Md({ children }) {
  return <Markdown remarkPlugins={[remarkGfm]} components={{ a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer noopener">{children}</a>, img: ({ alt }) => <span>[{alt || "image"}]</span> }}>{children}</Markdown>;
}
function App() {
  const [courses, setCourses] = useState([]);
  const [records, setRecords] = useState({});
  const [pendingTasks, setPendingTasks] = useState({});
  const writes = useRef(new Map());
  const [providers, setProviders] = useState({});
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState("home");
  const [courseId, setCourseId] = useState(readLocal("course", "system-analyst"));
  const [lessonId, setLessonId] = useState(readLocal("lesson", "sa-01"));
  const [theme, setTheme] = useState(readLocal("theme", "light"));
  const [language, setLanguage] = useState(readLocal("lang", "ru"));
  const [sidebar, setSidebar] = useState(() => window.innerWidth > 650);
  const [chatOpen, setChatOpen] = useState(false);
  const chatPanel = useRef(null);
  const [taskId, setTaskId] = useState("");
  const [mode, setMode] = useState("tutor");
  const [provider, setProvider] = useState(readLocal("provider", "auto"));
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState(false);
  const [month, setMonth] = useState(new Date());
  const [timer, setTimer] = useState(() => readLocal("timer-v1", { length: 1500, left: 1500, end: null, id: null, started: null }));
  const [now, setNow] = useState(Date.now());
  const [savingTimer, setSavingTimer] = useState(false);
  const completing = useRef(false);
  const t = (ru, en) => language === "ru" ? ru : en;
  useEffect(() => { if (chatOpen && window.innerWidth <= 650) chatPanel.current?.scrollIntoView({ block: "start" }); }, [chatOpen]);

  useEffect(() => {
    Promise.all([api("content"), api("state"), api("providers")]).then(([c, rows, p]) => {
      setCourses(c); setRecords(Object.fromEntries(rows.map((r) => [r.kind + ":" + r.id, r.value]))); setProviders(p); setReady(true);
    }).catch((e) => setError(e.message));
  }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; document.documentElement.lang = language; localStorage.setItem("theme", JSON.stringify(theme)); localStorage.setItem("lang", JSON.stringify(language)); }, [theme, language]);
  useEffect(() => { localStorage.setItem("timer-v1", JSON.stringify(timer)); }, [timer]);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(id); }, []);
  useEffect(() => { localStorage.setItem("course", JSON.stringify(courseId)); localStorage.setItem("lesson", JSON.stringify(lessonId)); localStorage.setItem("provider", JSON.stringify(provider)); }, [courseId, lessonId, provider]);

  const course = courses.find((c) => c.id === courseId) || courses[0];
  const lesson = course?.lessons.find((l) => l.id === lessonId) || course?.lessons[0];
  const stats = course ? progress(course, records) : { done: 0, total: 0, percent: 0, passed: 0, gates: 0 };
  const days = activity(records);
  const seconds = remaining(timer, now);
  const next = course?.lessons.find((l) => !lessonComplete(l, records)) || course?.lessons.at(-1);
  const scope = taskId || lesson?.id;
  const chatKey = scope + ":" + mode;
  const messages = records["chat:" + chatKey] || [];
  const draft = drafts[chatKey] || "";
  const setDraft = (value) => setDrafts((old) => ({ ...old, [chatKey]: value }));

  async function save(kind, id, value) {
    const key = kind + ":" + id;
    const previous = writes.current.get(key) || Promise.resolve();
    const operation = previous.then(async () => {
      try {
        await api("state/" + kind + "/" + encodeURIComponent(id), { method: "PUT", body: JSON.stringify({ value }) });
        setRecords((old) => ({ ...old, [key]: value }));
        if (kind === "note" || kind === "answer") {
          if (readLocal("draft:" + key, null) === value) localStorage.removeItem("draft:" + key);
        }
        return true;
      } catch (e) { setError(e.message); return false; }
    });
    writes.current.set(key, operation);
    const ok = await operation;
    if (writes.current.get(key) === operation) writes.current.delete(key);
    return ok;
  }
  async function toggleTask(id, checked) {
    const key = "task:" + id;
    if (writes.current.has(key)) return;
    const previous = records[key] === true;
    setPendingTasks((old) => ({ ...old, [id]: true }));
    setRecords((old) => ({ ...old, [key]: checked }));
    if (!await save("task", id, checked)) setRecords((old) => ({ ...old, [key]: previous }));
    setPendingTasks((old) => ({ ...old, [id]: false }));
  }
  async function finishTimer(current, elapsed) {
    if (completing.current || !current.id) return;
    completing.current = true; setSavingTimer(true);
    const ok = current.length === 300 || elapsed <= 0 || await save("session", current.id, { seconds: elapsed, date: dateKey(new Date(current.started)), lesson: current.lesson });
    if (ok) setTimer({ length: current.length, left: current.length, end: null, id: null, started: null });
    else setTimer((old) => ({ ...old, end: null, left: Math.max(0, current.length - elapsed) }));
    completing.current = false; setSavingTimer(false);
  }
  useEffect(() => {
    if (ready && timer.end && seconds === 0 && !completing.current) void finishTimer(timer, timer.length);
  // The saved session ID makes retries idempotent.
  // eslint-disable-next-line
  }, [ready, seconds, timer.end]);

  function toggleTimer() {
    if (timer.end) setTimer((old) => ({ ...old, end: null, left: remaining(old) }));
    else setTimer((old) => ({ ...old, end: Date.now() + old.left * 1000, id: old.id || crypto.randomUUID(), started: old.started || Date.now(), lesson: old.lesson || lesson?.id }));
  }
  function openLesson(c, l) { if (!c || !l) return; setCourseId(c.id); setLessonId(l.id); setTaskId(""); setPage("lesson"); }
  function openChat(id = "") { setTaskId(id); setChatOpen(true); }
  async function send(event) {
    event.preventDefault();
    if (!draft.trim() || busy || !lesson) return;
    const text = draft.trim(); const key = chatKey;
    setBusy(true); setDraft("");
    try {
      const result = await api("chat", { method: "POST", body: JSON.stringify({ lesson_id: lesson.id, task_id: taskId || null, text, mode, provider, language }) });
      setRecords((old) => ({ ...old, ["chat:" + key]: result.messages }));
    } catch (e) { setError(e.message); setDrafts((old) => ({ ...old, [key]: old[key] || text })); }
    finally { setBusy(false); }
  }
  function exportData() {
    const blob = new Blob([JSON.stringify({ version: 1, records }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "learning-workspace-" + dateKey() + ".json"; a.click(); URL.revokeObjectURL(url);
  }
  const totalSeconds = Object.values(days).reduce((a, b) => a + b, 0);
  const today = days[dateKey()] || 0;
  const fmt = (value) => Math.floor(value / 60) + " " + t("мин", "min");

  return <div className="app">
    <header className="topbar">
      <button className="icon" aria-label={t("Навигация", "Navigation")} onClick={() => setSidebar(!sidebar)}><Menu size={19} /></button>
      <button className="brand" onClick={() => setPage("home")}><span className="logo">L.</span><span>learning<span className="muted"> / workspace</span></span></button>
      <div className="top-right"><span className="status"><i /> {t("Личное пространство", "Personal workspace")}</span><button className="icon" aria-label={t("Сменить тему", "Toggle theme")} onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? <Moon size={19} /> : <Sun size={19} />}</button><button className="icon" aria-label="Settings" onClick={() => setPage("settings")}><Settings size={19} /></button></div>
    </header>
    {error && <div className="error" role="alert">{error}<button className="icon" onClick={() => setError("")} aria-label="Close"><X size={16} /></button></div>}
    <div className={"layout " + (sidebar ? "has-nav " : "") + (chatOpen && lesson ? "has-chat" : "")}>
      {sidebar && <aside className="sidebar">
        <div className="side-label">{t("ПРОСТРАНСТВО", "WORKSPACE")}<button className="icon" onClick={() => setSidebar(false)} aria-label="Collapse navigation"><PanelLeftClose size={16} /></button></div>
        {nav.map(([id, ru, en]) => <button key={id} className={"nav-item " + (page === id ? "selected" : "")} onClick={() => setPage(id)}>{t(ru, en)}<ChevronRight size={14} /></button>)}
        <div className="side-label course-label">{t("ТЕКУЩИЙ КУРС", "CURRENT COURSE")}</div>
        {course && <><strong className="side-course">{course.title}</strong><div className="bar"><i style={{ width: stats.percent + "%" }} /></div><small className="muted">{stats.percent}%</small>
        <div className="lessons">{course.lessons.map((l, i) => <button key={l.id} className={"lesson-link " + (page === "lesson" && l.id === lesson?.id ? "selected" : "")} onClick={() => openLesson(course, l)}><span className="mono">{String(i + 1).padStart(2, "0")}</span><span>{l.title}</span>{lessonComplete(l, records) && <Check size={14} />}</button>)}</div></>}
      </aside>}
      <main className="main">
        {!ready ? <div className="empty">{error ? t("Проверь запуск сервера и авторизацию.", "Check server and authentication.") : t("Загрузка пространства…", "Loading workspace…")}</div> : <>
        {page === "home" && <>
          <section className="hero"><div className="eyebrow"><span className="dot" /> {new Intl.DateTimeFormat(language, { dateStyle: "full" }).format(new Date())}</div><div className="hero-index">01 / THE WORK OF LEARNING</div><h1>{t("Сегодня — ещё", "Today is another")}<br /><em>{t("один шаг.", "step forward.")}</em></h1><p>{t("Давай. Ты можешь сделать это сегодня. Главное — начать с одной конкретной задачи.", "You can do this today. Start with one concrete task.")}</p><button className="primary" disabled={!next} onClick={() => openLesson(course, next)}>{t("Продолжить обучение", "Continue learning")} <ArrowRight size={18} /></button></section>
          <section className="metrics"><div><span>{t("ПРОГРЕСС КУРСА", "COURSE PROGRESS")}</span><strong>{stats.percent}<small>%</small></strong><p>{stats.done} / {stats.total} {t("заданий", "tasks")}</p></div><div><span>{t("СЕГОДНЯ В ФОКУСЕ", "FOCUSED TODAY")}</span><strong>{Math.floor(today / 60)}<small>m</small></strong><p>{t("Всего", "Total")}: {fmt(totalSeconds)}</p></div><div><span>{t("КОНТРОЛЬНЫЕ ТОЧКИ", "CHECKPOINTS")}</span><strong>{stats.passed}<small>/{stats.gates}</small></strong><p>{t("Самостоятельная практика", "Independent practice")}</p></div></section>
          <div className="two-col"><section className="card"><div className="section-head"><span className="eyebrow">{t("СЛЕДУЮЩИЙ ШАГ", "NEXT UP")}</span><BookOpen size={18} /></div><h2>{next?.title}</h2><p className="muted">{course?.title} · {next?.minutes} min</p><button className="text-button" onClick={() => openLesson(course, next)}>{t("Открыть урок", "Open lesson")} <ArrowUpRight size={16} /></button></section><section className="card"><div className="section-head"><span className="eyebrow">{t("РЕКОМЕНДАЦИЯ", "RECOMMENDATION")}</span><Target size={18} /></div><h2>{today < 1500 ? t("Одна сессия фокуса", "One focus session") : t("Закрепи материал", "Reinforce your learning")}</h2><p className="muted">{today < 1500 ? t("Начни с 25 минут без отвлечений.", "Start with 25 distraction-free minutes.") : t("Попробуй ответить на вопрос без подсказки.", "Try answering without hints.")}</p><button className="text-button" onClick={() => { setMode("planner"); openChat(); }}>{t("Спросить AI", "Ask AI")} <ArrowUpRight size={16} /></button></section></div>
          <Calendar month={month} setMonth={setMonth} days={days} t={t} language={language} />
        </>}
        {page === "courses" && <><PageTitle eyebrow="LIBRARY" title={t("Твои курсы", "Your courses")} /><div className="course-grid">{courses.map((c) => {const p = progress(c, records); return <section className="card course-card" key={c.id}><span className="eyebrow">{c.lessons.length} LESSONS</span><h2>{c.title}</h2><p>{c.description}</p><div className="bar"><i style={{ width: p.percent + "%" }} /></div><div className="section-head"><span>{p.percent}%</span><button className="text-button" onClick={() => openLesson(c, c.lessons.find((l) => !lessonComplete(l, records)) || c.lessons[0])}>{t("Открыть", "Open")} <ArrowRight size={17} /></button></div></section>;})}</div></>}
        {page === "lesson" && lesson && <>
          <div className="lesson-top"><span className="eyebrow">{course.title} / {lesson.module}</span><button className="secondary" onClick={() => openChat()}><MessageCircle size={16} /> AI mentor</button></div>
          <PageTitle eyebrow={t("УРОК", "LESSON") + " " + String(course.lessons.indexOf(lesson) + 1).padStart(2, "0")} title={lesson.title} />
          <div className="lesson-meta"><Clock size={15} /> {lesson.minutes} min <span>·</span> {lesson.tasks.filter((x) => records["task:" + x.id]).length}/{lesson.tasks.length} {t("заданий", "tasks")}</div>
          <article className="prose"><Md>{lesson.body}</Md></article>
          <h2 className="heading">{t("Задания", "Tasks")}</h2>
          {lesson.tasks.map((task) => <section key={task.id} className="task"><div className="task-main"><div className="check-row"><input aria-label={task.text} type="checkbox" checked={records["task:" + task.id] === true} disabled={Boolean(pendingTasks[task.id])} onChange={(e) => toggleTask(task.id, e.target.checked)} /><div className="task-copy"><Md>{task.text}</Md><small className="eyebrow task-type">{task.type}{task.optional ? " · optional" : ""}</small></div></div><button className="icon" aria-label="Discuss task" onClick={() => openChat(task.id)}><MessageCircle size={18} /></button></div>{task.type !== "theory" && <Editor key={task.id} draftKey={"answer:" + task.id} label={t("Мой ответ / артефакт", "My answer / artifact")} initial={records["answer:" + task.id] || ""} onSave={(value) => save("answer", task.id, value)} t={t} />}</section>)}
          <section className="card note-card"><h2>{t("Личные заметки", "Personal notes")}</h2><Editor key={lesson.id} draftKey={"note:" + lesson.id} label={t("Мысли, выводы, вопросы", "Thoughts, takeaways, questions")} initial={records["note:" + lesson.id] || ""} onSave={(value) => save("note", lesson.id, value)} t={t} /></section>
          <div className="lesson-nav"><button className="secondary" disabled={course.lessons.indexOf(lesson) === 0} onClick={() => openLesson(course, course.lessons[course.lessons.indexOf(lesson) - 1])}><ChevronLeft size={16} /> {t("Назад", "Previous")}</button><button className="primary" disabled={course.lessons.indexOf(lesson) === course.lessons.length - 1} onClick={() => openLesson(course, course.lessons[course.lessons.indexOf(lesson) + 1])}>{t("Следующий урок", "Next lesson")} <ArrowRight size={16} /></button></div>
        </>}
        {page === "calendar" && <><PageTitle eyebrow="ACTIVITY / TIME" title={t("Время в фокусе", "Time in focus")} /><section className="metrics"><div><span>{t("СЕГОДНЯ", "TODAY")}</span><strong>{Math.floor(today / 60)}<small>m</small></strong></div><div><span>{t("ВСЕГО", "ALL TIME")}</span><strong>{Math.floor(totalSeconds / 60)}<small>m</small></strong></div><div><span>{t("АКТИВНЫХ ДНЕЙ", "ACTIVE DAYS")}</span><strong>{Object.keys(days).length}</strong></div></section><Calendar month={month} setMonth={setMonth} days={days} t={t} language={language} /></>}
        {page === "artifacts" && <><PageTitle eyebrow="YOUR WORK" title={t("Твои материалы", "Your artifacts")} /><p className="muted">{t("Все сохранённые ответы и заметки по курсам.", "All saved course answers and notes.")}</p>{courses.flatMap((c) => c.lessons.flatMap((l) => [{ id: l.id, title: t("Заметки", "Notes"), value: records["note:" + l.id] }, ...l.tasks.map((task) => ({ id: task.id, title: task.text, value: records["answer:" + task.id] }))].filter((item) => item.value).map((item) => <section className="card artifact" key={item.id}><div className="section-head"><span className="eyebrow">{c.title} / {l.title}</span><button className="text-button" onClick={() => openLesson(c, l)}>{t("Урок", "Lesson")} <ArrowUpRight size={15} /></button></div><h2>{item.title}</h2><div className="prose"><Md>{item.value}</Md></div></section>)))}{!Object.keys(records).some((key) => (key.startsWith("answer:") || key.startsWith("note:")) && records[key]) && <div className="card empty">{t("Здесь появятся твои первые сохранённые материалы.", "Your saved work will appear here.")}</div>}</>}
        {page === "review" && <><PageTitle eyebrow="PRACTICE / REVIEW" title={t("Повторение", "Review")} /><p className="muted">{t("Возвращайся к навыкам ниже 3/4 и незавершённым проверкам. Самооценка не заменяет самостоятельное решение.", "Revisit skills below 3/4 and unfinished assessments. Self-rating does not replace independent work.")}</p>{courses.map((c) => <section className="card skill-card" key={c.id}><h2>{c.title}</h2>{c.skills.filter((skill) => Number.isInteger(records["skill:" + c.id + ":" + skill]) && records["skill:" + c.id + ":" + skill] < 3).map((skill) => <div className="section-head review-row" key={skill}><span>{skill} · {records["skill:" + c.id + ":" + skill]}/4</span><button className="text-button" onClick={() => {const l = c.lessons.find((l) => l.module === skill) || c.lessons[0]; openLesson(c, l); setMode("tutor"); openChat();}}>{t("Повторить", "Review")} <ArrowRight size={16} /></button></div>)}{c.lessons.filter((l) => l.tasks.some((task) => ["gate","assessment"].includes(task.type) && records["task:" + task.id] !== true) && l.tasks.some((task) => records["task:" + task.id] === true)).map((l) => <div className="section-head review-row" key={l.id}><span>{l.title}</span><button className="text-button" onClick={() => openLesson(c, l)}>{t("Проверка", "Assessment")} <ArrowRight size={16} /></button></div>)}<button className="text-button" onClick={() => {setCourseId(c.id); setLessonId(c.lessons[0].id); setTaskId(""); setMode("planner"); setChatOpen(true);}}>{t("План повторения с AI", "AI review plan")} <ArrowUpRight size={16} /></button></section>)}</>}
        {page === "skills" && <><PageTitle eyebrow="SCORECARD" title={t("Карта компетенций", "Skill map")} /><p className="muted">{t("Самооценка 0–4. Оцени самостоятельное применение, а не просмотр уроков.", "Self-assessment 0–4. Rate independent ability, not watched lessons.")}</p>{courses.map((c) => <section className="card skill-card" key={c.id}><h2>{c.title}</h2>{c.skills.map((skill) => <div className="skill-row" key={skill}><span>{skill}</span><div className="skill-options">{[0,1,2,3,4].map((n) => <button className={records["skill:" + c.id + ":" + skill] === n ? "chosen" : ""} key={n} onClick={() => save("skill", c.id + ":" + skill, n)}>{n}</button>)}</div><small className="muted">{records["skill:" + c.id + ":" + skill] === undefined ? t("Не оценено", "Unrated") : t("Оценено", "Rated")}</small></div>)}</section>)}</>}
        {page === "settings" && <><PageTitle eyebrow="WORKSPACE" title={t("Настройки", "Settings")} /><section className="card settings-card"><h2>{t("Интерфейс", "Appearance")}</h2><label>{t("Тема", "Theme")}<select value={theme} onChange={(e) => setTheme(e.target.value)}><option value="light">Light</option><option value="dark">Dark</option></select></label><label>{t("Язык", "Language")}<select value={language} onChange={(e) => setLanguage(e.target.value)}><option value="ru">Русский</option><option value="en">English</option></select></label><h2>AI provider</h2><label>{t("Провайдер", "Provider")}<select value={provider} onChange={(e) => setProvider(e.target.value)}>{["auto","openai","glm","humanizer","opencode"].map((p) => <option value={p} key={p} disabled={!providers[p]}>{p}{providers[p] ? "" : " (not configured)"}</option>)}</select></label><p className="muted">{t("Ключи задаются только на сервере. Статус означает наличие конфигурации, а не проверку соединения.", "Keys are configured on the server. Status indicates configuration, not connectivity.")}</p><h2>{t("Данные", "Data")}</h2><button className="secondary" onClick={exportData}>{t("Экспорт JSON", "Export JSON")} <ArrowUpRight size={16} /></button></section></>}
        </>}
      </main>
      {chatOpen && lesson && <aside className="chat" ref={chatPanel}><div className="chat-head"><div><span className="eyebrow">LEARNING / AI</span><h2>Mentor</h2></div><button className="icon" onClick={() => setChatOpen(false)} aria-label="Close chat"><PanelRightClose size={19} /></button></div><div className="context"><span className="dot" /> {lesson.title}{taskId && " / " + lesson.tasks.find((x) => x.id === taskId)?.type}</div><label className="mode-label">{t("Режим", "Mode")}<select value={mode} onChange={(e) => setMode(e.target.value)}>{modes.map(([id, ru, en]) => <option key={id} value={id}>{t(ru, en)}</option>)}</select></label><div className="messages">{messages.length === 0 && <div className="chat-empty">{t("Спроси о текущей теме. Наставник видит урок, сохранённый ответ и заметки.", "Ask about this topic. Your mentor sees the lesson, saved answer and notes.")}</div>}{messages.map((m, i) => <article className={"message " + m.role} key={m.id || i}><span className="eyebrow">{m.role === "user" ? t("ТЫ", "YOU") : "MENTOR"} {m.provider || ""}</span><Md>{m.content}</Md></article>)}{busy && <p className="muted" role="status">{t("Формируется ответ…", "Generating response…")}</p>}</div><form className="composer" onSubmit={send}><textarea aria-label="Message" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t("Задай вопрос…", "Ask a question…")} rows={3} /><button className="primary" disabled={busy || !draft.trim()}>{t("Отправить", "Send")} <ArrowRight size={16} /></button></form></aside>}
    </div>
    <footer className="focus"><div className="focus-label"><span className="dot" /><span>{t("РЕЖИМ ФОКУСА", "FOCUS MODE")}</span></div><div className="time" aria-label="Timer">{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</div><button className="icon" disabled={savingTimer || !ready || seconds === 0} aria-label={timer.end ? "Pause" : "Start"} onClick={toggleTimer}>{timer.end ? <Pause size={20} /> : <Play size={20} />}</button><button className="icon" disabled={savingTimer || !ready || !timer.id} aria-label="Save session and reset" onClick={() => finishTimer(timer, timer.length - remaining(timer))}><RotateCcw size={19} /></button><select aria-label="Focus or break duration" disabled={Boolean(timer.id)} value={timer.length} onChange={(e) => setTimer({ length: +e.target.value, left: +e.target.value, end: null, id: null, started: null })}><option value={1500}>25 min</option><option value={3000}>50 min</option><option value={300}>5 min break</option></select><div className="focus-spacer" /><button className="text-button" onClick={() => { setMode("tutor"); openChat(); }}><MessageCircle size={18} /><span>AI Mentor</span></button></footer>
  </div>;
}

function PageTitle({ eyebrow, title }) { return <div className="page-title"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1></div>; }
function Editor({ label, initial, onSave, t, draftKey }) {
  const [value, setValue] = useState(() => readLocal("draft:" + draftKey, initial));
  const [saved, setSaved] = useState(initial);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const [preview, setPreview] = useState(false);
  const saveRef = useRef(onSave);
  saveRef.current = onSave;
  async function persist(snapshot) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    try { if (await saveRef.current(snapshot)) setSaved(snapshot); }
    finally { inFlight.current = false; setPending(false); }
  }
  useEffect(() => {
    if (value === saved || pending) return;
    localStorage.setItem("draft:" + draftKey, JSON.stringify(value));
    const id = setTimeout(() => { void persist(value); }, 1200);
    return () => clearTimeout(id);
  }, [value, saved, draftKey, pending]);
  useEffect(() => {
    function warn(e) { if (value !== saved) { e.preventDefault(); e.returnValue = ""; } }
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [value, saved]);
  return <div className="editor"><label>{label}</label>{preview ? <div className="prose preview"><Md>{value}</Md></div> : <textarea aria-label={label} value={value} onChange={(e) => { const next = e.target.value; localStorage.setItem("draft:" + draftKey, JSON.stringify(next)); setValue(next); }} rows={4} placeholder="Markdown / code / notes…" />}<div className="editor-actions"><button className="text-button" onClick={() => setPreview(!preview)}>{preview ? t("Редактировать", "Edit") : t("Предпросмотр", "Preview")}</button><span className="muted">{value === saved ? t("Сохранено", "Saved") : t("Есть изменения", "Unsaved changes")}</span><button disabled={pending || value === saved} className="secondary" onClick={() => persist(value)}>{t("Сохранить", "Save")}</button></div></div>;
}
function Calendar({ month, setMonth, days, t, language }) {
  const [selected, setSelected] = useState(dateKey());
  const cells = monthCells(month.getFullYear(), month.getMonth());
  return <section className="card calendar"><div className="section-head"><div><span className="eyebrow">{t("РИТМ ОБУЧЕНИЯ", "LEARNING RHYTHM")}</span><h2>{new Intl.DateTimeFormat(language, { month: "long", year: "numeric" }).format(month)}</h2></div><div className="calendar-nav"><button className="icon" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()-1, 1))}><ChevronLeft size={18} /></button><button className="icon" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()+1, 1))}><ChevronRight size={18} /></button></div></div><div className="calendar-grid">{(language === "ru" ? ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"] : ["Mo","Tu","We","Th","Fr","Sa","Su"]).map((d) => <span className="weekday" key={d}>{d}</span>)}{cells.map((d,i) => d ? <button key={dateKey(d)} title={Math.floor((days[dateKey(d)] || 0)/60) + " min"} className={"day " + (days[dateKey(d)] ? "active-day " : "") + (dateKey(d) === selected ? "day-selected" : "")} onClick={() => setSelected(dateKey(d))}>{d.getDate()}{days[dateKey(d)] ? <i /> : null}</button> : <span key={"empty"+i} />)}</div><p className="muted calendar-caption"><CalendarDays size={16} /> {selected} · {Math.floor((days[selected] || 0)/60)} min</p></section>;
}

createRoot(document.getElementById("root")).render(<App />);
