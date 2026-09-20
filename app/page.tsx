"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  FileText,
  ArrowRight,
  ChevronLeft,
  Clock3,
  Download,
  FileUp,
  Flag,
  GripVertical,
  Menu,
  LayoutDashboard,
  Pause,
  Play,
  Plus,
  RotateCcw,
  ScrollText,
  Settings2,
  Trash2,
  Users,
  Vote,
  X,
} from "lucide-react";
import { t } from "@/lib/i18n";
import { voteResult } from "@/lib/majority";
import { download, isSession, loadSessions, saveSessions } from "@/lib/storage";
import type {
  Language,
  MajorityKind,
  Session,
  SessionEvent,
  Vote as VoteData,
} from "@/lib/types";

type View =
  "overview" | "speakers" | "caucus" | "motions" | "voting" | "log" | "settings";
const id = () => crypto.randomUUID();
const stamp = () => new Date().toISOString();
const fmt = (seconds: number) =>
  `${String((Math.max(0, Math.floor(seconds)) / 60) | 0).padStart(2, "0")}:${String(Math.max(0, Math.floor(seconds)) % 60).padStart(2, "0")}`;
const humanTime = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
function playBell() {
  const Audio = window.AudioContext;
  if (!Audio) return;
  const context = new Audio();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = 660;
  gain.gain.setValueAtTime(0.08, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.35);
}

function freshSession(input: {
  conference: string;
  committee: string;
  topic: string;
  language: Language;
  chair: string;
  speech: number;
  delegationText: string;
}): Session {
  const delegations = input.delegationText
    .split("\n")
    .map((name) => name.trim())
    .filter(Boolean)
    .filter(
      (name, index, all) =>
        all.findIndex((item) => item.toLocaleLowerCase() === name.toLocaleLowerCase()) ===
        index,
    )
    .map((name) => ({ id: id(), name, present: true }));
  return {
    version: 1,
    id: id(),
    conference: input.conference,
    committee: input.committee,
    topic: input.topic,
    date: new Date().toISOString().slice(0, 10),
    language: input.language,
    chair: input.chair,
    defaultSpeechSeconds: input.speech,
    soundEnabled: false,
    delegations,
    speakers: [],
    motions: [],
    votes: [],
    caucuses: [],
    events: [{ id: id(), at: stamp(), type: "session", description: "Session created" }],
    timer: { running: false, remainingSeconds: input.speech },
    updatedAt: stamp(),
  };
}

