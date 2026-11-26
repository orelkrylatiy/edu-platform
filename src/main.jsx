import { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUpRight, ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Menu, MessageCircle, Moon, PanelLeftClose, PanelRightClose, Play, Pause, RotateCcw, Settings, Sun, X, ChartNoAxesColumn, LibraryBig, Sparkles, NotebookPen, ScanLine, Target, BookOpen } from "lucide-react";
import { activity, dateKey, lessonComplete, monthCells, progress, remaining, getWeekDays, weekTotal, studyStreak, advanceCalendar } from "./learning.js";
import "./style.css";

const nav = [["home", "Обзор", "Overview"], ["courses", "Курсы", "Courses"], ["practice", "Практикум", "Practice"], ["knowledge", "Библиотека", "Library"], ["calendar", "Активность", "Activity"], ["focus", "Фокус", "Focus"], ["artifacts", "Материалы", "Artifacts"], ["review", "Повторение", "Review"], ["skills", "Навыки", "Skills"], ["settings", "Настройки", "Settings"]];
const navIcons = { home: ScanLine, courses: LibraryBig, practice: Target, knowledge: BookOpen, calendar: CalendarDays, focus: Clock, artifacts: NotebookPen, review: RotateCcw, skills: ChartNoAxesColumn, settings: Settings };
function PixelArt() {
  const cells = Array.from({length: 19 * 19}, (_,i) => {
    const x = i % 19, y = Math.floor(i / 19);
    const l = x >= 1 && x <= 4 && y >= 3 && y <= 10;
    const r = x >= 14 && x <= 17 && y >= 3 && y <= 10;
    const bridge = x >= 5 && x <= 13 && y >= 12 && y <= 14;
    const arms = y >= 15 && y <= 17 && ((x >= 4 && x <= 7) || (x >= 11 && x <= 14));
    const center = x >= 8 && x <= 10 && y >= 15 && y <= 17;
    const active = l || r || bridge || arms || center;
    const shade = (x * 7 + y * 11) % 5;
    return <i key={i} className={active ? "pixel p" + shade : "pixel"} />;
  });
  return <div className="pixel-visual" aria-hidden="true"><div className="pixel-matrix">{cells}</div><div className="pixel-caption">BUILD / LEARN / REPEAT</div></div>;
}
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
const wikiDocs = {
  "Middle System Analyst Roadmap": "sa-roadmap",
  "SA Practice Lab": "sa-practice-lab",
  "SA Interview Scorecard": "sa-scorecard",
};
const interviewWikiUrl = "https://github.com/orelkrylatiy/personal-wiki/blob/main/01%20Projects/Career%20Offer/Interview%20Preparation%20Plan.md";
function headingSlug(label) {
  return String(label).toLocaleLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
}
function linkWiki(raw) {
  return String(raw || "").replace(/\[\[([^\]]+)\]\]/g, (original, text) => {
    const [title, anchor] = text.split("#");
    const doc = wikiDocs[title.trim()];
    if (doc) return "[" + text + "](#workspace-doc/" + doc + "/" + encodeURIComponent(anchor || "") + ")";
    if (title.trim() === "Interview Preparation Plan") return "[" + text + "](" + interviewWikiUrl + ")";
    return original;
  });
}
function RenderMarkdown({ text }) {
  return <Markdown remarkPlugins={[remarkGfm]} components={{
    a: ({ href, children }) => <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel={href?.startsWith("http") ? "noreferrer noopener" : undefined}
      onClick={(event) => {
        if (href?.startsWith("#workspace-doc/")) {
          event.preventDefault();
          const [, id, anchor = ""] = href.slice(1).split("/");
          window.dispatchEvent(new CustomEvent("workspace:open-document", { detail: { id, anchor: decodeURIComponent(anchor) } }));
        }
      }}>{children}</a>,
    h2: ({ children }) => <h2 id={"doc-heading-" + headingSlug(children)}>{children}</h2>,
    h3: ({ children }) => <h3 id={"doc-heading-" + headingSlug(children)}>{children}</h3>,
    img: ({ alt }) => <span className="image-placeholder">[{alt || "image"}]</span>,
  }}>{text}</Markdown>;
}
function Md({ children }) {
  const content = linkWiki(children);
  return <>{content.split(/(<details>[\s\S]*?<\/details>)/g).map((segment, index) => {
    const hint = segment.match(/^<details>\s*<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>$/);
    return hint
      ? <details className="study-hint" key={index}><summary>{hint[1].trim()}</summary><div className="prose"><RenderMarkdown text={hint[2].trim()} /></div></details>
      : <RenderMarkdown key={index} text={segment} />;
  })}</>;
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
  const [docId, setDocId] = useState("sa-roadmap");
  const [docAnchor, setDocAnchor] = useState("");
  const [courseId, setCourseId] = useState(readLocal("course", "system-analyst"));
  const [lessonId, setLessonId] = useState(readLocal("lesson", "sa-01"));
  const [theme, setTheme] = useState(readLocal("theme", "dark"));
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
    const open = (event) => {
      setDocId(event.detail.id);
      setDocAnchor(event.detail.anchor || "");
      setCourseId("system-analyst");
      setPage("knowledge");
    };
    window.addEventListener("workspace:open-document", open);
    return () => window.removeEventListener("workspace:open-document", open);
  }, []);
  useEffect(() => {
    if (page !== "knowledge" || !docAnchor) return;
    const handle = setTimeout(() => document.getElementById("doc-heading-" + headingSlug(docAnchor))?.scrollIntoView({ block:"start" }), 80);
    return () => clearTimeout(handle);
  }, [page, docId, docAnchor]);

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
  const lesson = [...(course?.lessons || []), ...(course?.practice || [])].find((l) => l.id === lessonId) || course?.lessons[0];
  const lessonUnits = lesson?.kind === "practice" ? (course?.practice || []) : (course?.lessons || []);
  const lessonIndex = lessonUnits.indexOf(lesson);
  const selectedDocument = course?.documents?.find((doc) => doc.id === docId) || course?.documents?.[0];
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
  function openLesson(c, l) { if (!c || !l) return; setCourseId(c.id); setLessonId(l.id); setTaskId(""); setChatOpen(false); setPage("lesson"); }
  function openDocument(c, doc) { if (!c || !doc) return; setCourseId(c.id); setDocId(doc.id); setDocAnchor(""); setPage("knowledge"); }
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
  const weekSeconds = weekTotal(days, new Date());
  const lastWeekSeconds = weekTotal(days, new Date(Date.now() - 7 * 86400000));
  const weeklyDelta = Math.round((weekSeconds - lastWeekSeconds) / 60);
  const streak = studyStreak(days, new Date());
  const activeWeek = getWeekDays(new Date()).filter(d => (days[dateKey(d)] || 0) > 0).length;
  const lowSkill = course?.skills.find(skill => Number.isInteger(records["skill:" + course.id + ":" + skill]) && records["skill:" + course.id + ":" + skill] < 3);
  const insightTitle = lowSkill ? t("Время закрепить " + lowSkill, "Revisit " + lowSkill)
    : weekSeconds === 0 ? t("Начни с одной сессии", "Start with one session")
    : weeklyDelta > 0 ? t("Ты набираешь темп", "You're building momentum")
    : t("Сохрани ритм", "Keep your rhythm");
  const insightBody = lowSkill ? t("По твоей самооценке эта тема пока ниже 3/4. Попробуй новую задачу без подсказок.", "Your self-rating is below 3/4. Try a fresh task independently.")
    : weekSeconds === 0 ? t("На этой неделе ещё нет фокус-сессий. 25 минут сегодня — хорошее начало.", "No focus sessions yet this week. Twenty-five minutes is a good start.")
    : weeklyDelta > 0 ? t("На этой неделе уже " + fmt(weekSeconds) + " — на " + weeklyDelta + " мин больше предыдущей.", "This week: " + fmt(weekSeconds) + ", up " + weeklyDelta + " min from last week.")
    : t("На этой неделе " + activeWeek + " активных дней и " + fmt(weekSeconds) + " практики. Продолжай без перегрузки.", activeWeek + " active days and " + fmt(weekSeconds) + " this week. Keep it sustainable.");

  return <div className="app">
    <header className="topbar">
      <button className="icon" aria-label={t("Навигация", "Navigation")} onClick={() => setSidebar(!sidebar)}><Menu size={19} /></button>
      <button className="brand" onClick={() => setPage("home")}><span className="logo">L<span className="logo-star">✳</span></span><span>LEARNING<span className="brand-accent">/</span>WORKSPACE</span></button>
      <div className="top-right"><span className="status"><i /> {t("ЛИЧНОЕ ПРОСТРАНСТВО", "PERSONAL SPACE")}</span><button className="top-timer" onClick={() => setPage("focus")} title={t("Открыть таймер", "Open focus timer")}><Clock size={14} /> {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</button><button className="icon" aria-label={t("Сменить тему", "Toggle theme")} onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? <Moon size={19} /> : <Sun size={19} />}</button><button className="icon" aria-label="Settings" onClick={() => setPage("settings")}><Settings size={19} /></button></div>
    </header>
    {error && <div className="error" role="alert">{error}<button className="icon" onClick={() => setError("")} aria-label="Close"><X size={16} /></button></div>}
    <div className={"layout " + (sidebar ? "has-nav " : "") + (chatOpen && lesson ? "has-chat" : "")}>
      {sidebar && <aside className="sidebar">
        <div className="side-label">{t("НАВИГАЦИЯ", "NAVIGATION")}<button className="icon" onClick={() => setSidebar(false)} aria-label="Collapse navigation"><PanelLeftClose size={16} /></button></div>
        {nav.map(([id, ru, en]) => { const Icon = navIcons[id]; return <button key={id} className={"nav-item " + (page === id ? "selected" : "")} onClick={() => { setPage(id); if (window.innerWidth <= 650) setSidebar(false); }}><Icon size={17} /><span>{t(ru, en)}</span><ChevronRight size={14} className="nav-arrow" /></button>; })}
        <div className="side-label course-label">{t("ПРОГРАММА", "PROGRAM")}</div>
        {course && <><strong className="side-course">{course.title}</strong><div className="bar"><i style={{ width: stats.percent + "%" }} /></div><small className="muted">{stats.percent}%</small>
        <div className="lessons"><span className="side-label sub-label">{t("УРОКИ / ДНИ", "LESSONS / DAYS")}</span>{course.lessons.map((l, i) => <button key={l.id} className={"lesson-link " + (page === "lesson" && l.id === lesson?.id ? "selected" : "")} onClick={() => openLesson(course, l)}><span className="mono">{String(i + 1).padStart(2, "0")}</span><span>{l.title}</span>{lessonComplete(l, records) && <Check size={14} />}</button>)}</div>
        {Boolean(course.practice?.length) && <div className="side-group"><div className="side-label sub-label">PRACTICE LAB</div><button className="lesson-link" onClick={() => setPage("practice")}><Target size={14} /> {t("Открыть практикум", "Open practice")}</button></div>}
        {Boolean(course.documents?.length) && <div className="side-group"><div className="side-label sub-label">SOURCE MATERIALS</div>{course.documents.map((doc) => <button key={doc.id} className="lesson-link" onClick={() => openDocument(course, doc)}><BookOpen size={14}/><span>{doc.title}</span></button>)}</div>}
        </>}
      </aside>}
      <main className="main">
        {!ready ? <div className="loading-view" aria-busy={!error}>{error ? <div className="card"><h2>{t("Не удалось загрузить рабочее пространство", "Unable to load workspace")}</h2><p>{error}</p><button className="secondary" onClick={() => window.location.reload()}>{t("Повторить", "Retry")}</button></div>
          : <><div className="skeleton-line short" /><div className="skeleton-hero"><div className="skeleton-line wide" /><div className="skeleton-line medium" /><div className="skeleton-line short" /></div><div className="skeleton-grid"><div className="skeleton-block" /><div className="skeleton-block" /><div className="skeleton-block" /></div><div className="skeleton-grid"><div className="skeleton-block tall" /><div className="skeleton-block tall" /></div></>}
        </div> : <>
        {page === "home" && <>
          <div className="page-kicker"><span className="signal" /> WORKSPACE / 001 <span className="kicker-right">{new Intl.DateTimeFormat(language, {weekday:"long",day:"numeric",month:"long"}).format(new Date())}</span></div>
          <section className="hero">
            <div className="hero-copy"><div className="eyebrow hero-eyebrow">&gt; {t("ТВОЯ ТРАЕКТОРИЯ / НЕ ОСТАНАВЛИВАЙСЯ", "YOUR PATH / KEEP MOVING")}</div>
            <h1>{t("Учёба — это", "Make learning")}<br /><span>{t("система.", "a system.")}</span></h1>
            <p>{t("Маленькие действия. Видимый прогресс. Глубокое понимание. Продолжим с того места, где ты остановился.", "Small actions. Visible progress. Real understanding. Pick up where you left off.")}</p>
            <div className="hero-actions"><button className="primary" disabled={!next} onClick={() => openLesson(course, next)}>{t("Продолжить", "Continue learning")} <ArrowUpRight size={17} /></button><button className="ghost" onClick={() => setPage("focus")}><Play size={15} /> {t("Начать фокус", "Start focus")}</button></div>
            <div className="hero-bottom"><span><i className="tiny-led" /> SYSTEM / ACTIVE</span><span>PROGRESS: {String(stats.percent).padStart(2,"0")}%</span></div></div>
            <PixelArt />
          </section>
          <div className="section-caption"><span>01 — {t("ТВОЯ СТАТИСТИКА", "YOUR NUMBERS")}</span><span>{t("ДАННЫЕ ИЗ ТВОИХ СЕССИЙ", "FROM YOUR STUDY SESSIONS")}</span></div>
          <section className="metrics"><div><span>{t("ЭТА НЕДЕЛЯ", "THIS WEEK")}</span><strong>{Math.floor(weekSeconds/60)}<small>min</small></strong><p>{activeWeek} / 7 {t("активных дней", "active days")}</p></div><div><span>{t("КУРС ПРОЙДЕН", "COURSE COMPLETION")}</span><strong>{stats.percent}<small>%</small></strong><p>{stats.done} / {stats.total} {t("задач", "tasks")}</p></div><div><span>{t("СЕРИЯ", "STUDY STREAK")}</span><strong>{streak}<small>{t("дн.", "days")}</small></strong><p>{t("Постоянство важнее темпа", "Consistency over intensity")}</p></div></section>
          <div className="two-col">
            <section className="card next-card"><div className="section-head"><span className="eyebrow">02 / {t("СЛЕДУЮЩЕЕ ДЕЙСТВИЕ", "NEXT ACTION")}</span><ArrowUpRight size={17} /></div><div className="card-content"><span className="card-mono">{course?.title} / {next?.module}</span><h2>{next?.title}</h2><p>{t("Твой следующий урок", "Your next lesson")} · {next?.minutes} min</p></div><button className="inline-link" onClick={() => openLesson(course,next)}>{t("Перейти к уроку", "Open lesson")} <ArrowRight size={17} /></button></section>
            <section className="card insight-card"><div className="section-head"><span className="eyebrow">03 / {t("НА ОСНОВЕ ПРОГРЕССА", "BASED ON YOUR DATA")}</span><Sparkles size={17}/></div><div className="card-content"><span className="card-mono">{t("ПЕРСОНАЛЬНОЕ НАБЛЮДЕНИЕ", "PERSONAL INSIGHT")}</span><h2>{insightTitle}</h2><p>{insightBody}</p></div><button className="inline-link" onClick={() => {setMode("planner");openChat();}}>{t("Обсудить с наставником", "Discuss with mentor")} <ArrowRight size={17}/></button></section>
          </div>
          <div className="section-caption"><span>04 — {t("УЧЕБНЫЙ РИТМ", "LEARNING RHYTHM")}</span><button className="inline-link" onClick={() => setPage("calendar")}>{t("Вся активность", "All activity")} <ArrowUpRight size={15}/></button></div>
          <Calendar month={month} setMonth={setMonth} days={days} t={t} language={language} />
        </>}
        {page === "courses" && <><PageTitle eyebrow="LIBRARY" title={t("Твои курсы", "Your courses")} /><div className="course-grid">{courses.slice().sort((a,b) => Number(b.id === courseId) - Number(a.id === courseId)).map((c) => {const p = progress(c, records); return <section className="card course-card" key={c.id}><span className="eyebrow">{c.lessons.length} LESSONS</span><h2>{c.title}</h2><p>{c.description}</p><div className="bar"><i style={{ width: p.percent + "%" }} /></div><div className="section-head"><span>{p.percent}%</span><button className="text-button" onClick={() => openLesson(c, c.lessons.find((l) => !lessonComplete(l, records)) || c.lessons[0])}>{t("Открыть", "Open")} <ArrowRight size={17} /></button></div></section>;})}</div></>}
        {page === "lesson" && lesson && <>
          <div className="lesson-top"><span className="eyebrow">{course.title} / {lesson.module}</span><button className="secondary" onClick={() => openChat()}><MessageCircle size={16} /> AI mentor</button></div>
          <PageTitle eyebrow={lesson.kind === "practice" ? "PRACTICE LAB" : t("УРОК", "LESSON") + " " + String(lessonIndex + 1).padStart(2, "0")} title={lesson.title} />
          <div className="lesson-meta"><Clock size={15} /> {lesson.minutes} min <span>·</span> {lesson.tasks.filter((x) => records["task:" + x.id]).length}/{lesson.tasks.length} {t("заданий", "tasks")}</div>
          <article className="prose"><Md>{lesson.body}</Md></article>
          <h2 className="heading">{t("Задания", "Tasks")}</h2>
          {lesson.tasks.map((task) => <section key={task.id} className="task"><div className="task-main"><div className="check-row"><input aria-label={task.text} type="checkbox" checked={records["task:" + task.id] === true} disabled={Boolean(pendingTasks[task.id])} onChange={(e) => toggleTask(task.id, e.target.checked)} /><div className="task-copy"><Md>{task.text}</Md><small className="eyebrow task-type">{task.type}{task.optional ? " · optional" : ""}</small></div></div><button className="icon" aria-label="Discuss task" onClick={() => openChat(task.id)}><MessageCircle size={18} /></button></div>{task.type !== "theory" && <Editor key={task.id} draftKey={"answer:" + task.id} label={t("Мой ответ / артефакт", "My answer / artifact")} initial={records["answer:" + task.id] || ""} onSave={(value) => save("answer", task.id, value)} t={t} />}</section>)}
          <section className="card note-card"><h2>{t("Личные заметки", "Personal notes")}</h2><Editor key={lesson.id} draftKey={"note:" + lesson.id} label={t("Мысли, выводы, вопросы", "Thoughts, takeaways, questions")} initial={records["note:" + lesson.id] || ""} onSave={(value) => save("note", lesson.id, value)} t={t} /></section>
          <div className="lesson-nav"><button className="secondary" disabled={lessonIndex <= 0} onClick={() => openLesson(course, lessonUnits[lessonIndex - 1])}><ChevronLeft size={16} /> {t("Назад", "Previous")}</button><button className="primary" disabled={lessonIndex >= lessonUnits.length - 1} onClick={() => openLesson(course, lessonUnits[lessonIndex + 1])}>{lesson.kind === "practice" ? t("Следующая практика", "Next practice") : t("Следующий урок", "Next lesson")} <ArrowRight size={16} /></button></div>
        </>}
        {page === "practice" && <>
          <PageTitle eyebrow="SA / PRACTICE LAB" title={t("Практикум", "Practice Lab")} />
          <p className="page-intro">{t("Диагностика, сквозной кейс Order Management, SQL, интеграции и независимые задачи. Сохраняй собственные решения.", "Diagnostic tasks, Order Management, SQL and independent exercises. Save your own work.")}</p>
          {course?.practice?.length ? <>
            <div className="practice-stats"><span>{course.practice.length} {t("разделов", "sections")}</span><span>{course.practice.filter((unit) => lessonComplete(unit, records)).length} {t("завершено", "completed")}</span><button className="inline-link" onClick={() => openDocument(course, course.documents?.find((d)=>d.id==="sa-practice-lab"))}>{t("Оригинальный Practice Lab", "Original Practice Lab")} <ArrowUpRight size={15}/></button></div>
            <div className="practice-grid">{course.practice.map((unit, index) => <section className="card practice-card" key={unit.id}><div className="section-head"><span className="eyebrow">{String(index+1).padStart(2,"0")} / {unit.group}</span>{lessonComplete(unit, records) && <Check size={16}/>}</div><h2>{unit.title}</h2><p>{unit.tasks.length} {t("заданий", "tasks")} · {unit.minutes} min</p><button className="inline-link" onClick={() => openLesson(course, unit)}>{t("Открыть практику", "Open exercise")} <ArrowRight size={16}/></button></section>)}</div>
          </> : <p className="muted">{t("Для этого курса пока нет отдельного практикума.", "This course has no dedicated practice lab yet.")}</p>}
        </>}
        {page === "knowledge" && <>
          <PageTitle eyebrow="CONTENT / SOURCE LIBRARY" title={t("Библиотека курса", "Course library")} />
          <p className="page-intro">{t("Полные исходники из Wiki, без сокращений. Внутренние ссылки открывают документы, подсказки раскрываются по нажатию.", "Complete Wiki sources, with preserved links and expandable hints.")}</p>
          {course?.documents?.length ? <>
            <div className="document-tabs">{course.documents.map((doc) => <button key={doc.id} className={selectedDocument?.id === doc.id ? "active" : ""} onClick={() => {setDocId(doc.id);setDocAnchor("");}}>{doc.title}</button>)}</div>
            {selectedDocument && <article className="card document-reader"><div className="section-head"><span className="eyebrow">READ ONLY / {selectedDocument.title}</span>{selectedDocument.source && <a className="inline-link" href={selectedDocument.source} target="_blank" rel="noreferrer noopener">{t("Оригинал в Wiki", "Original in Wiki")} <ArrowUpRight size={15}/></a>}</div><div className="prose"><Md>{selectedDocument.body}</Md></div></article>}
          </> : <div className="card empty">{t("Дополнительные материалы пока не подключены.", "No source documents for this course yet.")}</div>}
        </>}
        {page === "calendar" && <>
          <PageTitle eyebrow="ACTIVITY / 07 DAYS" title={t("Активность", "Activity")} />
          <div className="page-intro">{t("Учебный ритм без лишней гонки. Выбери день, чтобы посмотреть время и сессии.", "Your study rhythm without the pressure. Select a day to explore sessions.")}</div>
          <section className="metrics"><div><span>{t("ЭТА НЕДЕЛЯ", "THIS WEEK")}</span><strong>{Math.floor(weekSeconds/60)}<small>min</small></strong><p>{activeWeek} {t("активных дней", "active days")}</p></div><div><span>{t("ПРОШЛАЯ НЕДЕЛЯ", "LAST WEEK")}</span><strong>{Math.floor(lastWeekSeconds/60)}<small>min</small></strong><p>{weeklyDelta > 0 ? "+" : ""}{weeklyDelta} {t("мин к прошлой", "min vs last week")}</p></div><div><span>{t("ВСЕГО ВРЕМЕНИ", "ALL-TIME FOCUS")}</span><strong>{Math.floor(totalSeconds/3600)}<small>h</small> {Math.floor(totalSeconds%3600/60)}<small>m</small></strong><p>{Object.keys(days).length} {t("дней с занятиями", "days studied")}</p></div></section>
          <Calendar month={month} setMonth={setMonth} days={days} t={t} language={language} records={records} />
          <section className="card data-notes"><div className="section-head"><span className="eyebrow">DATA / INTERPRETATION</span><ChartNoAxesColumn size={18}/></div><h2>{insightTitle}</h2><p>{insightBody}</p><p className="muted">{t("Статистика основана на сохранённых фокус-сессиях, а не на времени открытой страницы.", "Metrics reflect saved focus sessions, not time with a page open.")}</p></section>
        </>}
        {page === "focus" && <>
          <div className="page-kicker"><span className="signal" /> FOCUS / SESSION <span className="kicker-right">{t("НЕ ОТВЛЕКАЙСЯ / ДЕЛАЙ", "STAY PRESENT / KEEP GOING")}</span></div>
          <section className="focus-room">
            <div className="eyebrow">&gt; {t("ПРОСТРАНСТВО ДЛЯ СОСРЕДОТОЧЕННОЙ РАБОТЫ", "A SPACE FOR DEEP WORK")}</div>
            <h1>{t("Меньше шума.", "Less noise.")}<br/><span>{t("Больше сути.", "More depth.")}</span></h1>
            <div className="focus-time" aria-label="Timer">{String(Math.floor(seconds/60)).padStart(2,"0")}<span>:</span>{String(seconds%60).padStart(2,"0")}</div>
            <div className="focus-tools">
              <button className="primary" disabled={savingTimer || !ready || seconds===0} aria-label={timer.end ? "Pause" : "Start"} onClick={toggleTimer}>{timer.end ? <Pause size={18}/> : <Play size={18}/>} {timer.end ? t("Пауза", "Pause") : t("Начать", "Start")}</button>
              <button className="secondary" disabled={savingTimer || !ready || !timer.id} aria-label="Save session and reset" onClick={() => finishTimer(timer,timer.length - remaining(timer))}><RotateCcw size={17}/>{t("Завершить и сохранить", "Finish & save")}</button>
              <select aria-label="Focus or break duration" disabled={Boolean(timer.id)} value={timer.length} onChange={(e) => setTimer({length:+e.target.value,left:+e.target.value,end:null,id:null,started:null})}><option value={1500}>25 min</option><option value={3000}>50 min</option><option value={300}>5 min · break</option></select>
            </div>
            <div className="focus-foot"><span><i className="tiny-led"/> {timer.end ? t("СЕССИЯ ИДЁТ", "SESSION RUNNING") : timer.id ? t("НА ПАУЗЕ", "PAUSED") : t("ГОТОВ К РАБОТЕ", "READY")}</span><span>{t("Время сохраняется после завершения сессии", "Time is saved when the session ends")}</span></div>
          </section>
          <div className="two-col focus-cards"><section className="card"><div className="eyebrow">TODAY / {t("В ФОКУСЕ", "FOCUS")}</div><h2>{fmt(today)}</h2><p>{t("Время завершённых сессий сегодня", "Completed focus time today")}</p></section><section className="card"><div className="eyebrow">WEEK / {t("В ФОКУСЕ", "FOCUS")}</div><h2>{fmt(weekSeconds)}</h2><p>{t("Время завершённых сессий за неделю", "Completed focus time this week")}</p></section></div>
        </>}
        {page === "artifacts" && <><PageTitle eyebrow="YOUR WORK" title={t("Твои материалы", "Your artifacts")} /><p className="muted">{t("Все сохранённые ответы и заметки по курсам.", "All saved course answers and notes.")}</p>{courses.flatMap((c) => [...c.lessons, ...(c.practice || [])].flatMap((l) => [{ id: l.id, title: t("Заметки", "Notes"), value: records["note:" + l.id] }, ...l.tasks.map((task) => ({ id: task.id, title: task.text, value: records["answer:" + task.id] }))].filter((item) => item.value).map((item) => <section className="card artifact" key={item.id}><div className="section-head"><span className="eyebrow">{c.title} / {l.title}</span><button className="text-button" onClick={() => openLesson(c, l)}>{t("Урок", "Lesson")} <ArrowUpRight size={15} /></button></div><h2>{item.title}</h2><div className="prose"><Md>{item.value}</Md></div></section>)))}{!Object.keys(records).some((key) => (key.startsWith("answer:") || key.startsWith("note:")) && records[key]) && <div className="card empty">{t("Здесь появятся твои первые сохранённые материалы.", "Your saved work will appear here.")}</div>}</>}
        {page === "review" && <><PageTitle eyebrow="PRACTICE / REVIEW" title={t("Повторение", "Review")} /><p className="muted">{t("Возвращайся к навыкам ниже 3/4 и незавершённым проверкам. Самооценка не заменяет самостоятельное решение.", "Revisit skills below 3/4 and unfinished assessments. Self-rating does not replace independent work.")}</p>{courses.map((c) => <section className="card skill-card" key={c.id}><h2>{c.title}</h2>{c.skills.filter((skill) => Number.isInteger(records["skill:" + c.id + ":" + skill]) && records["skill:" + c.id + ":" + skill] < 3).map((skill) => <div className="section-head review-row" key={skill}><span>{skill} · {records["skill:" + c.id + ":" + skill]}/4</span><button className="text-button" onClick={() => {const l = c.lessons.find((l) => l.module === skill) || c.lessons[0]; openLesson(c, l); setMode("tutor"); openChat();}}>{t("Повторить", "Review")} <ArrowRight size={16} /></button></div>)}{c.lessons.filter((l) => l.tasks.some((task) => ["gate","assessment"].includes(task.type) && records["task:" + task.id] !== true) && l.tasks.some((task) => records["task:" + task.id] === true)).map((l) => <div className="section-head review-row" key={l.id}><span>{l.title}</span><button className="text-button" onClick={() => openLesson(c, l)}>{t("Проверка", "Assessment")} <ArrowRight size={16} /></button></div>)}<button className="text-button" onClick={() => {setCourseId(c.id); setLessonId(c.lessons[0].id); setTaskId(""); setMode("planner"); setChatOpen(true);}}>{t("План повторения с AI", "AI review plan")} <ArrowUpRight size={16} /></button></section>)}</>}
        {page === "skills" && <><PageTitle eyebrow="SCORECARD" title={t("Карта компетенций", "Skill map")} /><p className="muted">{t("Самооценка 0–4. Оцени самостоятельное применение, а не просмотр уроков.", "Self-assessment 0–4. Rate independent ability, not watched lessons.")}</p>{courses.map((c) => <section className="card skill-card" key={c.id}><h2>{c.title}</h2>{c.skills.map((skill) => <div className="skill-row" key={skill}><span>{skill}</span><div className="skill-options">{[0,1,2,3,4].map((n) => <button className={records["skill:" + c.id + ":" + skill] === n ? "chosen" : ""} key={n} onClick={() => save("skill", c.id + ":" + skill, n)}>{n}</button>)}</div><small className="muted">{records["skill:" + c.id + ":" + skill] === undefined ? t("Не оценено", "Unrated") : t("Оценено", "Rated")}</small></div>)}
          {c.rubric?.length > 0 && <div className="rubric-block"><div className="section-head"><h3>{t("Рубрика комплексного кейса", "Case rubric")}</h3><span className="eyebrow">{c.rubric.reduce((sum, item) => sum + (records["rubric:" + c.id + ":" + item.id] || 0), 0)}/16</span></div>
            <p className="muted">{t("0 — не выполнено, 1 — частично, 2 — самостоятельно и корректно. Оцени только после своей попытки.", "0 = missing, 1 = partial, 2 = independent and correct. Rate after your own attempt.")}</p>
            {c.rubric.map((item) => <div className="skill-row" key={item.id}><span>{item.title}</span><div className="skill-options">{[0,1,2].map((n) => <button key={n} aria-label={item.title + " " + n} className={records["rubric:" + c.id + ":" + item.id] === n ? "chosen" : ""} onClick={() => save("rubric", c.id + ":" + item.id, n)}>{n}</button>)}</div><small className="muted">{records["rubric:" + c.id + ":" + item.id] === undefined ? t("Не оценено", "Unrated") : t("Оценено", "Rated")}</small></div>)}
            <button className="inline-link" onClick={() => openDocument(c, c.documents?.find((d) => d.id === "sa-scorecard"))}>{t("Все вопросы и критерии", "All criteria and questions")} <ArrowUpRight size={16}/></button>
          </div>}</section>)}</>}
        {page === "settings" && <><PageTitle eyebrow="WORKSPACE" title={t("Настройки", "Settings")} /><section className="card settings-card"><h2>{t("Интерфейс", "Appearance")}</h2><label>{t("Тема", "Theme")}<select value={theme} onChange={(e) => setTheme(e.target.value)}><option value="light">Light</option><option value="dark">Dark</option></select></label><label>{t("Язык", "Language")}<select value={language} onChange={(e) => setLanguage(e.target.value)}><option value="ru">Русский</option><option value="en">English</option></select></label><h2>AI provider</h2><label>{t("Провайдер", "Provider")}<select value={provider} onChange={(e) => setProvider(e.target.value)}>{["auto","openai","glm","humanizer","opencode"].map((p) => <option value={p} key={p} disabled={!providers[p]}>{p}{providers[p] ? "" : " (not configured)"}</option>)}</select></label><p className="muted">{t("Ключи задаются только на сервере. Статус означает наличие конфигурации, а не проверку соединения.", "Keys are configured on the server. Status indicates configuration, not connectivity.")}</p><h2>{t("Данные", "Data")}</h2><button className="secondary" onClick={exportData}>{t("Экспорт JSON", "Export JSON")} <ArrowUpRight size={16} /></button></section></>}
        </>}
      </main>
      {chatOpen && lesson && <aside className="chat" ref={chatPanel}><div className="chat-head"><div><span className="eyebrow">LEARNING / AI</span><h2>Mentor</h2></div><button className="icon" onClick={() => setChatOpen(false)} aria-label="Close chat"><PanelRightClose size={19} /></button></div><div className="context"><span className="dot" /> {lesson.title}{taskId && " / " + lesson.tasks.find((x) => x.id === taskId)?.type}</div><label className="mode-label">{t("Режим", "Mode")}<select value={mode} onChange={(e) => setMode(e.target.value)}>{modes.map(([id, ru, en]) => <option key={id} value={id}>{t(ru, en)}</option>)}</select></label><div className="messages">{messages.length === 0 && <div className="chat-empty">{t("Спроси о текущей теме. Наставник видит урок, сохранённый ответ и заметки.", "Ask about this topic. Your mentor sees the lesson, saved answer and notes.")}</div>}{messages.map((m, i) => <article className={"message " + m.role} key={m.id || i}><span className="eyebrow">{m.role === "user" ? t("ТЫ", "YOU") : "MENTOR"} {m.provider || ""}</span><Md>{m.content}</Md></article>)}{busy && <p className="muted" role="status">{t("Формируется ответ…", "Generating response…")}</p>}</div><form className="composer" onSubmit={send}><textarea aria-label="Message" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t("Задай вопрос…", "Ask a question…")} rows={3} /><button className="primary" disabled={busy || !draft.trim()}>{t("Отправить", "Send")} <ArrowRight size={16} /></button></form></aside>}
    </div>
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
function Calendar({ month, setMonth, days, t, language, records = {} }) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState(dateKey());
  const anchor = new Date(month.getFullYear(), month.getMonth(), month.getDate());
  const currentWeek = getWeekDays(anchor);
  const cells = expanded ? monthCells(month.getFullYear(), month.getMonth()) : currentWeek;
  const labels = language === "ru" ? ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"] : ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const formatter = new Intl.DateTimeFormat(language, { day: "numeric", month: "long" });
  const from = currentWeek[0], to = currentWeek[6];
  const label = expanded ? new Intl.DateTimeFormat(language, {month:"long",year:"numeric"}).format(anchor)
    : formatter.format(from) + " — " + formatter.format(to);
  const selectedSessions = Object.entries(records).filter(([key,value]) => key.startsWith("session:") && value?.date === selected).map(([,value]) => value);
  const dayTime = days[selected] || 0;
  function move(delta) { const d = advanceCalendar(anchor, expanded, delta); setMonth(d); setSelected(dateKey(d)); }
  function choose(d) { setSelected(dateKey(d)); }
  return <section className="card calendar">
    <div className="calendar-toolbar"><div><span className="eyebrow">WEEKLY / {t("КАЛЕНДАРЬ", "CALENDAR")}</span><h2>{label}</h2></div><div className="calendar-controls"><div className="segmented"><button className={!expanded ? "active" : ""} onClick={() => setExpanded(false)}>{t("Неделя", "Week")}</button><button className={expanded ? "active" : ""} onClick={() => setExpanded(true)}>{t("Месяц", "Month")}</button></div><button className="calendar-today" onClick={() => {const today = new Date();setMonth(today);setSelected(dateKey(today));}}>{t("Сегодня", "Today")}</button><button className="icon" aria-label={t("Предыдущая неделя или месяц", "Previous period")} onClick={() => move(-1)}><ChevronLeft size={18}/></button><button className="icon" aria-label={t("Следующая неделя или месяц", "Next period")} onClick={() => move(1)}><ChevronRight size={18}/></button></div></div>
    <div className={"calendar-grid " + (expanded ? "monthly" : "weekly")}>
      {labels.map(l => <span className="weekday" key={l}>{l}</span>)}
      {cells.map((d,i) => d ? <button key={dateKey(d)} title={Math.floor((days[dateKey(d)] || 0)/60) + " min"} className={"day " + (days[dateKey(d)] ? "active-day " : "") + (dateKey(d)===selected ? "day-selected " : "") + (dateKey(d)===dateKey() ? "today " : "")} onClick={() => choose(d)}><span className="day-number">{String(d.getDate()).padStart(2,"0")}</span><span className="day-minutes">{days[dateKey(d)] ? Math.floor(days[dateKey(d)]/60)+"m" : "—"}</span><span className="day-track"><i style={{width:Math.min(100,Math.round((days[dateKey(d)] || 0)/5400*100))+"%"}}/></span></button> : <span className="empty-day" key={"empty"+i}/>)}
    </div>
    <div className="calendar-detail"><div><span className="eyebrow">{t("ВЫБРАННЫЙ ДЕНЬ", "SELECTED DAY")}</span><strong>{new Intl.DateTimeFormat(language,{weekday:"long",day:"numeric",month:"long"}).format(new Date(selected+"T12:00:00"))}</strong></div><div className="day-summary"><strong>{Math.floor(dayTime/60)} <small>min</small></strong><span>{selectedSessions.length} {t("сессий", "sessions")}</span></div></div>
    {selectedSessions.length > 0 && <div className="session-list">{selectedSessions.map((session,i) => <div key={i}><Clock size={14}/><span>{t("Фокус-сессия", "Focus session")} {i+1}</span><strong>{Math.floor(session.seconds/60)} min</strong></div>)}</div>}
  </section>;
}

createRoot(document.getElementById("root")).render(<App />);
