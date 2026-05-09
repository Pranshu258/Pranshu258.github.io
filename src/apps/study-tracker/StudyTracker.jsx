import React, { useState, useEffect } from 'react';
import { FaBrain, FaGear } from 'react-icons/fa6';
import AppLayout from '../AppLayout';
import { PHASES, RESOURCES } from './data';
import './StudyTracker.css';

// ── Pure helpers ─────────────────────────────────────────────────

const taskId = (phaseId, weekNum, dayIdx) => `p${phaseId}_w${weekNum}_d${dayIdx}`;

const totalTasks = () =>
    PHASES.reduce((a, p) => a + p.weeks.reduce((b, w) => b + w.days.length, 0), 0);

const phaseProgress = (phase, checked) => {
    const total = phase.weeks.reduce((a, w) => a + w.days.length, 0);
    const done  = phase.weeks.reduce((a, w) =>
        a + w.days.filter((_, i) => checked[taskId(phase.id, w.week, i)]).length, 0);
    return { total, done, pct: total ? Math.round(done / total * 100) : 0 };
};

const currentWeekNum = (startDate) => {
    if (!startDate) return null;
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000));
    if (diff < 0) return null;
    return Math.min(diff + 1, 16);
};

const todayTaskId = (startDate) => {
    const wn = currentWeekNum(startDate);
    if (!wn) return null;
    const dayMap = { 1:'Mon', 2:'Tue', 3:'Wed', 4:'Thu', 5:'Fri', 6:'Sat', 0:'Sun' };
    const dayLabel = dayMap[new Date().getDay()];
    for (const p of PHASES) {
        for (const w of p.weeks) {
            if (w.week === wn) {
                const idx = w.days.findIndex(d => d.d === dayLabel);
                if (idx !== -1) return taskId(p.id, wn, idx);
            }
        }
    }
    return null;
};

const calcStreak = (startDate, checked) => {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const dayMap = { 1:'Mon', 2:'Tue', 3:'Wed', 4:'Thu', 5:'Fri', 6:'Sat', 0:'Sun' };
    let count = 0;
    for (let i = 0; i < 112; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        if (d > new Date()) break;
        const dayLabel = dayMap[d.getDay()];
        const wn = Math.floor(i / 7) + 1;
        for (const p of PHASES) {
            for (const w of p.weeks) {
                if (w.week === wn) {
                    const idx = w.days.findIndex(d2 => d2.d === dayLabel);
                    if (idx !== -1) {
                        if (checked[taskId(p.id, wn, idx)]) count++;
                        else count = 0;
                    }
                }
            }
        }
    }
    return count;
};

// Textarea with local state so it doesn't reset on parent re-renders
function NoteTextarea({ tid, initialValue, onSave }) {
    const [val, setVal] = useState(initialValue);
    return (
        <textarea
            className="st-note-textarea"
            placeholder="Notes, links, reflections…"
            value={val}
            onChange={e => setVal(e.target.value)}
            onBlur={() => onSave(tid, val)}
        />
    );
}