function event(
  session: Session,
  type: SessionEvent["type"],
  description: string,
  delegation?: string,
): Session {
  return {
    ...session,
    updatedAt: stamp(),
    events: [
      { id: id(), at: stamp(), type, description, delegation },
      ...session.events,
    ].slice(0, 300),
  };
}

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<View>("overview");
  const [sidebar, setSidebar] = useState(true);
  const [clock, setClock] = useState(Date.now());
  const [notice, setNotice] = useState("");
  const language = session?.language ?? "en";
  const copy = t(language);
  const storageError = copy.storageError;

  useEffect(() => {
    setSessions(loadSessions());
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!session) return;
    setSessions((previous) => [
      session,
      ...previous.filter((item) => item.id !== session.id),
    ]);
  }, [session]);
  useEffect(() => {
    if (sessions.length > 0 && !saveSessions(sessions)) setNotice(storageError);
  }, [sessions, storageError]);
  useEffect(() => {
    if (!session?.timer.running || !session.timer.endsAt) return;
    if (session.timer.endsAt > clock) return;
    if (session.soundEnabled) playBell();
    update((draft) =>
      event(
        { ...draft, timer: { running: false, remainingSeconds: 0 } },
        "speaker",
        "Speech time expired",
      ),
    );
  }, [clock, session?.timer.endsAt, session?.timer.running, session?.soundEnabled]);
  useEffect(() => {
    const listener = (e: globalThis.KeyboardEvent) => {
      if (
        !session ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        toggleTimer();
      }
      if (e.key === "ArrowRight") nextSpeaker();
      if (e.key.toLowerCase() === "a") {
        setView("speakers");
        document.getElementById("speaker-input")?.focus();
      }
      if (e.key.toLowerCase() === "r") resetTimer();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  });
  const update = (action: (current: Session) => Session) =>
    setSession((current) => (current ? action(current) : current));
  const remaining = useMemo(
    () =>
      !session
        ? 0
        : session.timer.running && session.timer.endsAt
          ? Math.max(0, Math.ceil((session.timer.endsAt - clock) / 1000))
          : session.timer.remainingSeconds,
    [clock, session],
  );
  const current = session
    ? session.speakers.find((speaker) => speaker.status === "speaking")
    : undefined;
  const currentName =
    session && current
      ? session.delegations.find((d) => d.id === current.delegationId)?.name
      : undefined;

  function toggleTimer() {
    update((draft) => ({
      ...draft,
      timer: draft.timer.running
        ? { running: false, remainingSeconds: remaining }
        : {
            running: true,
            remainingSeconds: draft.timer.remainingSeconds,
            endsAt: Date.now() + draft.timer.remainingSeconds * 1000,
          },
    }));
  }
  function resetTimer() {
    update((draft) => ({
      ...draft,
      timer: { running: false, remainingSeconds: draft.defaultSpeechSeconds },
    }));
  }
  function addTime() {
    update((draft) => ({
      ...draft,
      timer: {
        running: draft.timer.running,
        remainingSeconds: remaining + 15,
        endsAt: draft.timer.running ? Date.now() + (remaining + 15) * 1000 : undefined,
      },
    }));
  }
  function nextSpeaker() {
    update((draft) => {
      const queued = draft.speakers.find((speaker) => speaker.status === "queued");
      const speakers = draft.speakers.map((speaker) =>
        speaker.status === "speaking"
          ? {
              ...speaker,
              status: "done" as const,
              elapsedSeconds: draft.defaultSpeechSeconds - remaining,
            }
          : speaker,
      );
      if (!queued)
        return event(
          {
            ...draft,
            speakers,
            timer: { running: false, remainingSeconds: draft.defaultSpeechSeconds },
          },
          "speaker",
          "Speaker queue completed",
        );
      const next = speakers.map((speaker) =>
        speaker.delegationId === queued.delegationId
          ? { ...speaker, status: "speaking" as const }
          : speaker,
      );
      const name = draft.delegations.find(
        (delegation) => delegation.id === queued.delegationId,
      )?.name;
      return event(
        {
          ...draft,
          speakers: next,
          timer: { running: false, remainingSeconds: draft.defaultSpeechSeconds },
        },
        "speaker",
        `Now speaking: ${name ?? "Delegation"}`,
        name,
      );
    });
  }
  function createSession(input: Parameters<typeof freshSession>[0]) {
    setSession(freshSession(input));
    setView("overview");
  }
  function importFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result));
        if (!isSession(parsed)) throw new Error();
        setSession(parsed);
        setNotice(t(parsed.language).sessionImported);
      } catch {
        setNotice(t("en").invalidSession);
      }
    };
    reader.readAsText(file);
  }
  function exportLog() {
    if (!session) return;
    const rows = [
      "Time,Type,Description,Delegation",
      ...session.events.map((item) =>
        [item.at, item.type, item.description, item.delegation ?? ""]
          .map((value) => `"${value.replaceAll('"', '""')}"`)
          .join(","),
      ),
    ];
    download("openchair-session-log.csv", rows.join("\n"), "text/csv");
  }

  if (!session)
    return (
      <Landing
        sessions={sessions}
        onOpen={(saved) => {
          setSession(saved);
          setNotice(copy.sessionOpened);
        }}
        onImport={importFile}
        notice={notice}
        createSession={createSession}
      />
    );
  const navigation: { key: View; icon: typeof Users }[] = [
    { key: "overview", icon: LayoutDashboard },
    { key: "speakers", icon: Users },
    { key: "caucus", icon: Clock3 },
    { key: "motions", icon: Flag },
    { key: "voting", icon: Vote },
    { key: "log", icon: ScrollText },
    { key: "settings", icon: Settings2 },
  ];
  return (
    <main className="workspace">
      <aside
        className={`sidebar ${sidebar ? "" : "collapsed"}`}
        aria-label="Workspace navigation"
      >
        <div className="brand">
          <span className="brand-mark">OC</span>
          {sidebar && (
            <span>
              OpenChair <em>Lite</em>
            </span>
          )}
          <button
            className="icon-button mobile-only"
            onClick={() => setSidebar(false)}
            aria-label="Close navigation"
          >
            <X />
          </button>
        </div>
        {sidebar && (
          <div className="committee">
            <span>{copy.activeSession.toUpperCase()}</span>
            <strong>{session.committee}</strong>
            <small>{session.conference}</small>
          </div>
        )}
        <nav>
          {navigation.map(({ key, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={view === key ? "active" : ""}
            >
              <Icon />
              <span className={sidebar ? undefined : "sr-only"}>
                {copy[key === "log" ? "log" : key]}
              </span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button onClick={() => setSession(null)} aria-label={copy.back}>
            <ChevronLeft />
            {sidebar && copy.back}
          </button>
          <p>
            {sidebar && (
              <>
                <i />
                {copy.saved}
              </>
            )}
          </p>
          <button
            className="collapse"
            onClick={() => setSidebar(!sidebar)}
            aria-label="Toggle sidebar"
          >
            <Menu />
          </button>
        </div>
      </aside>
      <section className="app-main">
        <header className="app-header">
          <button
            className="icon-button"
            onClick={() => setSidebar(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </button>
          <div>
            <span className="eyebrow">{copy[view === "log" ? "log" : view]}</span>
            <h1>
              {view === "overview"
                ? session.topic || session.committee
                : copy[view === "log" ? "log" : view]}
            </h1>
          </div>
          <div className="header-actions">
            <button
              className="quiet"
              onClick={() => {
                download(
                  "openchair-session.json",
                  JSON.stringify(session, null, 2),
                  "application/json",
                );
                setNotice(copy.sessionExported);
              }}
            >
              <Download /> <span>{copy.exports}</span>
            </button>
            <label className="quiet">
              <FileUp /> <span>{copy.import}</span>
              <input
                type="file"
                accept="application/json"
                onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
              />
            </label>
          </div>
        </header>
        {notice && (
          <div className="notice" role="status">
            {notice}
            <button onClick={() => setNotice("")}>×</button>
          </div>
        )}
        {view === "overview" && (
          <Overview
            session={session}
            remaining={remaining}
            currentName={currentName}
            toggle={toggleTimer}
            next={nextSpeaker}
          />
        )}
        {view === "speakers" && (
          <Speakers
            session={session}
            remaining={remaining}
            currentName={currentName}
            toggle={toggleTimer}
            reset={resetTimer}
            addTime={addTime}
            next={nextSpeaker}
            update={update}
          />
        )}
        {view === "caucus" && <Caucus session={session} update={update} />}
        {view === "motions" && <Motions session={session} update={update} />}
        {view === "voting" && <Voting session={session} update={update} />}
        {view === "log" && (
          <Log session={session} update={update} exportLog={exportLog} />
        )}
        {view === "settings" && (
          <Settings session={session} update={update} end={() => setSession(null)} />
        )}
      </section>
      <EventRail language={session.language} events={session.events.slice(0, 6)} />
    </main>
  );
}

function Landing({
  sessions,
  onOpen,
  onImport,
  notice,
  createSession,
}: {
  sessions: Session[];
  onOpen: (session: Session) => void;
  onImport: (file: File) => void;
  notice: string;
  createSession: (input: Parameters<typeof freshSession>[0]) => void;
}) {
  const [form, setForm] = useState({
    conference: "",
    committee: "",
    topic: "",
    language: "en" as Language,
    chair: "",
    speech: 90,
    delegationText: "",
  });
  const [open, setOpen] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.conference || !form.committee) return;
    createSession(form);
  };
  return (
    <main className="landing">
      <header className="landing-header">
        <div className="brand">
          <span className="brand-mark">OC</span>
          <span>
            OpenChair <em>Lite</em>
          </span>
        </div>
        <nav>
          <a href="#product">Product</a>
          <a href="#features">Features</a>
          <a href="#open-source">Open Source</a>
          <a href="#about">About</a>
        </nav>
        <button className="button dark" onClick={() => setOpen(true)}>
          Open workspace <ArrowRight />
        </button>
      </header>
      <section className="hero" id="product">
        <div>
          <p className="eyebrow">OFFLINE-FIRST / MUN CHAIRING</p>
          <h1>
            Run the room.
            <br />
            Keep the debate moving.
          </h1>
          <p className="lead">
            An offline-first workspace for Model United Nations chairs to manage speakers,
            motions, caucuses and votes.
          </p>
          <div className="hero-actions">
            <button className="button dark" onClick={() => setOpen(true)}>
              Start a session <ArrowRight />
            </button>
            <a
              className="button line"
              href="https://github.com/saul1704rm-max/openchair-lite"
              target="_blank"
              rel="noreferrer"
            >
              View on GitHub
            </a>
          </div>
        </div>
        <ProductPreview />
      </section>
      <section className="features" id="features">
        <Feature
          number="01"
          title="Speaker management"
          text="A visible queue and an accurate timer keep the floor moving."
        />
        <Feature
          number="02"
          title="Parliamentary motions"
          text="Record proposals without imposing rules your conference does not use."
        />
        <Feature
          number="03"
          title="Accurate voting"
          text="Make the voting base explicit and see the threshold before you call it."
        />
        <Feature
          number="04"
          title="Offline reliability"
          text="Sessions stay on this device, with export whenever you need a copy."
        />
      </section>
      {sessions.length > 0 && (
        <section className="saved-sessions">
          <div>
            <p className="eyebrow">SAVED ON THIS DEVICE</p>
            <h2>Resume a session.</h2>
          </div>
          <div>
            {sessions.map((item) => (
              <button key={item.id} onClick={() => onOpen(item)}>
                <span>{item.committee}</span>
                <small>
                  {item.conference} · updated{" "}
                  {new Intl.DateTimeFormat(undefined, {
                    month: "short",
                    day: "numeric",
                  }).format(new Date(item.updatedAt))}
                </small>
                <ArrowRight />
              </button>
            ))}
          </div>
        </section>
      )}
      <section className="open-source" id="open-source">
        <p className="eyebrow">OPEN SOURCE</p>
        <h2>Your session stays yours.</h2>
        <p>
          OpenChair Lite is free to use. It needs no account, keeps data on the device and
          continues working without an internet connection. The project welcomes
          contributions from the MUN community.
        </p>
      </section>
      <footer id="about">
        <span>OpenChair Lite</span>
        <div>
          <a href="https://github.com/saul1704rm-max/openchair-lite">GitHub</a>
          <a href="#">Documentation</a>
          <a href="#">Contributing</a>
          <a href="#">MIT License</a>
          <a href="#">Privacy</a>
        </div>
        <p>
          OpenChair Lite is an independent open-source project and is not affiliated with
          the United Nations.
        </p>
      </footer>
      {(open || notice === "new") && (
        <div className="modal-backdrop" role="presentation">
          <form className="session-form" onSubmit={submit}>
            <button
              type="button"
              className="close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X />
            </button>
            <p className="eyebrow">NEW SESSION</p>
            <h2>Set the room.</h2>
            <div className="form-grid">
              <Field
                label="Conference"
                value={form.conference}
                onChange={(value) => setForm({ ...form, conference: value })}
                required
              />
              <Field
                label="Committee"
                value={form.committee}
                onChange={(value) => setForm({ ...form, committee: value })}
                required
              />
              <Field
                label="Committee topic"
                value={form.topic}
                onChange={(value) => setForm({ ...form, topic: value })}
              />
              <Field
                label="Chair / director"
                value={form.chair}
                onChange={(value) => setForm({ ...form, chair: value })}
              />
              <label>
                Interface language
                <select
                  value={form.language}
                  onChange={(e) =>
                    setForm({ ...form, language: e.target.value as Language })
                  }
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </label>
              <label>
                Default speech time (seconds)
                <input
                  type="number"
                  min="15"
                  value={form.speech}
                  onChange={(e) =>
                    setForm({ ...form, speech: Number(e.target.value) || 90 })
                  }
                />
              </label>
              <label className="wide">
                Delegations <small>Paste one country per line.</small>
                <textarea
                  value={form.delegationText}
                  onChange={(e) => setForm({ ...form, delegationText: e.target.value })}
                  placeholder={"Argentina\nBrazil\nCanada"}
                />
              </label>
            </div>
            <div className="form-footer">
              <label className="import-link">
                Load saved session
                <input
                  type="file"
                  accept="application/json"
                  onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
                />
              </label>
              <button className="button dark" type="submit">
                Create workspace <ArrowRight />
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label>
      {label}
      {required && <b> *</b>}
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function Feature({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <article>
      <span>{number}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}
function ProductPreview() {
  return (
    <div className="product-preview">
      <div className="preview-top">
        <span>OC / Security Council</span>
        <i>Saved locally</i>
      </div>
      <div className="preview-content">
        <p className="eyebrow">GENERAL SPEAKERS LIST</p>
        <div className="preview-clock">01:30</div>
        <p>Brazil is at the floor</p>
        <div className="preview-row active-row">
          <b>01</b>
          <span>Brazil</span>
          <small>speaking</small>
        </div>
        <div className="preview-row">
          <b>02</b>
          <span>Canada</span>
          <small>queued</small>
        </div>
        <div className="preview-row">
          <b>03</b>
          <span>Kenya</span>
          <small>queued</small>
        </div>
      </div>
    </div>
  );
}
function Overview({
  session,
  remaining,
  currentName,
  toggle,
  next,
}: {
  session: Session;
  remaining: number;
  currentName?: string;
  toggle: () => void;
  next: () => void;
}) {
  const copy = t(session.language);
  const queued = session.speakers.filter((speaker) => speaker.status === "queued").length;
  return (
    <div className="page overview">
      <section className="overview-hero">
        <div>
          <p className="eyebrow">{copy.sessionInProgress}</p>
          <h2>{session.committee}</h2>
          <p>{session.topic || "No topic has been set."}</p>
        </div>
        <div className="metric">
          <span>{copy.delegationsMetric}</span>
          <strong>{session.delegations.length}</strong>
        </div>
        <div className="metric">
          <span>{copy.queue}</span>
          <strong>{queued}</strong>
        </div>
      </section>
      <section className="overview-grid">
        <TimerCard
          language={session.language}
          remaining={remaining}
          name={currentName}
          running={session.timer.running}
          onToggle={toggle}
          onNext={next}
        />
        <div className="panel">
          <div className="panel-heading">
            <p className="eyebrow">{copy.nextUp}</p>
            <button className="text-button">{copy.viewQueue}</button>
          </div>
          {session.speakers
            .filter((speaker) => speaker.status === "queued")
            .slice(0, 4)
            .map((speaker, index) => (
              <div className="list-row" key={speaker.delegationId}>
                <b>{String(index + 1).padStart(2, "0")}</b>
                <span>
                  {
                    session.delegations.find((item) => item.id === speaker.delegationId)
                      ?.name
                  }
                </span>
                <small>{copy.queued}</small>
              </div>
            ))}
          {queued === 0 && <Empty text={copy.addToQueue} />}
        </div>
      </section>
    </div>
  );
}
function TimerCard({
  language,
  remaining,
  name,
  running,
  onToggle,
  onNext,
}: {
  language: Language;
  remaining: number;
  name?: string;
  running: boolean;
  onToggle: () => void;
  onNext: () => void;
}) {
  const copy = t(language);
  return (
    <section className={`timer-card ${remaining <= 10 ? "urgent" : ""}`}>
      <p className="eyebrow">{name ? copy.currentSpeaker : copy.speakerTimer}</p>
      <h2>{name ?? copy.readyWhenYouAre}</h2>
      <output>{fmt(remaining)}</output>
      <div>
        <button className="button light" onClick={onToggle}>
          {running ? <Pause /> : <Play />}
          {running ? copy.pause : copy.startTimer}
        </button>
        <button className="button line" onClick={onNext}>
          {copy.nextAction} <ArrowRight />
        </button>
      </div>
    </section>
  );
}

function Speakers({
  session,
  remaining,
  currentName,
  toggle,
  reset,
  addTime,
  next,
  update,
}: {
  session: Session;
  remaining: number;
  currentName?: string;
  toggle: () => void;
  reset: () => void;
  addTime: () => void;
  next: () => void;
  update: (action: (session: Session) => Session) => void;
}) {
  const copy = t(session.language);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const presentCount = session.delegations.filter((item) => item.present).length;
  const available = session.delegations.filter((item) =>
    item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  const add = (delegationId: string) =>
    update((draft) => {
      if (
        draft.speakers.some(
          (speaker) => speaker.delegationId === delegationId && speaker.status !== "done",
        )
      )
        return draft;
      const delegation = draft.delegations.find((item) => item.id === delegationId);
      return event(
        {
          ...draft,
          speakers: [
            ...draft.speakers,
            { delegationId, status: "queued", elapsedSeconds: 0 },
          ],
        },
        "speaker",
        `Added to speakers list: ${delegation?.name ?? "Delegation"}`,
        delegation?.name,
      );
    });
  const addNew = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = session.delegations.find(
      (item) => item.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) {
      add(existing.id);
      setName("");
      return;
    }
    const delegationId = id();
    update((draft) =>
      event(
        {
          ...draft,
          delegations: [
            ...draft.delegations,
            { id: delegationId, name: trimmed, present: true },
          ],
          speakers: [
            ...draft.speakers,
            { delegationId, status: "queued", elapsedSeconds: 0 },
          ],
        },
        "speaker",
        `Added delegation and speaker: ${trimmed}`,
        trimmed,
      ),
    );
    setName("");
  };
  return (
    <div className="page speakers-page">
      <div className="speakers-layout">
        <section>
          <div className="section-header">
            <div>
              <p className="eyebrow">{copy.speakersList}</p>
              <h2>{copy.floorQueue}</h2>
            </div>
            <form className="inline-form" onSubmit={addNew}>
              <input
                id="speaker-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={copy.addDelegation}
              />
              <button className="button dark">
                <Plus /> {copy.add}
              </button>
            </form>
          </div>
          <section className="attendance-panel" aria-labelledby="roll-call-heading">
            <div className="panel-heading">
              <div>
                <p className="eyebrow" id="roll-call-heading">
                  {copy.rollCall}
                </p>
                <small className="muted">
                  {presentCount}/{session.delegations.length}{" "}
                  {copy.present.toLocaleLowerCase()}
                </small>
              </div>
              <span className="attendance-count">{presentCount}</span>
            </div>
            <div className="attendance-grid">
              {session.delegations.map((delegation) => (
                <button
                  type="button"
                  key={delegation.id}
                  className={delegation.present ? "present" : "absent"}
                  aria-pressed={delegation.present}
                  aria-label={`${delegation.present ? copy.markAbsent : copy.markPresent}: ${delegation.name}`}
                  onClick={() =>
                    update((draft) =>
                      event(
                        {
                          ...draft,
                          delegations: draft.delegations.map((item) =>
                            item.id === delegation.id
                              ? { ...item, present: !item.present }
                              : item,
                          ),
                        },
                        "session",
                        `${delegation.name}: ${delegation.present ? copy.absent : copy.present}`,
                        delegation.name,
                      ),
                    )
                  }
                >
                  <span>{delegation.name}</span>
                  <small>{delegation.present ? copy.present : copy.absent}</small>
                </button>
              ))}
            </div>
          </section>
          <div className="speaker-table" role="table">
            <div className="table-head">
              <span>#</span>
              <span>{copy.delegations}</span>
              <span>{copy.used}</span>
              <span>{copy.status}</span>
              <span />
            </div>
            {session.speakers.map((speaker, index) => {
              const delegation = session.delegations.find(
                (item) => item.id === speaker.delegationId,
              );
              return (
                <div className={`table-row ${speaker.status}`} key={speaker.delegationId}>
                  <span className="grip">
                    <GripVertical />
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{delegation?.name}</span>
                  <span>
                    {speaker.status === "speaking"
                      ? fmt(session.defaultSpeechSeconds - remaining)
                      : fmt(speaker.elapsedSeconds)}
                  </span>
                  <span>
                    <mark>{copy[speaker.status]}</mark>
                  </span>
                  <button
                    className="icon-button"
                    onClick={() =>
                      update((draft) => ({
                        ...draft,
                        speakers: draft.speakers.filter(
                          (item) => item.delegationId !== speaker.delegationId,
                        ),
                      }))
                    }
                    aria-label={`${copy.remove}: ${delegation?.name ?? copy.delegations}`}
                  >
                    <Trash2 />
                  </button>
                </div>
              );
            })}
            {session.speakers.length === 0 && <Empty text={copy.noQueue} />}
          </div>
        </section>
        <aside className="speaker-side">
          <TimerCard
            language={session.language}
            remaining={remaining}
            name={currentName}
            running={session.timer.running}
            onToggle={toggle}
            onNext={next}
          />
          <div className="timer-tools">
            <button onClick={reset}>
              <RotateCcw /> {copy.resetTimer}
            </button>
            <button onClick={addTime}>{copy.addTime}</button>
          </div>
          <div className="picker">
            <label>
              {copy.findDelegation}
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={copy.search}
              />
            </label>
            {available.slice(0, 7).map((item) => (
              <button key={item.id} onClick={() => add(item.id)}>
                <span>{item.name}</span>
                <Plus />
              </button>
            ))}
          </div>
          <p className="shortcut-help">{copy.shortcuts}</p>
        </aside>
      </div>
    </div>
  );
}

function Caucus({
  session,
  update,
}: {
  session: Session;
  update: (action: (session: Session) => Session) => void;
}) {
  const copy = t(session.language);
  const [topic, setTopic] = useState("");
  const [total, setTotal] = useState(600);
  const [individual, setIndividual] = useState(60);
  const [proposer, setProposer] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const active = session.caucuses.find((item) => item.active);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    const caucus = {
      id: id(),
      topic,
      totalSeconds: total,
      speakerSeconds: individual,
      proposer,
      participantIds,
      active: true,
    };
    update((draft) =>
      event(
        { ...draft, caucuses: [caucus, ...draft.caucuses] },
        "caucus",
        `Moderated caucus started: ${topic}`,
      ),
    );
    setTopic("");
    setProposer("");
    setParticipantIds([]);
  };
  return (
    <div className="page">
      <div className="section-header">
        <div>
          <p className="eyebrow">{copy.moderatedCaucus}</p>
          <h2>{copy.caucusHeading}</h2>
        </div>
      </div>
      {active ? (
        <section className="caucus-active">
          <div>
            <span>{copy.activeCaucus}</span>
            <h3>{active.topic}</h3>
            <p>
              {fmt(active.totalSeconds)} · {fmt(active.speakerSeconds)}{" "}
              {copy.individualTime.toLocaleLowerCase()} · {active.participantIds.length}{" "}
              {copy.participants.toLocaleLowerCase()}
            </p>
          </div>
          <button
            className="button dark"
            onClick={() =>
              update((draft) =>
                event(
                  {
                    ...draft,
                    caucuses: draft.caucuses.map((item) =>
                      item.id === active.id ? { ...item, active: false } : item,
                    ),
                  },
                  "caucus",
                  `Caucus concluded: ${active.topic}`,
                ),
              )
            }
          >
            {copy.finishCaucus}
          </button>
        </section>
      ) : (
        <form className="structured-form" onSubmit={submit}>
          <Field label={copy.topic} value={topic} onChange={setTopic} required />
          <label>
            {copy.totalDuration}
            <input
              type="number"
              min="30"
              value={total}
              onChange={(e) => setTotal(Number(e.target.value) || 600)}
            />
          </label>
          <label>
            {copy.individualTime}
            <input
              type="number"
              min="10"
              value={individual}
              onChange={(e) => setIndividual(Number(e.target.value) || 60)}
            />
          </label>
          <label>
            {copy.proposer}
            <select value={proposer} onChange={(e) => setProposer(e.target.value)}>
              <option value="">—</option>
              {session.delegations.map((delegation) => (
                <option key={delegation.id} value={delegation.name}>
                  {delegation.name}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="participants-fieldset">
            <legend>{copy.participants}</legend>
            {session.delegations.map((delegation) => (
              <label key={delegation.id}>
                <input
                  type="checkbox"
                  checked={participantIds.includes(delegation.id)}
                  onChange={(e) =>
                    setParticipantIds((current) =>
                      e.target.checked
                        ? [...current, delegation.id]
                        : current.filter((item) => item !== delegation.id),
                    )
                  }
                />
                {delegation.name}
              </label>
            ))}
          </fieldset>
          <button className="button dark">
            {copy.startCaucus} <ArrowRight />
          </button>
        </form>
      )}
      <section className="history-section">
        <p className="eyebrow">{copy.recentCaucuses}</p>
        {session.caucuses
          .filter((item) => !item.active)
          .map((item) => (
            <div className="list-row" key={item.id}>
              <span>{item.topic}</span>
              <small>
                {fmt(item.totalSeconds)} · {copy.done.toLocaleLowerCase()}
              </small>
            </div>
          ))}
        {session.caucuses.length === 0 && <Empty text={copy.noCaucuses} />}
      </section>
    </div>
  );
}

function Motions({
  session,
  update,
}: {
  session: Session;
  update: (action: (session: Session) => Session) => void;
}) {
  const copy = t(session.language);
  const [topic, setTopic] = useState("");
  const [type, setType] = useState("Moderated caucus");
  const [proposer, setProposer] = useState("");
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    const motion = {
      id: id(),
      type,
      proposer,
      topic,
      duration: 0,
      speakerTime: 0,
      status: "pending" as const,
      notes: "",
      createdAt: stamp(),
    };
    update((draft) =>
      event(
        { ...draft, motions: [motion, ...draft.motions] },
        "motion",
        `Motion submitted: ${type} — ${topic}`,
      ),
    );
    setTopic("");
    setProposer("");
  };
  return (
    <div className="page">
      <div className="section-header">
        <div>
          <p className="eyebrow">{copy.parliamentaryMotions}</p>
          <h2>{copy.motionsHeading}</h2>
        </div>
      </div>
      <form className="structured-form motion-form" onSubmit={add}>
        <label>
          {copy.motionType}
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option>Moderated caucus</option>
            <option>Unmoderated caucus</option>
            <option>Introduce draft resolution</option>
            <option>Close debate</option>
            <option>Custom motion</option>
          </select>
        </label>
        <Field label={copy.topicTerms} value={topic} onChange={setTopic} required />
        <label>
          {copy.proposer}
          <select value={proposer} onChange={(e) => setProposer(e.target.value)}>
            <option value="">—</option>
            {session.delegations.map((delegation) => (
              <option key={delegation.id} value={delegation.name}>
                {delegation.name}
              </option>
            ))}
          </select>
        </label>
        <button className="button dark">
          {copy.addMotion} <Plus />
        </button>
      </form>
      <div className="motion-list">
        {session.motions.map((motion) => (
          <article key={motion.id}>
            <div>
              <span className="eyebrow">{motion.type}</span>
              <h3>{motion.topic}</h3>
              <p>
                {copy.submitted} {humanTime(motion.createdAt)}
                {motion.proposer ? ` · ${motion.proposer}` : ""}
              </p>
            </div>
            <div className="motion-actions">
              <select
                value={motion.status}
                onChange={(e) =>
                  update((draft) =>
                    event(
                      {
                        ...draft,
                        motions: draft.motions.map((item) =>
                          item.id === motion.id
                            ? { ...item, status: e.target.value as typeof item.status }
                            : item,
                        ),
                      },
                      "motion",
                      `Motion ${e.target.value}: ${motion.topic}`,
                    ),
                  )
                }
              >
                <option value="pending">{copy.pending}</option>
                <option value="approved">{copy.approved}</option>
                <option value="rejected">{copy.rejected}</option>
                <option value="withdrawn">{copy.withdrawn}</option>
              </select>
              <mark className={motion.status}>{motion.status}</mark>
            </div>
          </article>
        ))}
        {session.motions.length === 0 && <Empty text={copy.noMotions} />}
      </div>
    </div>
  );
}

function Voting({
  session,
  update,
}: {
  session: Session;
  update: (action: (session: Session) => Session) => void;
}) {
  const copy = t(session.language);
  const [title, setTitle] = useState("");
  const [basis, setBasis] = useState<VoteData["basis"]>("present-voting");
  const [majority, setMajority] = useState<MajorityKind>("simple");
  const [votesFor, setFor] = useState(0);
  const [against, setAgainst] = useState(0);
  const [abstain, setAbstain] = useState(0);
  const [custom, setCustom] = useState(50);
  const registered = session.delegations.length;
  const presentCount = session.delegations.filter((item) => item.present).length;
  const absent = registered - presentCount;
  const draft = {
    id: "draft",
    title,
    basis,
    majority,
    customPercent: custom,
    for: votesFor,
    against,
    abstain,
    absent,
    createdAt: stamp(),
  };
  const result = voteResult(draft, registered, presentCount);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const entry = { ...draft, id: id() };
    update((current) =>
      event(
        { ...current, votes: [entry, ...current.votes] },
        "vote",
        `${title}: ${result.approved ? "approved" : "rejected"} (${votesFor} in favour; ${result.needed} required)`,
      ),
    );
    setTitle("");
    setFor(0);
    setAgainst(0);
    setAbstain(0);
  };
  return (
    <div className="page vote-page">
      <div className="section-header">
        <div>
          <p className="eyebrow">{copy.voting}</p>
          <h2>{copy.votingHeading}</h2>
        </div>
      </div>
      <form className="vote-form" onSubmit={submit}>
        <section>
          <Field label={copy.proposal} value={title} onChange={setTitle} required />
          <div className="form-grid">
            <label>
              {copy.calculationBase}
              <select
                value={basis}
                disabled={majority === "absolute"}
                onChange={(e) => setBasis(e.target.value as VoteData["basis"])}
              >
                <option value="registered">{copy.allRegistered}</option>
                <option value="present">{copy.membersPresent}</option>
                <option value="present-voting">{copy.presentAndVoting}</option>
              </select>
              {majority === "absolute" && (
                <small className="muted">
                  {copy.absoluteMajority}: {copy.allRegistered.toLocaleLowerCase()}.
                </small>
              )}
            </label>
            <label>
              {copy.majority}
              <select
                value={majority}
                onChange={(e) => {
                  const value = e.target.value as MajorityKind;
                  setMajority(value);
                  if (value === "absolute") setBasis("registered");
                }}
              >
                <option value="simple">{copy.simpleMajority}</option>
                <option value="absolute">{copy.absoluteMajority}</option>
                <option value="two-thirds">{copy.twoThirds}</option>
                <option value="custom">{copy.customPercentage}</option>
              </select>
            </label>
            {majority === "custom" && (
              <label>
                {copy.requiredPercent}
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={custom}
                  onChange={(e) => setCustom(Number(e.target.value) || 50)}
                />
              </label>
            )}
          </div>
          <div className="vote-inputs">
            <NumberInput label={copy.inFavour} value={votesFor} set={setFor} />
            <NumberInput label={copy.against} value={against} set={setAgainst} />
            <NumberInput label={copy.abstentions} value={abstain} set={setAbstain} />
            <label className="roll-call-summary">
              {copy.absent}
              <output>{absent}</output>
              <small>{copy.rollCall}</small>
            </label>
          </div>
          <button className="button dark">
            {copy.recordVote} <Vote />
          </button>
        </section>
        <aside className={`result-card ${result.approved ? "approved" : "rejected"}`}>
          <span>{result.approved ? copy.approvedStatus : copy.pendingRejected}</span>
          <strong>{result.needed}</strong>
          <p>
            {copy.votesRequired} {result.base}
          </p>
          <small>
            {majority === "two-thirds"
              ? "ceil(2 × base / 3)"
              : majority === "custom"
                ? `ceil(base × ${custom}%)`
                : "floor(base / 2) + 1"}
          </small>
        </aside>
      </form>
      <section className="history-section">
        <p className="eyebrow">{copy.recordedVotes}</p>
        {session.votes.map((vote) => {
          const outcome = voteResult(vote, registered, presentCount);
          return (
            <div className="list-row" key={vote.id}>
              <span>{vote.title}</span>
              <small className={outcome.approved ? "ok" : "danger"}>
                {vote.for}–{vote.against} ·{" "}
                {outcome.approved ? copy.approved : copy.rejected}
              </small>
            </div>
          );
        })}
        {session.votes.length === 0 && <Empty text={copy.noVotes} />}
      </section>
    </div>
  );
}
function NumberInput({
  label,
  value,
  set,
}: {
  label: string;
  value: number;
  set: (value: number) => void;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => set(Math.max(0, Number(e.target.value) || 0))}
      />
    </label>
  );
}

function Log({
  session,
  update,
  exportLog,
}: {
  session: Session;
  update: (action: (session: Session) => Session) => void;
  exportLog: () => void;
}) {
  const copy = t(session.language);
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("all");
  const typeLabels: Record<string, string> = {
    speaker: copy.speakers,
    motion: copy.motions,
    caucus: copy.caucus,
    vote: copy.voting,
    note: copy.sessionLog,
  };
  const entries =
    filter === "all"
      ? session.events
      : session.events.filter((entry) => entry.type === filter);
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    update((draft) => event(draft, "note", note.trim()));
    setNote("");
  };
  return (
    <div className="page">
      <div className="section-header">
        <div>
          <p className="eyebrow">{copy.chronologicalRecord}</p>
          <h2>{copy.sessionLog}</h2>
        </div>
        <button className="quiet" onClick={exportLog}>
          <Download /> CSV
        </button>
      </div>
      <form className="inline-form note-form" onSubmit={add}>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={copy.addNotePlaceholder}
        />
        <button className="button dark">{copy.addNote}</button>
      </form>
      <div className="filters">
        <button
          className={filter === "all" ? "selected" : ""}
          onClick={() => setFilter("all")}
        >
          {copy.all}
        </button>
        {["speaker", "motion", "caucus", "vote", "note"].map((item) => (
          <button
            key={item}
            className={filter === item ? "selected" : ""}
            onClick={() => setFilter(item)}
          >
            {typeLabels[item] ?? item}
          </button>
        ))}
      </div>
      <div className="log-list">
        {entries.map((item) => (
          <article key={item.id}>
            <time>{humanTime(item.at)}</time>
            <div>
              <span className="eyebrow">{typeLabels[item.type] ?? item.type}</span>
              <p>{item.description}</p>
              {item.delegation && <small>{item.delegation}</small>}
            </div>
            <button
              className="icon-button"
              onClick={() => {
                if (confirm("Remove this session entry?"))
                  update((draft) => ({
                    ...draft,
                    events: draft.events.filter((entry) => entry.id !== item.id),
                  }));
              }}
              aria-label="Delete entry"
            >
              <Trash2 />
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function Settings({
  session,
  update,
  end,
}: {
  session: Session;
  update: (action: (session: Session) => Session) => void;
  end: () => void;
}) {
  const copy = t(session.language);
  return (
    <div className="page settings-page">
      <p className="eyebrow">{copy.sessionSettings}</p>
      <h2>{copy.preferencesData}</h2>
      <section className="setting-row">
        <div>
          <h3>{copy.language}</h3>
          <p>{copy.languageSaved}</p>
        </div>
        <select
          value={session.language}
          onChange={(e) =>
            update((draft) => ({ ...draft, language: e.target.value as Language }))
          }
        >
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </section>
      <section className="setting-row">
        <div>
          <h3>{copy.timerSound}</h3>
          <p>{copy.timerSoundHelp}</p>
        </div>
        <button
          className={session.soundEnabled ? "toggle on" : "toggle"}
          onClick={() =>
            update((draft) => ({ ...draft, soundEnabled: !draft.soundEnabled }))
          }
          aria-label="Toggle timer sound"
        >
          <i />
        </button>
      </section>
      <section className="setting-row danger-zone">
        <div>
          <h3>{copy.returnSessions}</h3>
          <p>{copy.localDataHelp}</p>
        </div>
        <button className="button line" onClick={end}>
          {copy.closeWorkspace}
        </button>
      </section>
    </div>
  );
}
function EventRail({ events, language }: { events: SessionEvent[]; language: Language }) {
  const copy = t(language);
  return (
    <aside className="event-rail">
      <p className="eyebrow">{copy.recentActivity}</p>
      {events.map((item) => (
        <article key={item.id}>
          <time>{humanTime(item.at)}</time>
          <p>{item.description}</p>
        </article>
      ))}
      {events.length === 0 && <p className="muted">{copy.noActivity}</p>}
    </aside>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <FileText />
      <p>{text}</p>
    </div>
  );
}
