import { useState } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, Check, Clock3, LockKeyhole, ShieldCheck, Sparkles, X } from "lucide-react";
import "./auth.css";

const label = (en, ru, english) => english ? en : ru;

export function CatalogView({ courses = [], enrolled = [], onStart, onOpen, english = false, guest = false }) {
  return <section className="catalog-section" aria-label={label("Course catalog", "Каталог курсов", english)}>
    <div className="catalog-lead">
      <div><span className="eyebrow">COURSES / {String(courses.length).padStart(2, "0")}</span>
        <h2>{label("Choose your next direction.", "Выбери своё направление.", english)}</h2>
        <p>{label("One workspace. Your own pace, notes, sessions, and AI context.", "Одно пространство для обучения. Твой темп, заметки, сессии и AI-контекст.", english)}</p>
      </div>
      <span className="catalog-mark" aria-hidden="true">/ CURRICULUM 001—</span>
    </div>
    <div className="catalog-list">
      {courses.map((course, index) => {
        const isEnrolled = enrolled.includes(course.id);
        const count = Array.isArray(course.lessons) ? course.lessons.length : course.lessons;
        const practiceCount = Array.isArray(course.practice) ? course.practice.length : course.practice || 0;
        const preview = course.preview || course.lessons?.slice?.(0, 3).map((x) => x.title) || [];
        return <article className="catalog-card" key={course.id}>
          <div className="catalog-card-number">0{index + 1} <span>— PROGRAM</span></div>
          <div className="catalog-card-body">
            <div className="catalog-card-heading"><h3>{course.title}</h3>{isEnrolled && <span className="enroll-badge"><Check size={13} /> {label("ENROLLED", "ИЗУЧАЕШЬ", english)}</span>}</div>
            <p>{course.description}</p>
            <div className="catalog-pills"><span><BookOpen size={14}/>{count} {label("lessons", "уроков", english)}</span>
              <span><Clock3 size={14}/>{practiceCount} {label("practice units", "практик", english)}</span></div>
            {Boolean(course.skills?.length) && <div className="catalog-skills">{course.skills.slice(0, 6).map((tag) => <span key={tag}>{tag}</span>)}</div>}
            {preview.length > 0 && <div className="catalog-preview"><strong>{label("FIRST STEPS", "ПЕРВЫЕ ШАГИ", english)}</strong>
              {preview.map((title, n) => <div key={n}><span>{String(n + 1).padStart(2, "0")}</span>{title}</div>)}</div>}
          </div>
          <div className="catalog-card-action">
            <button className={isEnrolled ? "secondary" : "primary"} onClick={() => isEnrolled ? onOpen?.(course) : onStart?.(course)}>
              {isEnrolled ? label("Continue", "Продолжить", english) : guest ? label("Get access", "Начать обучение", english) : label("Start course", "Записаться", english)}
              <ArrowUpRight size={17}/>
            </button>
          </div>
        </article>;
      })}
      {courses.length === 0 && <div className="catalog-card">{label("No courses published yet.", "Курсы пока не опубликованы.", english)}</div>}
    </div>
  </section>;
}