// ── Main component ───────────────────────────────────────────────
export default function StudyTracker() {
    const [checked, setChecked]     = useState(() => JSON.parse(localStorage.getItem('sp_checked') || '{}'));
    const [notes, setNotes]         = useState(() => JSON.parse(localStorage.getItem('sp_notes')   || '{}'));
    const [startDate, setStartDate] = useState(() => localStorage.getItem('sp_start') || '');
    const [name, setName]           = useState(() => localStorage.getItem('sp_name') || '');
    const [activePhase, setActivePhase]   = useState(1);
    const [collapsed, setCollapsed]       = useState({});
    const [expandedNotes, setExpandedNotes] = useState({});
    const [showModal, setShowModal] = useState(false);
    const [modalDate, setModalDate] = useState('');
    const [modalName, setModalName] = useState('');

    useEffect(() => { localStorage.setItem('sp_checked', JSON.stringify(checked)); }, [checked]);
    useEffect(() => { localStorage.setItem('sp_notes',   JSON.stringify(notes));   }, [notes]);
    useEffect(() => { localStorage.setItem('sp_start', startDate); }, [startDate]);
    useEffect(() => { localStorage.setItem('sp_name',  name);      }, [name]);

    useEffect(() => {
        const wn = currentWeekNum(startDate);
        if (wn) {
            for (const p of PHASES) {
                for (const w of p.weeks) {
                    if (w.week === wn) { setActivePhase(p.id); break; }
                }
            }
        }
        if (!startDate) {
            setModalDate(new Date().toISOString().split('T')[0]);
            setModalName('');
            setTimeout(() => setShowModal(true), 400);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Derived
    const total       = totalTasks();
    const done        = Object.values(checked).filter(Boolean).length;
    const pct         = Math.round(done / total * 100);
    const wn          = currentWeekNum(startDate);
    const todayId     = todayTaskId(startDate);
    const streakCount = calcStreak(startDate, checked);
    const phase       = PHASES.find(p => p.id === activePhase);
    const prog        = phaseProgress(phase, checked);

    const toggleTask  = (tid) => setChecked(prev => ({ ...prev, [tid]: !prev[tid] }));
    const toggleNote  = (tid) => setExpandedNotes(prev => ({ ...prev, [tid]: !prev[tid] }));
    const saveNote    = (tid, val) => setNotes(prev => ({ ...prev, [tid]: val }));
    const toggleWeek  = (weekNum) => setCollapsed(prev => ({ ...prev, [weekNum]: !prev[weekNum] }));

    const openSettings = () => { setModalDate(startDate); setModalName(name); setShowModal(true); };
    const saveSettings = () => { setStartDate(modalDate); setName(modalName); setShowModal(false); };
    const switchPhase  = (id) => { setActivePhase(id); window.scrollTo({ top: 0, behavior: 'smooth' }); };

    // Right panel — phase navigation + overall progress

    // Right panel — stats + phase navigation
    const rightPanel = (
        <>
            <div className="app-right-label">Progress</div>
            <div className="st-stats-block">
                <div className="st-stat-line">
                    <span className="st-stat-key">Week</span>
                    <span className="st-stat-val">{wn ? `${wn} / 16` : '—'}</span>
                </div>
                <div className="st-stat-line">
                    <span className="st-stat-key">Streak</span>
                    <span className="st-stat-val">{streakCount > 0 ? `🔥 ${streakCount} days` : '—'}</span>
                </div>
                <div className="st-stat-line">
                    <span className="st-stat-key">Tasks</span>
                    <span className="st-stat-val">{done} / {total}</span>
                </div>
                <div className="st-progress-outer">
                    <div className="st-progress-inner" style={{ width: pct + '%' }} />
                </div>
            </div>

            <div className="app-right-label">Phases</div>
            {PHASES.map(p => {
                const pp = phaseProgress(p, checked);
                return (
                    <button
                        key={p.id}
                        className={`st-phase-btn ${p.id === activePhase ? 'active' : ''}`}
                        onClick={() => switchPhase(p.id)}
                    >
                        <span className="st-phase-dot" />
                        <span className="st-phase-label">{p.label}</span>
                        <span className="st-phase-pct">{pp.pct}%</span>
                    </button>
                );
            })}

            <button className="st-settings-link" onClick={openSettings}><FaGear /> Settings</button>
            {startDate && (
                <div className="app-right-meta">
                    Started {new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
            )}

            <div className="app-right-label">Resources</div>
            <ol className="st-res-list">
                {RESOURCES.filter(r => r.phase === activePhase).map((r, i) => (
                    <li key={i}>
                        <a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a>
                    </li>
                ))}
            </ol>
        </>
    );

    return (
        <AppLayout
            icon={<FaBrain className="bigger gt1" />}
            title="Becoming an AI Engineer"
            meta={`Pranshu Gupta${startDate ? ' · Started ' + new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''}`}
            description="A 16-week structured plan to go from strong ML foundations to production-grade AI engineering — covering LLM internals, agentic systems, inference optimization, data infrastructure, and system design for a Senior AI Engineer role."
            right={rightPanel}
        >
            {/* Phase header */}
            <div className="st-phase-header" style={{
                background: `linear-gradient(to right, rgba(32,125,66,0.18) ${prog.pct}%, color-mix(in srgb, var(--surface-text-color) 4%, transparent) ${prog.pct}%)`
            }}>
                <div className="st-phase-header-inner">
                    <span className="st-phase-num">{phase.id}</span>
                    <div className="st-phase-header-body">
                        <div className="st-phase-header-top">
                            <h2>{phase.title}</h2>
                            <span className="st-phase-pct-badge">{prog.pct}%</span>
                        </div>
                        <p>{phase.subtitle}</p>
                        <span className="st-muted">{prog.done} of {prog.total} tasks complete</span>
                    </div>
                </div>
            </div>

            {/* Week cards */}
            {phase.weeks.map(w => {
                const wDone     = w.days.filter((_, i) => checked[taskId(phase.id, w.week, i)]).length;
                const wTotal    = w.days.length;
                const allDone   = wDone === wTotal;
                const isCurrent = wn === w.week;
                const isCollapsed = !!collapsed[w.week];

                return (
                    <div key={w.week} className="st-week-card">
                        <div
                            className={`st-week-header ${isCollapsed ? 'collapsed' : ''}`}
                            onClick={() => toggleWeek(w.week)}
                        >
                            <span className="st-week-title">Week {w.week}{isCurrent ? ' 📍' : ''}</span>
                            <span className={`st-week-badge ${allDone ? 'done' : ''}`}>
                                {wDone}/{wTotal}{allDone ? ' ✓' : ''}
                            </span>
                            <span className="st-chevron">▼</span>
                        </div>

                        {!isCollapsed && (
                            <div className="st-week-tasks">
                                {w.days.map((day, i) => {
                                    const tid      = taskId(phase.id, w.week, i);
                                    const isDone   = !!checked[tid];
                                    const isToday  = tid === todayId;
                                    const note     = notes[tid] || '';
                                    const noteOpen = expandedNotes[tid] ?? !!note;

                                    return (
                                        <div key={tid} className={`st-task-row ${isDone ? 'completed' : ''} ${isToday ? 'today' : ''}`}>
                                            <div className={`st-check ${isDone ? 'checked' : ''}`} onClick={() => toggleTask(tid)} />
                                            <div className="st-day">{day.d}</div>
                                            <div className="st-task-body">
                                                <div className="st-task-text">{day.t}</div>
                                                {day.r?.length > 0 && (
                                                    <div className="st-resources">
                                                        {day.r.map((r, ri) => (
                                                            <a key={ri} href={r.u} target="_blank" rel="noopener noreferrer">{r.t}</a>
                                                        ))}
                                                    </div>
                                                )}
                                                <button className="st-note-toggle" onClick={() => toggleNote(tid)}>
                                                    {note ? '📝 Edit note' : '+ Add note'}
                                                </button>
                                                {noteOpen && (
                                                    <div className="st-note">
                                                        <NoteTextarea key={tid} tid={tid} initialValue={note} onSave={saveNote} />
                                                    </div>
                                                )}
                                            </div>
                                            {isToday && <span className="st-today-badge">Today</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Settings Modal */}
            {showModal && (
                <div className="st-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div className="st-modal">
                        <h3>⚙️ Settings</h3>
                        <label>Study Start Date</label>
                        <input type="date" value={modalDate} onChange={e => setModalDate(e.target.value)} />
                        <label>Your Name (optional)</label>
                        <input type="text" value={modalName} onChange={e => setModalName(e.target.value)} placeholder="e.g. Pranshu" />
                        <div className="st-modal-actions">
                            <button className="st-btn" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="st-btn st-btn-primary" onClick={saveSettings}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