export function Landing({ catalog, config, onAuth, loading = false }) {
  const [english, setEnglish] = useState(false);
  const [tab, setTab] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const t = (en, ru) => label(en, ru, english);
  function showTab(value) { setError(""); setPassword(""); setTab(value); }
  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    setPending(true); setError("");
    try { await onAuth(tab, { username: username.trim(), password, remember, invite_code: invite }); }
    catch (err) { setError(err.message || t("Unable to sign in", "Не удалось войти")); }
    finally { setPending(false); }
  }
  return <div className="landing-root">
    <header className="landing-header"><a href="#top" className="landing-logo" aria-label="Learning Workspace">
      <span className="landing-symbol">L<span>✳</span></span><strong>LEARNING<span>/</span>WORKSPACE</strong></a>
      <nav className="landing-nav" aria-label="Navigation">
        <a href="#catalog">{t("Courses", "Курсы")}</a>
        <button className="landing-lang" onClick={() => setEnglish(!english)} aria-label="Switch language">{english ? "RU" : "EN"}</button>
        <button className="landing-signin" onClick={() => showTab("login")}>{t("Sign in", "Войти")} <ArrowRight size={14}/></button>
      </nav>
    </header>
    <main id="top">
      <div className="landing-hero">
        <div className="landing-hero-copy"><div className="landing-kicker"><span className="landing-signal"/> YOUR PERSONAL LEARNING SYSTEM <span>01 / 03</span></div>
          <p className="landing-index">LEARN WITH INTENTION / BUILD WITH CLARITY</p>
          <h1>{t("Learn deeply.", "Учись глубже.")}<br/><em>{t("Move forward.", "Двигайся дальше.")}</em></h1>
          <p className="landing-subtitle">{t("A quiet place to think, practice and make real progress. Keep your notes, track focus time and learn with an AI mentor.", "Тихое пространство для практики и настоящего прогресса. Заметки, фокус-сессии, календарь и AI-наставник — всё в одном месте.")}</p>
          <div className="landing-actions">
            <button className="primary" onClick={() => showTab(config.registration_enabled ? "register" : "login")}>{t("Start learning", "Начать обучение")} <ArrowUpRight size={17}/></button>
            <a href="#catalog" className="secondary">{t("Explore courses", "Посмотреть курсы")} <ArrowRight size={16}/></a>
          </div>
          <div className="landing-hero-foot"><span><ShieldCheck size={14}/> {t("Personal progress", "Личный прогресс")}</span><span><Sparkles size={14}/> {t("AI-assisted learning", "AI-наставник")}</span><span><Clock3 size={14}/> {t("Focus insights", "Статистика фокуса")}</span></div>
        </div>
        <div className="landing-visual" aria-hidden="true"><div className="landing-pixel-field">
          {Array.from({ length: 17 * 17 }, (_, i) => {
            const x = i % 17; const y = Math.floor(i / 17);
            const active = ((x >= 3 && x <= 5 || x >= 11 && x <= 13) && y >= 3 && y <= 11)
              || (x >= 6 && x <= 10 && y >= 9 && y <= 11)
              || (y >= 12 && y <= 14 && x >= 4 && x <= 12);
            return <span key={i} className={active ? "pixel-hot pixel-shade-" + (i % 4) : ""}/>;
          })}</div><div className="landing-visual-code">01 / UNDERSTAND<br/>02 / PRACTICE<br/>03 / GROW</div>
          <div className="landing-visual-footer">A BETTER ROUTINE, ONE DAY AT A TIME.</div></div>
      </div>
      <div className="landing-marquee"><span>DEEP WORK</span><b>✳</b><span>PRACTICE FIRST</span><b>✳</b><span>NO DISTRACTIONS</span><b>✳</b><span>VISIBLE PROGRESS</span></div>
      <div id="catalog" className="landing-catalog-wrap"><CatalogView courses={catalog} english={english} guest onStart={() => showTab(config.registration_enabled ? "register" : "login")} /></div>
      <section className="landing-bottom"><span>LEARNING / WORKSPACE</span><h2>{t("Make today count.", "Сделай сегодня важным.")}</h2><button className="primary" onClick={() => showTab("login")}>{t("Enter your workspace", "Войти в пространство")} <ArrowRight size={17}/></button></section>
    </main>
    <footer className="landing-footer"><span>LEARNING/WORKSPACE © 2026</span><span>{t("Thoughtfully built for focused learning", "Создано для вдумчивого обучения")}</span></footer>
    {tab && <div className="auth-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) showTab(""); }}>
      <section className="auth-dialog" role="dialog" aria-modal="true" aria-label={tab === "login" ? t("Sign in", "Вход") : t("Create account", "Регистрация")}>
        <button className="auth-close" onClick={() => showTab("")} aria-label={t("Close", "Закрыть")}><X size={19}/></button>
        <span className="eyebrow">ACCESS / {tab === "login" ? "SIGN IN" : "CREATE ACCOUNT"}</span>
        <h2>{tab === "login" ? t("Welcome back.", "С возвращением.") : t("Your journey starts here.", "Твой путь начинается здесь.")}</h2>
        <p>{tab === "login" ? t("Your progress is right where you left it.", "Твой прогресс сохранился. Продолжай с того же места.") : t("Create a separate personal workspace. Your data stays yours.", "Создай личное пространство — прогресс, заметки и чаты будут только твоими.")}</p>
        <form onSubmit={submit} className="auth-form">
          <label>{t("Username", "Имя пользователя")}<input autoComplete="username" name="username" minLength={3} maxLength={32} required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your_username" autoFocus/></label>
          <label>{t("Password", "Пароль")}<input autoComplete={tab === "login" ? "current-password" : "new-password"} type="password" name="password" minLength={tab === "login" ? 1 : 12} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={tab === "login" ? "••••••••••••" : t("12+ characters", "От 12 символов")}/></label>
          {tab === "register" && config.invite_required && <label>{t("Invitation code", "Код приглашения")}<input autoComplete="off" value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="invite-..." required/></label>}
          <label className="auth-remember"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}/>{t("Keep me signed in for 30 days", "Оставаться в системе 30 дней")}</label>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="primary auth-submit" type="submit" disabled={pending || loading}>{pending ? t("Please wait…", "Подключаем…") : tab === "login" ? t("Sign in", "Войти") : t("Create account", "Создать аккаунт")} <ArrowRight size={17}/></button>
        </form>
        {config.registration_enabled && <button className="auth-alternate" onClick={() => showTab(tab === "login" ? "register" : "login")}>
          {tab === "login" ? t("New here? Create an account", "Впервые здесь? Зарегистрироваться") : t("Already have an account? Sign in", "Есть аккаунт? Войти")}
        </button>}
        {!config.registration_enabled && <p className="auth-invite-note"><LockKeyhole size={14}/> {t("Registration is available by invitation from the platform owner.", "Регистрация пока закрыта владельцем платформы.")}</p>}
      </section>
    </div>}
  </div>;
}
