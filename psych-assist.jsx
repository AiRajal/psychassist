const { useState, useEffect, useCallback, useRef } = React;
const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } = Recharts;

// ─── Data & Constants ───────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "patients", label: "Patients", icon: "👤" },
  { id: "mood", label: "Mood Tracker", icon: "🌡️" },
  { id: "journal", label: "Journal", icon: "📝" },
  { id: "cbt", label: "CBT Tools", icon: "🧠" },
  { id: "breathing", label: "Breathing", icon: "🌬️" },
  { id: "sessions", label: "Sessions", icon: "📋", pro: true },
  { id: "feedback", label: "Feedback", icon: "💬" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

// Features locked behind Professional plan
const PRO_FEATURES = new Set(["sessions"]);
const isPro = (plan) => plan === "professional" || plan === "clinic";

const STATUS_COLORS = {
  Active: "#68D391",
  "On Hold": "#F6AD55",
  Discharged: "#A0AEC0",
  "New Intake": "#63B3ED",
};

const MOOD_EMOJIS = [
  { value: 1, emoji: "😞", label: "Very Low" },
  { value: 2, emoji: "😟", label: "Low" },
  { value: 3, emoji: "😐", label: "Neutral" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😊", label: "Great" },
];

const SYMPTOMS = [
  "Anxiety", "Depression", "Insomnia", "Fatigue", "Irritability",
  "Concentration Issues", "Appetite Changes", "Social Withdrawal",
  "Panic", "Rumination"
];

const CBT_DISTORTIONS = [
  { name: "All-or-Nothing Thinking", desc: "Seeing things in black and white categories" },
  { name: "Overgeneralization", desc: "Viewing a single negative event as a never-ending pattern" },
  { name: "Mental Filter", desc: "Dwelling on negatives and ignoring positives" },
  { name: "Catastrophizing", desc: "Expecting the worst possible outcome" },
  { name: "Emotional Reasoning", desc: "Assuming feelings reflect reality" },
  { name: "Should Statements", desc: "Criticizing yourself or others with 'shoulds'" },
  { name: "Personalization", desc: "Blaming yourself for things outside your control" },
  { name: "Mind Reading", desc: "Assuming you know what others think" },
];

const BREATHING_PATTERNS = [
  { name: "4-7-8 Relaxation", inhale: 4, hold: 7, exhale: 8, desc: "Calms the nervous system, great for sleep" },
  { name: "Box Breathing", inhale: 4, hold: 4, exhale: 4, holdAfter: 4, desc: "Used by Navy SEALs for focus and calm" },
  { name: "Resonant Breathing", inhale: 5, hold: 0, exhale: 5, desc: "Balances heart rate variability" },
];

const INITIAL_MOOD_HISTORY = [];

// ─── Styles ─────────────────────────────────────────────────────────────────

const colors = {
  bg: "#F0F4F8",
  card: "#FFFFFF",
  primary: "#4A7C8A",
  primaryLight: "#E8F1F3",
  primaryDark: "#3A6270",
  accent: "#7BA7B3",
  text: "#2D3748",
  textLight: "#718096",
  textMuted: "#A0AEC0",
  border: "#E2E8F0",
  success: "#68D391",
  warning: "#F6AD55",
  danger: "#FC8181",
  breatheIn: "#68D391",
  breatheHold: "#63B3ED",
  breatheOut: "#B794F4",
};

// ─── Utility Components ─────────────────────────────────────────────────────

function Card({ children, style, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: colors.card,
        borderRadius: 16,
        padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        border: `1px solid ${colors.border}`,
        transition: "box-shadow 0.2s, transform 0.2s",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Button({ children, variant = "primary", style, ...props }) {
  const variants = {
    primary: { background: colors.primary, color: "#fff", border: "none" },
    secondary: { background: colors.primaryLight, color: colors.primary, border: `1px solid ${colors.border}` },
    danger: { background: "#FFF5F5", color: "#E53E3E", border: "1px solid #FED7D7" },
    ghost: { background: "transparent", color: colors.textLight, border: "none" },
  };
  return (
    <button
      style={{
        padding: "10px 20px",
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s",
        fontFamily: "inherit",
        ...variants[variant],
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: colors.text, margin: 0 }}>{children}</h2>
      {sub && <p style={{ fontSize: 14, color: colors.textLight, margin: "4px 0 0" }}>{sub}</p>}
    </div>
  );
}

function Chip({ label, active, onClick }) {
  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-block",
        padding: "6px 14px",
        borderRadius: 20,
        fontSize: 13,
        fontWeight: 500,
        cursor: onClick ? "pointer" : "default",
        background: active ? colors.primary : colors.primaryLight,
        color: active ? "#fff" : colors.primary,
        border: `1px solid ${active ? colors.primary : colors.border}`,
        transition: "all 0.2s",
        marginRight: 6,
        marginBottom: 6,
      }}
    >
      {label}
    </span>
  );
}

function TextArea({ value, onChange, placeholder, rows = 4, style }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%",
        padding: 14,
        borderRadius: 10,
        border: `1px solid ${colors.border}`,
        fontSize: 14,
        fontFamily: "inherit",
        resize: "vertical",
        color: colors.text,
        background: "#FAFBFC",
        boxSizing: "border-box",
        outline: "none",
        transition: "border-color 0.2s",
        ...style,
      }}
    />
  );
}

function Input({ value, onChange, placeholder, style, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "10px 14px",
        borderRadius: 10,
        border: `1px solid ${colors.border}`,
        fontSize: 14,
        fontFamily: "inherit",
        color: colors.text,
        background: "#FAFBFC",
        boxSizing: "border-box",
        outline: "none",
        ...style,
      }}
    />
  );
}

// ─── Upgrade Modal ──────────────────────────────────────────────────────────

function UpgradeModal({ feature, onClose, onUpgrade }) {
  const featureDescriptions = {
    sessions: {
      title: "Session Notes & Voice Recording",
      desc: "Record sessions with live transcription, speaker detection, and auto-generated clinical notes.",
      icon: "📋",
    },
    patients_limit: {
      title: "Unlimited Patients",
      desc: "Starter plan includes up to 5 patients. Upgrade to manage unlimited patients.",
      icon: "👤",
    },
  };

  const info = featureDescriptions[feature] || { title: "Professional Feature", desc: "This feature requires a Professional plan.", icon: "⭐" };
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const data = await api.post("/billing/checkout", { plan: "professional" });
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Could not start checkout. Please try again.");
      }
    } catch (err) {
      alert("Upgrade failed: " + (err.message || "Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return React.createElement("div", {
    onClick: onClose,
    style: {
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 9999,
    }
  },
    React.createElement("div", {
      onClick: e => e.stopPropagation(),
      style: {
        background: "#fff", borderRadius: 16, padding: "40px 36px",
        maxWidth: 420, width: "90%", textAlign: "center", position: "relative",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
      }
    },
      React.createElement("button", {
        onClick: onClose,
        style: {
          position: "absolute", top: 12, right: 16, background: "none",
          border: "none", fontSize: 20, cursor: "pointer", color: colors.textLight,
        }
      }, "✕"),
      React.createElement("div", { style: { fontSize: 48, marginBottom: 16 } }, info.icon),
      React.createElement("h2", { style: { color: colors.text, fontSize: 22, marginBottom: 8 } }, info.title),
      React.createElement("p", { style: { color: colors.textLight, fontSize: 14, lineHeight: 1.6, marginBottom: 24 } }, info.desc),
      React.createElement("div", {
        style: {
          background: colors.primaryLight, borderRadius: 10, padding: "16px 20px",
          marginBottom: 24,
        }
      },
        React.createElement("div", { style: { fontSize: 28, fontWeight: 800, color: colors.primary } }, "$14"),
        React.createElement("div", { style: { fontSize: 13, color: colors.textLight } }, "per month · cancel anytime"),
        React.createElement("div", { style: { fontSize: 12, color: colors.primary, fontWeight: 600, marginTop: 4 } }, "30-day free trial included")
      ),
      React.createElement("div", { style: { textAlign: "left", marginBottom: 24 } },
        ["Unlimited patients", "Voice recording & transcription", "Auto-generated session notes", "Speaker detection", "All Starter features included"].map((item, i) =>
          React.createElement("div", { key: i, style: { display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 14, color: colors.text } },
            React.createElement("span", { style: { color: "#48BB78" } }, "✓"),
            item
          )
        )
      ),
      React.createElement("button", {
        onClick: handleUpgrade,
        disabled: loading,
        style: {
          width: "100%", padding: "12px 24px", background: colors.primary,
          color: "#fff", border: "none", borderRadius: 8, fontSize: 15,
          fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "inherit", marginBottom: 8,
        }
      }, loading ? "Starting checkout..." : "Start Free Trial"),
      React.createElement("button", {
        onClick: onClose,
        style: {
          width: "100%", padding: "10px 24px", background: "transparent",
          color: colors.textLight, border: "none", borderRadius: 8, fontSize: 13,
          cursor: "pointer", fontFamily: "inherit",
        }
      }, "Maybe later")
    )
  );
}

// ─── Pro Feature Lock Screen ────────────────────────────────────────────────

function ProLockScreen({ feature, userPlan, onUpgrade }) {
  const info = {
    sessions: {
      title: "Session Notes & Voice Recording",
      desc: "Record therapy sessions, get live transcription with speaker detection, and auto-generate structured clinical notes.",
      icon: "📋",
      features: ["Voice recording with waveform visualization", "Live speech-to-text transcription", "Automatic speaker detection", "Template-based clinical note generation", "Session history and playback"],
    },
  };

  const data = info[feature] || { title: "Professional Feature", desc: "Upgrade to access this feature.", icon: "⭐", features: [] };

  return React.createElement("div", {
    style: { maxWidth: 600, margin: "60px auto", textAlign: "center", padding: "0 20px" }
  },
    React.createElement("div", {
      style: {
        width: 80, height: 80, borderRadius: "50%", background: colors.primaryLight,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 36, margin: "0 auto 20px",
      }
    }, data.icon),
    React.createElement("h2", { style: { color: colors.text, fontSize: 24, marginBottom: 8 } }, data.title),
    React.createElement("p", { style: { color: colors.textLight, fontSize: 15, lineHeight: 1.6, marginBottom: 28, maxWidth: 440, margin: "0 auto 28px" } }, data.desc),
    data.features.length > 0 && React.createElement("div", {
      style: {
        background: colors.card, borderRadius: 12, border: `1px solid ${colors.border}`,
        padding: "20px 28px", textAlign: "left", marginBottom: 28,
      }
    },
      data.features.map((f, i) =>
        React.createElement("div", { key: i, style: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", fontSize: 14, color: colors.text } },
          React.createElement("span", { style: { color: colors.primary, fontSize: 16 } }, "✦"),
          f
        )
      )
    ),
    React.createElement("button", {
      onClick: onUpgrade,
      style: {
        padding: "12px 32px", background: colors.primary, color: "#fff",
        border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600,
        cursor: "pointer", fontFamily: "inherit",
      }
    }, "Upgrade to Professional — $14/mo"),
    React.createElement("div", { style: { fontSize: 13, color: colors.textLight, marginTop: 8 } }, "30-day free trial · Cancel anytime")
  );
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

function Dashboard({ moodHistory, journalEntries, sessionNotes, patients }) {
  const activePatients = (patients || []).filter(p => p.status === "Active" || p.status === "New Intake");
  const totalCheckIns = moodHistory.filter(m => m.patientId).length;
  const todayStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const todayCheckIns = moodHistory.filter(m => m.date === todayStr).length;

  return (
    <div>
      <SectionTitle sub="Practice overview and patient wellness">Welcome Back</SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Card style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36 }}>👤</div>
          <div style={{ fontSize: 13, color: colors.textLight, marginTop: 4 }}>Active Patients</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>{activePatients.length}</div>
        </Card>
        <Card style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36 }}>🌡️</div>
          <div style={{ fontSize: 13, color: colors.textLight, marginTop: 4 }}>Today's Check-Ins</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>{todayCheckIns}</div>
        </Card>
        <Card style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36 }}>📋</div>
          <div style={{ fontSize: 13, color: colors.textLight, marginTop: 4 }}>Total Sessions</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>{sessionNotes.length}</div>
        </Card>
        <Card style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36 }}>📊</div>
          <div style={{ fontSize: 13, color: colors.textLight, marginTop: 4 }}>Total Check-Ins</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>{totalCheckIns}</div>
        </Card>
      </div>

      {/* Patient Quick Status */}
      {activePatients.length > 0 && (
        <Card style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: "0 0 16px" }}>Patient Overview</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {activePatients.map((p) => {
              const pMoods = moodHistory.filter(m => m.patientId === p.id);
              const latest = pMoods[pMoods.length - 1];
              const pSessions = sessionNotes.filter(s => s.patientId === p.id);
              return (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: 12, borderRadius: 10, background: colors.bg,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: `${colors.primary}18`, color: colors.primary,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 700, flexShrink: 0,
                  }}>
                    {(p.firstName?.[0] || "").toUpperCase()}{(p.lastName?.[0] || "").toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{p.fullName}</div>
                    <div style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>
                      {latest ? (
                        <span>
                          {MOOD_EMOJIS.find(m => m.value === latest.mood)?.emoji} {MOOD_EMOJIS.find(m => m.value === latest.mood)?.label}
                          <span style={{ color: colors.textMuted }}> · {latest.date}</span>
                        </span>
                      ) : "No mood data yet"}
                      <span style={{ color: colors.textMuted }}> · {pSessions.length} sessions</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: "0 0 12px" }}>Recent Check-Ins</h3>
          {moodHistory.filter(m => m.patientId).length === 0 ? (
            <p style={{ color: colors.textMuted, fontSize: 14 }}>No mood check-ins yet.</p>
          ) : (
            moodHistory.filter(m => m.patientId).slice(-4).reverse().map((entry, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 3 ? `1px solid ${colors.border}` : "none" }}>
                <span style={{ fontSize: 20 }}>{MOOD_EMOJIS.find(m => m.value === entry.mood)?.emoji || "—"}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{entry.patientName}</div>
                  <div style={{ fontSize: 11, color: colors.textMuted }}>{entry.date} · Anxiety {entry.anxiety}/10</div>
                </div>
              </div>
            ))
          )}
        </Card>
        <Card>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: "0 0 12px" }}>Recent Sessions</h3>
          {sessionNotes.length === 0 ? (
            <p style={{ color: colors.textMuted, fontSize: 14 }}>No sessions recorded yet.</p>
          ) : (
            sessionNotes.slice(-4).reverse().map((s, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: i < 3 ? `1px solid ${colors.border}` : "none" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                  {s.title}
                  {s.patientName && <span style={{ fontWeight: 400, color: colors.textLight }}> — {s.patientName}</span>}
                </div>
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{s.date} · {s.type}</div>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── Mood Tracker ───────────────────────────────────────────────────────────

function MoodTracker({ moodHistory, setMoodHistory, patients, selectedPatientId: initialPatientId, addMoodEntry }) {
  const [patientId, setPatientId] = useState(initialPatientId || "");
  const [selectedMood, setSelectedMood] = useState(null);
  const [anxiety, setAnxiety] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [chartPatientId, setChartPatientId] = useState("");

  useEffect(() => {
    if (initialPatientId) {
      setPatientId(String(initialPatientId));
      setChartPatientId(String(initialPatientId));
    }
  }, [initialPatientId]);

  const toggleSymptom = (s) => {
    setSelectedSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const getPatientName = (id) => {
    const p = patients.find(pt => pt.id == id);
    return p ? (p.fullName || p.full_name) : null;
  };

  const saveMood = async () => {
    if (!selectedMood || !patientId) return;
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const entry = {
      date: today,
      mood: selectedMood,
      anxiety,
      energy,
      symptoms: selectedSymptoms,
      note,
      patientId: Number(patientId),
      patientName: getPatientName(patientId),
      timestamp: new Date().toISOString(),
    };
    try {
      if (addMoodEntry) {
        await addMoodEntry(entry);
      } else {
        setMoodHistory(prev => [...prev, entry]);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setSelectedMood(null); setAnxiety(5); setEnergy(5);
      setSelectedSymptoms([]); setNote("");
    } catch (err) {
      console.error("Mood save error:", err);
    }
  };

  const filteredHistory = chartPatientId
    ? moodHistory.filter(m => m.patientId === Number(chartPatientId))
    : moodHistory;

  const activePatients = patients.filter(p => p.status !== "Discharged");

  return (
    <div>
      <SectionTitle sub="Record mood check-ins for your patients">Patient Mood Check-In</SectionTitle>

      <Card style={{ marginBottom: 20 }}>
        {/* Patient Selector */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>
            Select Patient *
          </label>
          {activePatients.length === 0 ? (
            <div style={{ padding: 16, background: colors.bg, borderRadius: 10, textAlign: "center" }}>
              <p style={{ fontSize: 14, color: colors.textMuted, margin: 0 }}>No patients registered yet. Add a patient first.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {activePatients.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setPatientId(String(p.id))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: `2px solid ${String(p.id) === patientId ? colors.primary : colors.border}`,
                    background: String(p.id) === patientId ? colors.primaryLight : "transparent",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: `${colors.primary}22`, color: colors.primary,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700,
                  }}>
                    {(p.firstName?.[0] || "").toUpperCase()}{(p.lastName?.[0] || "").toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: String(p.id) === patientId ? colors.primary : colors.text }}>
                      {p.fullName}
                    </div>
                    {p.diagnosis && (
                      <div style={{ fontSize: 11, color: colors.textMuted }}>{p.diagnosis}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {patientId && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: "0 0 16px" }}>
              How is {getPatientName(patientId)} feeling?
            </h3>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 24 }}>
              {MOOD_EMOJIS.map((m) => (
                <div
                  key={m.value}
                  onClick={() => setSelectedMood(m.value)}
                  style={{
                    textAlign: "center",
                    cursor: "pointer",
                    padding: "12px 16px",
                    borderRadius: 14,
                    border: `2px solid ${selectedMood === m.value ? colors.primary : colors.border}`,
                    background: selectedMood === m.value ? colors.primaryLight : "transparent",
                    transition: "all 0.2s",
                    minWidth: 72,
                  }}
                >
                  <div style={{ fontSize: 32 }}>{m.emoji}</div>
                  <div style={{ fontSize: 12, color: selectedMood === m.value ? colors.primary : colors.textLight, marginTop: 4, fontWeight: 600 }}>
                    {m.label}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 8 }}>
                  Anxiety Level: {anxiety}/10
                </label>
                <input
                  type="range" min="0" max="10" value={anxiety}
                  onChange={(e) => setAnxiety(Number(e.target.value))}
                  style={{ width: "100%", accentColor: colors.warning }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: colors.textMuted }}>
                  <span>Calm</span><span>Severe</span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 8 }}>
                  Energy Level: {energy}/10
                </label>
                <input
                  type="range" min="0" max="10" value={energy}
                  onChange={(e) => setEnergy(Number(e.target.value))}
                  style={{ width: "100%", accentColor: colors.success }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: colors.textMuted }}>
                  <span>Drained</span><span>Energized</span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 8 }}>
                Symptoms Present
              </label>
              <div style={{ display: "flex", flexWrap: "wrap" }}>
                {SYMPTOMS.map((s) => (
                  <Chip key={s} label={s} active={selectedSymptoms.includes(s)} onClick={() => toggleSymptom(s)} />
                ))}
              </div>
            </div>

            <TextArea value={note} onChange={setNote} placeholder="Clinical observations, patient self-report notes..." rows={3} />

            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <Button onClick={saveMood} style={{ opacity: selectedMood ? 1 : 0.5 }}>Save Check-In</Button>
              {saved && <span style={{ color: colors.success, fontSize: 14, fontWeight: 600 }}>Saved!</span>}
            </div>
          </>
        )}
      </Card>

      {/* Mood History Chart — filterable by patient */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: 0 }}>Mood History</h3>
          <select
            value={chartPatientId}
            onChange={(e) => setChartPatientId(e.target.value)}
            style={{
              padding: "6px 12px", borderRadius: 8, border: `1px solid ${colors.border}`,
              fontSize: 13, fontFamily: "inherit", color: colors.text, background: "#FAFBFC", outline: "none",
            }}
          >
            <option value="">All Patients</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
          </select>
        </div>
        {filteredHistory.length === 0 ? (
          <p style={{ fontSize: 14, color: colors.textMuted, textAlign: "center", padding: 20 }}>
            No mood data recorded yet{chartPatientId ? " for this patient" : ""}. Start logging check-ins above.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={filteredHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: colors.textLight }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: colors.textLight }} />
              <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${colors.border}`, fontSize: 13 }} />
              <Line type="monotone" dataKey="mood" stroke={colors.primary} strokeWidth={2} dot={{ fill: colors.primary, r: 4 }} name="Mood" />
              <Line type="monotone" dataKey="anxiety" stroke={colors.warning} strokeWidth={2} dot={false} name="Anxiety" />
              <Line type="monotone" dataKey="energy" stroke={colors.success} strokeWidth={2} dot={false} name="Energy" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Recent Check-Ins Log */}
      {moodHistory.filter(m => m.patientId).length > 0 && (
        <Card>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: "0 0 12px" }}>Recent Check-Ins</h3>
          {moodHistory.filter(m => m.patientId).slice(-8).reverse().map((entry, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
              borderBottom: i < 7 ? `1px solid ${colors.border}` : "none",
            }}>
              <div style={{ fontSize: 24 }}>{MOOD_EMOJIS.find(m => m.value === entry.mood)?.emoji || "—"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
                  {entry.patientName || "Unknown"}
                  <span style={{ fontWeight: 400, color: colors.textLight }}> — {MOOD_EMOJIS.find(m => m.value === entry.mood)?.label}</span>
                </div>
                <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  {entry.date} · Anxiety: {entry.anxiety}/10 · Energy: {entry.energy}/10
                  {entry.symptoms && entry.symptoms.length > 0 && ` · ${entry.symptoms.join(", ")}`}
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ─── Journal ────────────────────────────────────────────────────────────────

function Journal({ journalEntries, setJournalEntries, addJournalEntry, updateJournalEntry }) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [prompt] = useState(() => {
    const prompts = [
      "What am I grateful for today?",
      "What emotion is strongest right now, and why?",
      "What would I tell a friend going through the same thing?",
      "What small win can I celebrate today?",
      "What's one thing I can let go of right now?",
      "How have I grown in the past month?",
    ];
    return prompts[Math.floor(Math.random() * prompts.length)];
  });

  const save = async () => {
    if (!text.trim()) return;
    const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const entry = { date, title: title || "Untitled Entry", content: text, text };
    try {
      if (addJournalEntry) {
        await addJournalEntry(entry);
      } else {
        setJournalEntries(prev => [...prev, entry]);
      }
      setTitle(""); setText("");
    } catch (err) { console.error("Journal save error:", err); }
  };

  return (
    <div>
      <SectionTitle sub="Reflect on your thoughts and experiences">Guided Journal</SectionTitle>

      <Card style={{ marginBottom: 20, background: colors.primaryLight, border: `1px solid ${colors.accent}` }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: colors.primary, marginBottom: 4 }}>Today's Prompt</div>
        <div style={{ fontSize: 16, color: colors.primaryDark, fontStyle: "italic" }}>{prompt}</div>
      </Card>

      <Card style={{ marginBottom: 20 }}>
        <Input value={title} onChange={setTitle} placeholder="Entry title (optional)" style={{ marginBottom: 12 }} />
        <TextArea value={text} onChange={setText} placeholder="Start writing..." rows={8} />
        <div style={{ marginTop: 12 }}>
          <Button onClick={save}>Save Entry</Button>
        </div>
      </Card>

      <SectionTitle sub={`${journalEntries.length} entries`}>Past Entries</SectionTitle>
      {journalEntries.slice().reverse().map((entry, i) => (
        <Card key={i} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontWeight: 600, color: colors.text }}>{entry.title}</span>
            <span style={{ fontSize: 12, color: colors.textMuted }}>{entry.date}</span>
          </div>
          <p style={{ fontSize: 14, color: colors.textLight, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{entry.text}</p>
        </Card>
      ))}
    </div>
  );
}

// ─── CBT Tools ──────────────────────────────────────────────────────────────

function CBTTools() {
  const [situation, setSituation] = useState("");
  const [autoThought, setAutoThought] = useState("");
  const [distortions, setDistortions] = useState([]);
  const [evidence, setEvidence] = useState("");
  const [counterEvidence, setCounterEvidence] = useState("");
  const [balanced, setBalanced] = useState("");
  const [entries, setEntries] = useState([]);
  const [showInfo, setShowInfo] = useState(false);

  const toggleDistortion = (name) => {
    setDistortions(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]);
  };

  const save = () => {
    if (!situation || !autoThought) return;
    setEntries(prev => [...prev, { situation, autoThought, distortions, evidence, counterEvidence, balanced, date: new Date().toLocaleDateString() }]);
    setSituation(""); setAutoThought(""); setDistortions([]); setEvidence(""); setCounterEvidence(""); setBalanced("");
  };

  return (
    <div>
      <SectionTitle sub="Challenge unhelpful thought patterns">CBT Thought Record</SectionTitle>

      <div style={{ marginBottom: 16 }}>
        <Button variant="secondary" onClick={() => setShowInfo(!showInfo)}>
          {showInfo ? "Hide" : "Show"} Cognitive Distortions Guide
        </Button>
      </div>

      {showInfo && (
        <Card style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: colors.text, margin: "0 0 12px" }}>Common Cognitive Distortions</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {CBT_DISTORTIONS.map((d) => (
              <div key={d.name} style={{ padding: 10, borderRadius: 10, background: colors.bg }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: colors.primary }}>{d.name}</div>
                <div style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>{d.desc}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>
              1. Situation — What happened?
            </label>
            <TextArea value={situation} onChange={setSituation} placeholder="Describe the situation that triggered your thoughts..." rows={2} />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>
              2. Automatic Thought — What went through your mind?
            </label>
            <TextArea value={autoThought} onChange={setAutoThought} placeholder="Write the thought exactly as it appeared..." rows={2} />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>
              3. Identify Distortions
            </label>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {CBT_DISTORTIONS.map((d) => (
                <Chip key={d.name} label={d.name} active={distortions.includes(d.name)} onClick={() => toggleDistortion(d.name)} />
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>
              4. Evidence Supporting the Thought
            </label>
            <TextArea value={evidence} onChange={setEvidence} placeholder="What facts support this thought?" rows={2} />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>
              5. Evidence Against the Thought
            </label>
            <TextArea value={counterEvidence} onChange={setCounterEvidence} placeholder="What facts contradict this thought?" rows={2} />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>
              6. Balanced Thought — A more realistic perspective
            </label>
            <TextArea value={balanced} onChange={setBalanced} placeholder="Rewrite the thought in a more balanced way..." rows={2} />
          </div>

          <Button onClick={save}>Save Thought Record</Button>
        </div>
      </Card>

      {entries.length > 0 && (
        <>
          <SectionTitle sub={`${entries.length} records`}>Past Thought Records</SectionTitle>
          {entries.slice().reverse().map((e, i) => (
            <Card key={i} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8 }}>{e.date}</div>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: colors.textLight }}>SITUATION: </span>
                <span style={{ fontSize: 14, color: colors.text }}>{e.situation}</span>
              </div>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: colors.danger }}>AUTO THOUGHT: </span>
                <span style={{ fontSize: 14, color: colors.text }}>{e.autoThought}</span>
              </div>
              {e.distortions.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  {e.distortions.map(d => <Chip key={d} label={d} active />)}
                </div>
              )}
              {e.balanced && (
                <div style={{ padding: 10, background: colors.primaryLight, borderRadius: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: colors.primary }}>BALANCED: </span>
                  <span style={{ fontSize: 14, color: colors.primaryDark }}>{e.balanced}</span>
                </div>
              )}
            </Card>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Breathing Exercise ─────────────────────────────────────────────────────

function BreathingExercise() {
  const [pattern, setPattern] = useState(BREATHING_PATTERNS[0]);
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState("ready");
  const [timer, setTimer] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setTimer(prev => {
        const next = prev - 1;
        if (next <= 0) {
          setPhase(currentPhase => {
            if (currentPhase === "inhale") {
              if (pattern.hold > 0) { setTimer(pattern.hold); return "hold"; }
              setTimer(pattern.exhale); return "exhale";
            }
            if (currentPhase === "hold") { setTimer(pattern.exhale); return "exhale"; }
            if (currentPhase === "exhale") {
              if (pattern.holdAfter) { setTimer(pattern.holdAfter); return "holdAfter"; }
              setCycles(c => c + 1);
              setTimer(pattern.inhale); return "inhale";
            }
            if (currentPhase === "holdAfter") {
              setCycles(c => c + 1);
              setTimer(pattern.inhale); return "inhale";
            }
            return currentPhase;
          });
        }
        return Math.max(0, next);
      });
      setTotalTime(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [active, pattern]);

  const start = () => {
    setActive(true);
    setPhase("inhale");
    setTimer(pattern.inhale);
    setCycles(0);
    setTotalTime(0);
  };

  const stop = () => {
    setActive(false);
    setPhase("ready");
    setTimer(0);
  };

  const phaseColors = { inhale: colors.breatheIn, hold: colors.breatheHold, exhale: colors.breatheOut, holdAfter: colors.breatheHold };
  const phaseLabels = { inhale: "Breathe In", hold: "Hold", exhale: "Breathe Out", holdAfter: "Hold", ready: "Ready" };
  const phaseScale = { inhale: 1.3, hold: 1.3, exhale: 0.8, holdAfter: 0.8, ready: 1 };

  return (
    <div>
      <SectionTitle sub="Guided breathing exercises for calm and focus">Breathing Exercises</SectionTitle>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {BREATHING_PATTERNS.map((p) => (
          <Card
            key={p.name}
            onClick={() => { if (!active) setPattern(p); }}
            style={{
              flex: 1,
              textAlign: "center",
              border: `2px solid ${pattern.name === p.name ? colors.primary : colors.border}`,
              background: pattern.name === p.name ? colors.primaryLight : colors.card,
              cursor: active ? "default" : "pointer",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, color: colors.text }}>{p.name}</div>
            <div style={{ fontSize: 12, color: colors.textLight, marginTop: 4 }}>{p.desc}</div>
            <div style={{ fontSize: 12, color: colors.primary, marginTop: 6, fontWeight: 600 }}>
              {p.inhale}s - {p.hold}s - {p.exhale}s{p.holdAfter ? ` - ${p.holdAfter}s` : ""}
            </div>
          </Card>
        ))}
      </div>

      <Card style={{ textAlign: "center", padding: 48 }}>
        <div
          style={{
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: active ? `${phaseColors[phase]}22` : `${colors.primary}11`,
            border: `4px solid ${active ? phaseColors[phase] : colors.border}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            transition: "all 1s ease-in-out",
            transform: `scale(${phaseScale[phase]})`,
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, color: active ? phaseColors[phase] : colors.textMuted }}>
            {active ? timer : "—"}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: active ? phaseColors[phase] : colors.textMuted, marginTop: 4 }}>
            {phaseLabels[phase]}
          </div>
        </div>

        {active && (
          <div style={{ fontSize: 14, color: colors.textLight, marginBottom: 20 }}>
            Cycles: {cycles} &nbsp;|&nbsp; Time: {Math.floor(totalTime / 60)}:{String(totalTime % 60).padStart(2, "0")}
          </div>
        )}

        <Button onClick={active ? stop : start} variant={active ? "danger" : "primary"}>
          {active ? "Stop" : "Start Breathing"}
        </Button>
      </Card>
    </div>
  );
}

// ─── Transcript download helper (shared by VoiceRecorder & RecordingPlayback)
function downloadTranscript(rec) {
  const segs = Array.isArray(rec.transcript)
    ? rec.transcript
    : rec.transcript ? [{ speaker: 1, text: rec.transcript }] : [];

  if (segs.length === 0) return;

  const pad = (n) => String(n).padStart(2, "0");
  const fmtDur = (s) => `${Math.floor(s / 60)}:${pad(s % 60)}`;
  const divider = "─".repeat(52);

  const lines = [
    "CONVERSATION TRANSCRIPT",
    divider,
    rec.label   ? `Label    : ${rec.label}`                    : null,
    rec.date    ? `Date     : ${rec.date}`                     : null,
    rec.timestamp ? `Time     : ${rec.timestamp}`              : null,
    rec.duration  ? `Duration : ${fmtDur(rec.duration)}`       : null,
    divider,
    "",
    ...segs.flatMap(seg => [`Person ${seg.speaker}: "${seg.text}"`, ""]),
    divider,
    `Generated by PsychAssist · ${new Date().toLocaleString()}`,
  ].filter(l => l !== null);

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), {
    href    : url,
    download: `${(rec.label || `transcript-${rec.date || "recording"}-${rec.timestamp || ""}`)
      .replace(/[^a-z0-9\s\-_]/gi, "").replace(/\s+/g, "-").toLowerCase() || "transcript"}.txt`,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Voice Recorder ─────────────────────────────────────────────────────────

function VoiceRecorder({ recordings, setRecordings }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const [playingId, setPlayingId] = useState(null);
  const [playProgress, setPlayProgress] = useState({});
  const [waveform, setWaveform] = useState(new Array(24).fill(3));
  const [liveSegments, setLiveSegments] = useState([]);
  const [interimText, setInterimText] = useState("");
  const [expandedTranscripts, setExpandedTranscripts] = useState({});
  const [currentSpeaker, setCurrentSpeaker] = useState(1);
  const [manualSpeakerMode, setManualSpeakerMode] = useState(false);

  // Refs to avoid stale closures
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const durationRef = useRef(0);
  const analyserRef = useRef(null);
  const pitchAnalyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const animFrameRef = useRef(null);
  const pitchFrameRef = useRef(null);
  const audioRef = useRef(null);
  const streamRef = useRef(null);
  const isRecordingRef = useRef(false);
  const recognitionRef = useRef(null);
  const transcriptSegmentsRef = useRef([]);
  const currentSpeakerRef = useRef(1);
  const speakerProfilesRef = useRef({ 1: null, 2: null });
  const pitchSamplesRef = useRef([]);
  const lastPitchTimeRef = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        try { audioCtxRef.current.close(); } catch (e) {}
      }
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch (e) {} }
      if (pitchFrameRef.current) cancelAnimationFrame(pitchFrameRef.current);
    };
  }, []);

  const startTranscription = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;
    transcriptSegmentsRef.current = [];
    setLiveSegments([]);
    setInterimText("");

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          // Manual mode: use the user-selected speaker; Auto mode: use pitch detection
          let speaker;
          if (manualSpeakerModeRef.current) {
            speaker = currentSpeakerRef.current;
            pitchSamplesRef.current = [];
          } else {
            const recentPitches = pitchSamplesRef.current.map(s => s.pitch);
            speaker = assignSpeaker(recentPitches);
            pitchSamplesRef.current = [];
          }
          setCurrentSpeaker(speaker);

          const segs = transcriptSegmentsRef.current;
          // Merge into last segment if same speaker, otherwise create new
          if (segs.length > 0 && segs[segs.length - 1].speaker === speaker) {
            segs[segs.length - 1].text += " " + text.trim();
          } else {
            segs.push({ speaker, text: text.trim() });
          }
          transcriptSegmentsRef.current = [...segs];
          setLiveSegments([...segs]);
        } else {
          interim += text;
        }
      }
      setInterimText(interim);
    };

    recognition.onerror = (e) => {
      if (e.error !== "aborted" && e.error !== "no-speech") {
        console.warn("Speech recognition error:", e.error);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still recording
      if (isRecordingRef.current && recognitionRef.current) {
        try { recognitionRef.current.start(); } catch (e) {}
      }
    };

    try { recognition.start(); } catch (e) {}
  };

  const stopTranscription = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    if (pitchFrameRef.current) { cancelAnimationFrame(pitchFrameRef.current); pitchFrameRef.current = null; }
    setInterimText("");
  };

  // Waveform animation loop
  const runWaveform = () => {
    if (!analyserRef.current || !isRecordingRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const bars = 24;
    const step = Math.max(1, Math.floor(data.length / bars));
    const newWave = [];
    for (let i = 0; i < bars; i++) {
      const val = (data[i * step] || 0) / 255;
      newWave.push(Math.max(3, val * 32));
    }
    setWaveform(newWave);
    animFrameRef.current = requestAnimationFrame(runWaveform);
  };

  // ── Pitch detection via autocorrelation (for speaker diarization) ──────────
  const detectPitch = (analyser) => {
    const bufferLength = analyser.fftSize;
    const buffer = new Float32Array(bufferLength);
    analyser.getFloatTimeDomainData(buffer);
    // Check RMS energy – skip silence
    let rms = 0;
    for (let i = 0; i < bufferLength; i++) rms += buffer[i] * buffer[i];
    rms = Math.sqrt(rms / bufferLength);
    if (rms < 0.008) return null;
    const sampleRate = analyser.context.sampleRate;
    const minPeriod = Math.floor(sampleRate / 800); // max 800 Hz
    const maxPeriod = Math.floor(sampleRate / 60);  // min  60 Hz
    const N = bufferLength - maxPeriod;
    let bestCorr = 0, bestOffset = -1;
    for (let offset = minPeriod; offset <= maxPeriod; offset++) {
      let corr = 0;
      for (let i = 0; i < N; i++) corr += buffer[i] * buffer[i + offset];
      if (corr > bestCorr) { bestCorr = corr; bestOffset = offset; }
    }
    if (bestOffset === -1) return null;
    return sampleRate / bestOffset;
  };

  // ── Assign a speaker number (1 or 2) based on recent pitch samples ─────────
  const assignSpeaker = (pitchSamples) => {
    if (pitchSamples.length === 0) return currentSpeakerRef.current;
    const sorted = [...pitchSamples].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const profiles = speakerProfilesRef.current;
    if (profiles[1] === null) {
      profiles[1] = median;
      currentSpeakerRef.current = 1;
      return 1;
    }
    if (profiles[2] === null) {
      const ratio = median / profiles[1];
      if (ratio < 0.78 || ratio > 1.28) {
        profiles[2] = median;
        currentSpeakerRef.current = 2;
        return 2;
      }
      currentSpeakerRef.current = 1;
      return 1;
    }
    // Both profiles known – pick the closest one
    const d1 = Math.abs(median - profiles[1]) / profiles[1];
    const d2 = Math.abs(median - profiles[2]) / profiles[2];
    const speaker = d1 <= d2 ? 1 : 2;
    // Slowly update profile with exponential moving average
    profiles[speaker] = profiles[speaker] * 0.75 + median * 0.25;
    currentSpeakerRef.current = speaker;
    return speaker;
  };

  // ── Continuous pitch-sampling animation loop ───────────────────────────────
  const runPitchSampling = () => {
    if (!pitchAnalyserRef.current || !isRecordingRef.current) return;
    const now = Date.now();
    if (now - lastPitchTimeRef.current > 150) {
      const pitch = detectPitch(pitchAnalyserRef.current);
      if (pitch !== null && pitch > 60 && pitch < 800) {
        // Keep only the last 3 seconds of samples
        const cutoff = now - 3000;
        pitchSamplesRef.current = pitchSamplesRef.current.filter(s => s.time > cutoff);
        pitchSamplesRef.current.push({ pitch, time: now });
      }
      lastPitchTimeRef.current = now;
    }
    pitchFrameRef.current = requestAnimationFrame(runPitchSampling);
  };

  const manualSpeakerModeRef = useRef(false);

  const switchSpeaker = (speakerNum) => {
    const newSpeaker = speakerNum || (currentSpeakerRef.current === 1 ? 2 : 1);
    currentSpeakerRef.current = newSpeaker;
    setCurrentSpeaker(newSpeaker);

    // If there's a current segment being built, force a new segment for the new speaker
    const segs = transcriptSegmentsRef.current;
    if (segs.length > 0 && segs[segs.length - 1].speaker !== newSpeaker) {
      // The next finalized text will naturally create a new segment
    }
  };

  const toggleManualMode = () => {
    const newMode = !manualSpeakerMode;
    setManualSpeakerMode(newMode);
    manualSpeakerModeRef.current = newMode;
  };

  const startRecording = async () => {
    setError("");

    // Check for API availability
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Microphone access is not available in this environment. Try opening the app in a standalone browser tab.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setError("MediaRecorder API is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio analysis for waveform
      let audioCtx;
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        // Separate higher-resolution analyser for pitch detection
        const pitchAnalyser = audioCtx.createAnalyser();
        pitchAnalyser.fftSize = 2048;
        source.connect(pitchAnalyser);
        pitchAnalyserRef.current = pitchAnalyser;
      } catch (e) {
        // Waveform is optional — continue without it
        analyserRef.current = null;
      }

      // Determine supported MIME type
      let mimeType = "audio/webm";
      if (typeof MediaRecorder.isTypeSupported === "function") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
          mimeType = "audio/ogg";
        } else {
          mimeType = "";
        }
      }

      const recorderOptions = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      durationRef.current = 0;
      setDuration(0);
      // Reset speaker diarization state
      transcriptSegmentsRef.current = [];
      currentSpeakerRef.current = 1;
      speakerProfilesRef.current = { 1: null, 2: null };
      pitchSamplesRef.current = [];
      lastPitchTimeRef.current = 0;
      setLiveSegments([]);
      setCurrentSpeaker(1);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        // Use ref for accurate duration (avoids stale closure)
        const finalDuration = durationRef.current;
        const blobType = mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });

        // Capture transcript segments before resetting
        stopTranscription();
        const finalTranscript = transcriptSegmentsRef.current.length > 0
          ? [...transcriptSegmentsRef.current]
          : [];

        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          const now = new Date();
          setRecordings(prev => [...prev, {
            id: Date.now(),
            url,
            blob,
            duration: finalDuration,
            timestamp: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            date: now.toLocaleDateString(),
            label: "",
            transcript: finalTranscript,
          }]);
        }

        setDuration(0);
        durationRef.current = 0;
        setWaveform(new Array(24).fill(3));
        isRecordingRef.current = false;
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        analyserRef.current = null;
        pitchAnalyserRef.current = null;
        if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
          try { audioCtxRef.current.close(); } catch (e) {}
        }
        audioCtxRef.current = null;
      };

      mediaRecorder.onerror = (e) => {
        setError("Recording error: " + (e.error?.message || "Unknown error"));
        setIsRecording(false);
        isRecordingRef.current = false;
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setIsPaused(false);
      isRecordingRef.current = true;

      // Start speech-to-text transcription
      startTranscription();

      // Duration timer
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration(d => d + 1);
      }, 1000);

      // Start waveform
      if (analyserRef.current) {
        animFrameRef.current = requestAnimationFrame(runWaveform);
      }
      // Start pitch sampling for speaker diarization
      if (pitchAnalyserRef.current) {
        pitchFrameRef.current = requestAnimationFrame(runPitchSampling);
      }
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Microphone permission was denied. Please allow microphone access and try again.");
      } else if (err.name === "NotFoundError") {
        setError("No microphone found. Please connect a microphone and try again.");
      } else {
        setError("Could not start recording: " + (err.message || "Unknown error"));
      }
    }
  };

  const pauseRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    try {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => {
          durationRef.current += 1;
          setDuration(d => d + 1);
        }, 1000);
        setIsPaused(false);
        isRecordingRef.current = true;
        if (analyserRef.current) {
          animFrameRef.current = requestAnimationFrame(runWaveform);
        }
        if (pitchAnalyserRef.current) {
          pitchFrameRef.current = requestAnimationFrame(runPitchSampling);
        }
        // Resume transcription
        if (recognitionRef.current) {
          try { recognitionRef.current.start(); } catch (e) {}
        }
      } else {
        mediaRecorderRef.current.pause();
        clearInterval(timerRef.current);
        setIsPaused(true);
        isRecordingRef.current = false;
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (pitchFrameRef.current) { cancelAnimationFrame(pitchFrameRef.current); pitchFrameRef.current = null; }
        setWaveform(new Array(24).fill(3));
        // Pause transcription
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (e) {}
        }
      }
    } catch (e) {
      setError("Pause/resume failed: " + e.message);
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    try {
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    } catch (e) {}
    clearInterval(timerRef.current);
    setIsRecording(false);
    setIsPaused(false);
    isRecordingRef.current = false;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setLiveSegments([]);
    setInterimText("");
  };

  const playRecording = (rec) => {
    if (!rec.url) return; // no audio — transcript-only (loaded from localStorage)
    if (playingId === rec.id) {
      if (audioRef.current) audioRef.current.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const audio = new Audio(rec.url);
    audioRef.current = audio;
    setPlayingId(rec.id);

    audio.ontimeupdate = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setPlayProgress(prev => ({ ...prev, [rec.id]: (audio.currentTime / audio.duration) * 100 }));
      }
    };
    audio.onended = () => {
      setPlayingId(null);
      setPlayProgress(prev => ({ ...prev, [rec.id]: 0 }));
      audioRef.current = null;
    };
    audio.onerror = () => {
      setPlayingId(null);
      audioRef.current = null;
    };
    audio.play().catch(() => {
      setPlayingId(null);
      audioRef.current = null;
    });
  };

  const deleteRecording = (id) => {
    setRecordings(prev => prev.filter(r => r.id !== id));
    if (playingId === id) {
      if (audioRef.current) audioRef.current.pause();
      setPlayingId(null);
      audioRef.current = null;
    }
  };

  const updateLabel = (id, label) => {
    setRecordings(prev => prev.map(r => r.id === id ? { ...r, label } : r));
  };

  const formatTime = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

  return (
    <div>
      {/* Error Banner */}
      {error && (
        <div style={{
          padding: "10px 14px", marginBottom: 12, borderRadius: 10,
          background: "#FFF5F5", border: "1px solid #FED7D7", color: "#C53030",
          fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>{error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#C53030", fontWeight: 700, fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Recording Controls */}
      <div style={{
        background: isRecording ? "#FFF5F5" : colors.primaryLight,
        border: `1px solid ${isRecording ? "#FED7D7" : colors.border}`,
        borderRadius: 14,
        padding: 20,
        marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isRecording ? 16 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {!isRecording ? (
              <button
                onClick={startRecording}
                style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: "#E53E3E", border: "3px solid #FED7D7",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                }}
                title="Start Recording"
              >
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff" }} />
              </button>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={pauseRecording}
                  style={{
                    width: 42, height: 42, borderRadius: "50%",
                    background: isPaused ? colors.primary : colors.warning,
                    border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 16, fontWeight: 700,
                  }}
                  title={isPaused ? "Resume" : "Pause"}
                >
                  {isPaused ? "▶" : "❚❚"}
                </button>
                <button
                  onClick={stopRecording}
                  style={{
                    width: 42, height: 42, borderRadius: "50%",
                    background: "#E53E3E", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                  title="Stop Recording"
                >
                  <div style={{ width: 16, height: 16, borderRadius: 3, background: "#fff" }} />
                </button>
              </div>
            )}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: isRecording ? "#E53E3E" : colors.text }}>
                {isRecording ? (isPaused ? "Paused" : "Recording...") : "Voice Recorder"}
              </div>
              <div style={{ fontSize: 12, color: colors.textMuted }}>
                {isRecording ? formatTime(duration) : "Click the red button to start"}
              </div>
            </div>
          </div>
          {isRecording && (
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: isPaused ? colors.warning : "#E53E3E",
              animation: isPaused ? "none" : "pulse 1.5s infinite",
            }} />
          )}
        </div>

        {/* Waveform */}
        {isRecording && (
          <div style={{ display: "flex", alignItems: "center", gap: 2, height: 40, justifyContent: "center" }}>
            {waveform.map((h, i) => (
              <div
                key={i}
                style={{
                  width: 4,
                  height: h,
                  borderRadius: 2,
                  background: isPaused ? colors.textMuted : "#E53E3E",
                  transition: "height 0.1s ease",
                  opacity: 0.7,
                }}
              />
            ))}
          </div>
        )}

        {/* Speaker Selection — manual toggle */}
        {isRecording && (
          <div style={{
            marginTop: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={toggleManualMode}
                style={{
                  padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  fontFamily: "inherit", cursor: "pointer", border: `1px solid ${colors.border}`,
                  background: manualSpeakerMode ? colors.primary : "#fff",
                  color: manualSpeakerMode ? "#fff" : colors.textLight,
                  transition: "all 0.15s",
                }}
              >
                {manualSpeakerMode ? "Manual" : "Auto"}
              </button>
              <span style={{ fontSize: 11, color: colors.textMuted }}>
                {manualSpeakerMode ? "Tap a speaker to switch" : "Pitch-based detection"}
              </span>
            </div>

            <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
              <button
                onClick={() => switchSpeaker(1)}
                style={{
                  padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                  fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s",
                  border: currentSpeaker === 1 ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                  background: currentSpeaker === 1 ? colors.primaryLight : "#fff",
                  color: colors.primary,
                  boxShadow: currentSpeaker === 1 ? `0 0 0 2px ${colors.primary}22` : "none",
                }}
              >
                Person 1
              </button>
              <button
                onClick={() => switchSpeaker(2)}
                style={{
                  padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                  fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s",
                  border: currentSpeaker === 2 ? "2px solid #805AD5" : `1px solid ${colors.border}`,
                  background: currentSpeaker === 2 ? "#FAF5FF" : "#fff",
                  color: "#805AD5",
                  boxShadow: currentSpeaker === 2 ? "0 0 0 2px #805AD522" : "none",
                }}
              >
                Person 2
              </button>
            </div>
          </div>
        )}

        {/* Live Transcript – 2-speaker diarization */}
        {isRecording && (liveSegments.length > 0 || interimText) && (
          <div style={{
            marginTop: 12, padding: "10px 14px", background: "#fff",
            borderRadius: 10, border: `1px solid ${colors.border}`,
            maxHeight: 160, overflowY: "auto",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: colors.primary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              Live Transcript
              <span style={{ fontSize: 10, fontWeight: 500, color: colors.textMuted, textTransform: "none", letterSpacing: 0 }}>· pitch-based speaker detection</span>
            </div>
            {liveSegments.map((seg, i) => (
              <div key={i} style={{ marginBottom: 6, display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, flexShrink: 0, paddingTop: 2,
                  color: seg.speaker === 1 ? colors.primary : "#805AD5",
                  textTransform: "uppercase", letterSpacing: 0.4, minWidth: 64,
                }}>
                  Person {seg.speaker}:
                </span>
                <span style={{ fontSize: 13, color: colors.text, lineHeight: 1.5 }}>"{seg.text}"</span>
              </div>
            ))}
            {interimText && (
              <div style={{ marginBottom: 2, display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, flexShrink: 0, paddingTop: 2,
                  color: currentSpeaker === 1 ? colors.primary : "#805AD5",
                  textTransform: "uppercase", letterSpacing: 0.4, minWidth: 64,
                }}>
                  Person {currentSpeaker}:
                </span>
                <span style={{ fontSize: 13, color: colors.textMuted, fontStyle: "italic", lineHeight: 1.5 }}>"{interimText}"</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pulse animation keyframes */}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>

      {/* Recordings List */}
      {recordings.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 8 }}>
            Recordings ({recordings.length})
          </div>
          {recordings.map((rec) => (
            <div key={rec.id} style={{ marginBottom: 8 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  background: "#FAFBFC",
                  borderRadius: rec.transcript && expandedTranscripts[rec.id] ? "10px 10px 0 0" : 10,
                  border: `1px solid ${colors.border}`,
                  borderBottom: rec.transcript && expandedTranscripts[rec.id] ? "none" : undefined,
                }}
              >
                <button
                  onClick={() => playRecording(rec)}
                  disabled={!rec.url}
                  title={!rec.url ? "Audio unavailable — transcript only" : undefined}
                  style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: !rec.url ? colors.border : playingId === rec.id ? colors.warning : colors.primary,
                    border: "none", cursor: rec.url ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0,
                    opacity: rec.url ? 1 : 0.55,
                  }}
                >
                  {!rec.url ? "○" : playingId === rec.id ? "❚❚" : "▶"}
                </button>

                {/* Progress bar */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    type="text"
                    value={rec.label}
                    onChange={(e) => updateLabel(rec.id, e.target.value)}
                    placeholder="Add label..."
                    style={{
                      width: "100%", border: "none", background: "transparent",
                      fontSize: 13, fontWeight: 500, color: colors.text,
                      outline: "none", padding: 0, fontFamily: "inherit",
                    }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <div style={{
                      flex: 1, height: 4, borderRadius: 2, background: colors.border,
                      overflow: "hidden",
                    }}>
                      <div style={{
                        width: `${playProgress[rec.id] || 0}%`,
                        height: "100%",
                        background: colors.primary,
                        borderRadius: 2,
                        transition: "width 0.3s",
                      }} />
                    </div>
                    <span style={{ fontSize: 11, color: colors.textMuted, flexShrink: 0 }}>
                      {formatTime(rec.duration)}
                    </span>
                  </div>
                </div>

                {rec.transcript && rec.transcript.length > 0 && (
                  <button
                    onClick={() => setExpandedTranscripts(prev => ({ ...prev, [rec.id]: !prev[rec.id] }))}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 12, color: colors.primary, padding: 4, flexShrink: 0,
                      fontFamily: "inherit", fontWeight: 600,
                    }}
                    title={expandedTranscripts[rec.id] ? "Hide transcript" : "Show transcript"}
                  >
                    {expandedTranscripts[rec.id] ? "Hide" : "Transcript"}
                  </button>
                )}

                <button
                  onClick={() => deleteRecording(rec.id)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 16, color: colors.textMuted, padding: 4, flexShrink: 0,
                  }}
                  title="Delete recording"
                >
                  ×
                </button>
              </div>

              {/* Expanded Transcript – speaker-labeled */}
              {rec.transcript && rec.transcript.length > 0 && expandedTranscripts[rec.id] && (
                <div style={{
                  padding: "12px 14px", background: "#F7FAFC",
                  borderRadius: "0 0 10px 10px",
                  border: `1px solid ${colors.border}`,
                  borderTop: `1px dashed ${colors.border}`,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: colors.primary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    Conversation Transcript
                    <span style={{ display: "flex", gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#fff", background: colors.primary, borderRadius: 4, padding: "1px 6px" }}>Person 1</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#fff", background: "#805AD5", borderRadius: 4, padding: "1px 6px" }}>Person 2</span>
                    </span>
                    <button
                      onClick={() => downloadTranscript(rec)}
                      style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: colors.primary, background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, textTransform: "none", letterSpacing: 0 }}
                      title="Download transcript as .txt file"
                    >
                      ⬇ Download
                    </button>
                  </div>
                  {(Array.isArray(rec.transcript) ? rec.transcript : [{ speaker: 1, text: rec.transcript }]).map((seg, i) => (
                    <div key={i} style={{
                      marginBottom: 8, display: "flex", gap: 10, alignItems: "flex-start",
                      padding: "8px 10px", borderRadius: 8,
                      background: seg.speaker === 1 ? "#EBF8FF" : "#FAF5FF",
                      borderLeft: `3px solid ${seg.speaker === 1 ? colors.primary : "#805AD5"}`,
                    }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, flexShrink: 0, paddingTop: 2,
                        color: seg.speaker === 1 ? colors.primary : "#805AD5",
                        textTransform: "uppercase", letterSpacing: 0.4, minWidth: 60,
                      }}>
                        Person {seg.speaker}:
                      </span>
                      <span style={{ fontSize: 13, color: colors.text, lineHeight: 1.6 }}>"{seg.text}"</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Patients ───────────────────────────────────────────────────────────────

function Patients({ patients, setPatients, sessionNotes, moodHistory, setPage, setSelectedPatientId, setSelectedMoodPatientId, addPatient, updatePatient, deletePatient }) {
  const [view, setView] = useState("list");
  const [viewingPatient, setViewingPatient] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  // New patient form
  const [form, setForm] = useState({
    firstName: "", lastName: "", dob: "", email: "", phone: "",
    status: "New Intake", diagnosis: "", medications: "",
    emergencyContact: "", emergencyPhone: "",
    insuranceProvider: "", policyNumber: "",
    referralSource: "", notes: "",
  });

  const updateForm = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const [saveError, setSaveError] = useState("");

  const savePatient = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    setSaveError("");
    try {
      const fullName = `${form.firstName} ${form.lastName}`;
      if (addPatient) {
        const p = await addPatient({ fullName, status: form.status || "New Intake", diagnosis: form.diagnosis, phone: form.phone, email: form.email, notes: form.notes });
        // Merge local form fields for UI display
        setPatients(prev => prev.map(pt => pt.id === p.id ? { ...pt, ...form, fullName, full_name: fullName } : pt));
      } else {
        setPatients(prev => [...prev, { ...form, id: Date.now(), createdAt: new Date().toISOString(), fullName: `${form.firstName} ${form.lastName}` }]);
      }
      setForm({
        firstName: "", lastName: "", dob: "", email: "", phone: "",
        status: "New Intake", diagnosis: "", medications: "",
        emergencyContact: "", emergencyPhone: "",
        insuranceProvider: "", policyNumber: "",
        referralSource: "", notes: "",
      });
      setView("list");
    } catch (err) {
      setSaveError(err.message || "Failed to save patient");
    }
  };

  const updatePatientStatus = async (id, status) => {
    try {
      if (updatePatient) await updatePatient(id, { status });
      else setPatients(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    } catch (err) { console.error("Update error:", err); }
  };

  const handleDeletePatient = async (id) => {
    try {
      if (deletePatient) await deletePatient(id);
      else setPatients(prev => prev.filter(p => p.id !== id));
      setViewingPatient(null);
    } catch (err) { console.error("Delete error:", err); }
  };

  // Normalize: API returns full_name, local form uses fullName
  const getName = (p) => p.fullName || p.full_name || "";

  const filtered = patients.filter(p => {
    const name = getName(p);
    const matchSearch = name.toLowerCase().includes(search.toLowerCase()) ||
      (p.diagnosis || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const getPatientSessions = (patientId) => sessionNotes.filter(s => (s.patientId || s.patient_id) == patientId);
  const getPatientMoods = (patientId) => moodHistory.filter(m => (m.patientId || m.patient_id) == patientId);

  const getInitials = (p) => {
    const name = getName(p);
    const parts = name.split(" ");
    return parts.map(w => (w[0] || "").toUpperCase()).slice(0, 2).join("");
  };

  const getAge = (dob) => {
    if (!dob) return null;
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  };

  // ─── Patient Detail View ───
  if (viewingPatient !== null) {
    const p = patients.find(pt => pt.id === viewingPatient);
    if (!p) return null;
    const pSessions = getPatientSessions(p.id);
    const pMoods = getPatientMoods(p.id);
    const age = getAge(p.dob);
    const latestMood = pMoods[pMoods.length - 1];

    return (
      <div>
        <Button variant="ghost" onClick={() => setViewingPatient(null)} style={{ marginBottom: 12 }}>← Back to Patients</Button>

        {/* Header Card */}
        <Card style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: `${colors.primary}22`, color: colors.primary,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 700, flexShrink: 0,
            }}>
              {getInitials(p)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: colors.text, margin: 0 }}>{p.fullName}</h2>
                <div style={{ display: "flex", gap: 6 }}>
                  {["Active", "On Hold", "Discharged"].map(s => (
                    <Chip key={s} label={s} active={p.status === s} onClick={() => updatePatientStatus(p.id, s)} />
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 13, color: colors.textLight, flexWrap: "wrap" }}>
                {age && <span>Age {age}</span>}
                {p.dob && <span>DOB: {new Date(p.dob).toLocaleDateString()}</span>}
                {p.phone && <span>Tel: {p.phone}</span>}
                {p.email && <span>{p.email}</span>}
              </div>
            </div>
          </div>
        </Card>

        {/* Info Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <Card>
            <div style={{ fontSize: 12, fontWeight: 700, color: colors.primary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Clinical Info</div>
            {[
              { label: "Diagnosis", val: p.diagnosis },
              { label: "Medications", val: p.medications },
              { label: "Referral Source", val: p.referralSource },
            ].map((item, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: "uppercase" }}>{item.label}</div>
                <div style={{ fontSize: 14, color: colors.text, marginTop: 2 }}>{item.val || "—"}</div>
              </div>
            ))}
          </Card>
          <Card>
            <div style={{ fontSize: 12, fontWeight: 700, color: colors.primary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Emergency & Insurance</div>
            {[
              { label: "Emergency Contact", val: p.emergencyContact },
              { label: "Emergency Phone", val: p.emergencyPhone },
              { label: "Insurance", val: p.insuranceProvider ? `${p.insuranceProvider}${p.policyNumber ? ` · ${p.policyNumber}` : ""}` : null },
            ].map((item, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: "uppercase" }}>{item.label}</div>
                <div style={{ fontSize: 14, color: colors.text, marginTop: 2 }}>{item.val || "—"}</div>
              </div>
            ))}
          </Card>
        </div>

        {/* Notes */}
        {p.notes && (
          <Card style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: colors.primary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Notes</div>
            <p style={{ fontSize: 14, color: colors.text, margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{p.notes}</p>
          </Card>
        )}

        {/* Mood Trends */}
        <Card style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: colors.primary, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Mood Trends ({pMoods.length} check-in{pMoods.length !== 1 ? "s" : ""})
              {latestMood && (
                <span style={{ marginLeft: 8, textTransform: "none", fontWeight: 500, color: colors.textLight }}>
                  Latest: {MOOD_EMOJIS.find(m => m.value === latestMood.mood)?.emoji} {MOOD_EMOJIS.find(m => m.value === latestMood.mood)?.label}
                </span>
              )}
            </div>
            <Button variant="secondary" onClick={() => { setSelectedMoodPatientId(p.id); setPage("mood"); }} style={{ fontSize: 12, padding: "6px 12px" }}>
              + New Check-In
            </Button>
          </div>
          {pMoods.length === 0 ? (
            <p style={{ fontSize: 13, color: colors.textMuted }}>No mood check-ins recorded for this patient yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={pMoods}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: colors.textLight }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: colors.textLight }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${colors.border}`, fontSize: 12 }} />
                <Line type="monotone" dataKey="mood" stroke={colors.primary} strokeWidth={2} dot={{ fill: colors.primary, r: 3 }} name="Mood" />
                <Line type="monotone" dataKey="anxiety" stroke={colors.warning} strokeWidth={2} dot={false} name="Anxiety" />
                <Line type="monotone" dataKey="energy" stroke={colors.success} strokeWidth={2} dot={false} name="Energy" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Linked Sessions */}
        <Card style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: colors.primary, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Session History ({pSessions.length})
            </div>
            <Button variant="secondary" onClick={() => { setSelectedPatientId(p.id); setPage("sessions"); }} style={{ fontSize: 12, padding: "6px 12px" }}>
              + New Session
            </Button>
          </div>
          {pSessions.length === 0 ? (
            <p style={{ fontSize: 13, color: colors.textMuted }}>No sessions linked to this patient yet.</p>
          ) : (
            pSessions.slice().reverse().map((s, i) => (
              <div key={i} style={{ padding: "10px 0", borderBottom: i < pSessions.length - 1 ? `1px solid ${colors.border}` : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 14, color: colors.text }}>{s.title}</span>
                    {s.recordings && s.recordings.length > 0 && (
                      <span style={{ fontSize: 12, color: colors.primary, marginLeft: 8 }}>🎙 {s.recordings.length}</span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Chip label={s.type} active />
                    <span style={{ fontSize: 12, color: colors.textMuted }}>{s.date}</span>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: colors.textLight, margin: "4px 0 0" }}>
                  {s.notes.slice(0, 100)}{s.notes.length > 100 ? "..." : ""}
                </p>
              </div>
            ))
          )}
        </Card>

        <Button variant="danger" onClick={() => handleDeletePatient(p.id)}>Remove Patient</Button>
      </div>
    );
  }

  // ─── Add New Patient Form ───
  if (view === "add") {
    return (
      <div>
        <SectionTitle sub="Enter patient details">Add New Patient</SectionTitle>
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>First Name *</label>
              <Input value={form.firstName} onChange={(v) => updateForm("firstName", v)} placeholder="First name" />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>Last Name *</label>
              <Input value={form.lastName} onChange={(v) => updateForm("lastName", v)} placeholder="Last name" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>Date of Birth</label>
              <Input type="date" value={form.dob} onChange={(v) => updateForm("dob", v)} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>Email</label>
              <Input value={form.email} onChange={(v) => updateForm("email", v)} placeholder="email@example.com" />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>Phone</label>
              <Input value={form.phone} onChange={(v) => updateForm("phone", v)} placeholder="(555) 123-4567" />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>Status</label>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {["New Intake", "Active", "On Hold", "Discharged"].map(s => (
                <Chip key={s} label={s} active={form.status === s} onClick={() => updateForm("status", s)} />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>Diagnosis</label>
            <Input value={form.diagnosis} onChange={(v) => updateForm("diagnosis", v)} placeholder="e.g., Generalized Anxiety Disorder, MDD" />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>Current Medications</label>
            <TextArea value={form.medications} onChange={(v) => updateForm("medications", v)} placeholder="List current medications and dosages..." rows={2} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>Emergency Contact</label>
              <Input value={form.emergencyContact} onChange={(v) => updateForm("emergencyContact", v)} placeholder="Name and relationship" />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>Emergency Phone</label>
              <Input value={form.emergencyPhone} onChange={(v) => updateForm("emergencyPhone", v)} placeholder="(555) 123-4567" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>Insurance Provider</label>
              <Input value={form.insuranceProvider} onChange={(v) => updateForm("insuranceProvider", v)} placeholder="Provider name" />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>Policy Number</label>
              <Input value={form.policyNumber} onChange={(v) => updateForm("policyNumber", v)} placeholder="Policy #" />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>Referral Source</label>
            <Input value={form.referralSource} onChange={(v) => updateForm("referralSource", v)} placeholder="e.g., Dr. Smith, self-referral, insurance" />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>Additional Notes</label>
            <TextArea value={form.notes} onChange={(v) => updateForm("notes", v)} placeholder="Any additional notes, observations, or important context..." rows={3} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={savePatient}>Save Patient</Button>
            <Button variant="secondary" onClick={() => setView("list")}>Cancel</Button>
          </div>
        </Card>
      </div>
    );
  }

  // ─── Patient List ───
  return (
    <div>
      <SectionTitle sub={`${patients.length} patient${patients.length !== 1 ? "s" : ""} registered`}>Patients</SectionTitle>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <Button onClick={() => setView("add")}>+ Add Patient</Button>
        <Input
          value={search} onChange={setSearch}
          placeholder="Search by name or diagnosis..."
          style={{ flex: 1, minWidth: 200, maxWidth: 320 }}
        />
        <div style={{ display: "flex", gap: 4 }}>
          {["All", "Active", "New Intake", "On Hold", "Discharged"].map(s => (
            <Chip key={s} label={s} active={filterStatus === s} onClick={() => setFilterStatus(s)} />
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <p style={{ color: colors.textMuted, textAlign: "center", margin: 0 }}>
            {patients.length === 0 ? "No patients yet. Click \"+ Add Patient\" to get started." : "No patients match your search."}
          </p>
        </Card>
      ) : (
        filtered.map((p) => {
          const pSessions = getPatientSessions(p.id);
          return (
            <Card key={p.id} onClick={() => setViewingPatient(p.id)} style={{ marginBottom: 10, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: `${colors.primary}18`, color: colors.primary,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, fontWeight: 700, flexShrink: 0,
                }}>
                  {getInitials(p)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 15, color: colors.text }}>{p.fullName}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                      background: `${STATUS_COLORS[p.status] || colors.textMuted}22`,
                      color: STATUS_COLORS[p.status] || colors.textMuted,
                    }}>
                      {p.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: colors.textLight, marginTop: 2, display: "flex", gap: 12 }}>
                    {p.diagnosis && <span>{p.diagnosis}</span>}
                    <span>{pSessions.length} session{pSessions.length !== 1 ? "s" : ""}</span>
                    {p.phone && <span>{p.phone}</span>}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: colors.textMuted, flexShrink: 0 }}>
                  Added {new Date(p.createdAt).toLocaleDateString()}
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

// ─── Session Notes ──────────────────────────────────────────────────────────

function SessionNotes({ sessionNotes, setSessionNotes, patients, selectedPatientId, addSession }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("Therapy");
  const [patientId, setPatientId] = useState(selectedPatientId || "");
  const [notes, setNotes] = useState("");
  const [goals, setGoals] = useState("");
  const [homework, setHomework] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [recordings, setRecordings] = useState([]);
  const [view, setView] = useState("form");
  const [viewingNote, setViewingNote] = useState(null);
  const [filterPatient, setFilterPatient] = useState("");
  const [aiError, setAiError] = useState("");

  const handleAutoGenerate = () => {
    // Collect all transcript segments from recordings
    const allTranscripts = recordings.flatMap(r => r.transcript || []);
    if (allTranscripts.length === 0) {
      setAiError("No transcripts available. Record a session with voice first, then generate notes.");
      return;
    }
    setAiError("");
    try {
      const result = generateTemplateNotes(allTranscripts);
      if (!result) {
        setAiError("Could not parse transcript. Try recording again.");
        return;
      }
      if (result.title) setTitle(result.title);
      if (result.notes) setNotes(result.notes);
      if (result.goals) setGoals(result.goals);
      if (result.homework) setHomework(result.homework);
      if (result.nextSteps) setNextSteps(result.nextSteps);
    } catch (err) {
      setAiError("Failed to generate notes: " + (err.message || "Unknown error"));
    }
  };

  // If navigated from a patient profile, pre-select that patient
  useEffect(() => {
    if (selectedPatientId) {
      setPatientId(selectedPatientId);
      setView("form");
    }
  }, [selectedPatientId]);

  const sessionTypes = ["Therapy", "Psychiatry", "Group", "Check-in", "Crisis", "Assessment"];

  const getPatientName = (id) => {
    const p = patients.find(pt => pt.id == id);
    return p ? (p.fullName || p.full_name) : null;
  };

  const [saveError, setSaveError] = useState("");

  const save = async () => {
    if (!title.trim() || !notes.trim()) return;
    setSaveError("");
    const sessionData = {
      title, date: date || new Date().toISOString().split("T")[0], type, notes, goals, homework, nextSteps,
      patientId: patientId || null,
      patientName: patientId ? getPatientName(patientId) : null,
      recordings: [...recordings],
      transcript: recordings.flatMap(r => r.transcript || []),
      duration: recordings.reduce((sum, r) => sum + (r.duration || 0), 0),
      createdAt: new Date().toISOString(),
    };
    try {
      if (addSession) {
        await addSession(sessionData);
      } else {
        setSessionNotes(prev => [...prev, sessionData]);
      }
      setTitle(""); setDate(""); setNotes(""); setGoals(""); setHomework(""); setNextSteps("");
      setPatientId(""); setRecordings([]);
    } catch (err) {
      setSaveError(err.message || "Failed to save session");
    }
  };

  if (viewingNote !== null) {
    const s = sessionNotes[viewingNote];
    return (
      <div>
        <Button variant="ghost" onClick={() => setViewingNote(null)} style={{ marginBottom: 12 }}>← Back to Sessions</Button>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.text, margin: 0 }}>{s.title}</h2>
              <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
                {s.date} · {s.type}
                {s.patientName && <span> · Patient: <strong style={{ color: colors.primary }}>{s.patientName}</strong></span>}
              </div>
            </div>
            <Chip label={s.type} active />
          </div>

          {/* Recordings playback in detail view */}
          {s.recordings && s.recordings.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: colors.primary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                Voice Recordings ({s.recordings.length})
              </div>
              {s.recordings.map((rec) => (
                <RecordingPlayback key={rec.id} rec={rec} />
              ))}
            </div>
          )}

          {[
            { label: "Session Notes", val: s.notes },
            { label: "Goals Discussed", val: s.goals },
            { label: "Homework / Assignments", val: s.homework },
            { label: "Next Steps", val: s.nextSteps },
          ].filter(x => x.val).map((section, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: colors.primary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                {section.label}
              </div>
              <p style={{ fontSize: 14, color: colors.text, margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{section.val}</p>
            </div>
          ))}
        </Card>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle sub="Document and review your therapy sessions">Session Notes</SectionTitle>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <Button variant={view === "form" ? "primary" : "secondary"} onClick={() => setView("form")}>New Session</Button>
        <Button variant={view === "list" ? "primary" : "secondary"} onClick={() => setView("list")}>All Sessions ({sessionNotes.length})</Button>
        {view === "list" && patients.length > 0 && (
          <select
            value={filterPatient}
            onChange={(e) => setFilterPatient(e.target.value)}
            style={{
              padding: "8px 12px", borderRadius: 10, border: `1px solid ${colors.border}`,
              fontSize: 13, fontFamily: "inherit", color: colors.text, background: "#FAFBFC", outline: "none", marginLeft: 8,
            }}
          >
            <option value="">All Patients</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
          </select>
        )}
      </div>

      {view === "form" ? (
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>Session Title</label>
              <Input value={title} onChange={setTitle} placeholder="e.g., Weekly therapy check-in" />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>Date</label>
              <Input type="date" value={date} onChange={setDate} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>Patient</label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  border: `1px solid ${colors.border}`, fontSize: 14,
                  fontFamily: "inherit", color: patientId ? colors.text : colors.textMuted,
                  background: "#FAFBFC", boxSizing: "border-box", outline: "none",
                }}
              >
                <option value="">No patient linked</option>
                {patients.filter(p => p.status !== "Discharged").map(p => (
                  <option key={p.id} value={p.id}>{p.fullName}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>Session Type</label>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {sessionTypes.map(t => <Chip key={t} label={t} active={type === t} onClick={() => setType(t)} />)}
            </div>
          </div>

          {/* Voice Recorder */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 8 }}>
              Voice Recordings
            </label>
            <VoiceRecorder recordings={recordings} setRecordings={setRecordings} />
          </div>

          {/* AI Generate Notes Button */}
          <div style={{ marginBottom: 20, padding: 16, background: colors.primaryLight, borderRadius: 12, border: `1px solid ${colors.accent}33` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <Button
                onClick={handleAutoGenerate}
                style={{
                  background: "linear-gradient(135deg, #4A7C8A, #7BA7B3)",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                📋 Auto-Generate Notes
              </Button>
              <span style={{ fontSize: 12, color: colors.textLight }}>
                Auto-fill session fields from voice transcript — no API key needed
              </span>
            </div>
            {aiError && (
              <div style={{
                marginTop: 10, padding: "8px 12px", background: "#FFF5F5",
                border: "1px solid #FC8181", borderRadius: 8, fontSize: 13, color: "#C53030",
              }}>
                {aiError}
              </div>
            )}
          </div>

          {[
            { label: "Session Notes", val: notes, set: setNotes, ph: "Key discussion points, insights, breakthroughs..." },
            { label: "Goals Discussed", val: goals, set: setGoals, ph: "Treatment goals reviewed or updated..." },
            { label: "Homework / Assignments", val: homework, set: setHomework, ph: "Tasks or exercises to complete before next session..." },
            { label: "Next Steps", val: nextSteps, set: setNextSteps, ph: "Follow-up actions, appointments, referrals..." },
          ].map((field, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>{field.label}</label>
              <TextArea value={field.val} onChange={field.set} placeholder={field.ph} rows={3} />
            </div>
          ))}

          <Button onClick={save}>Save Session</Button>
        </Card>
      ) : (
        <div>
          {sessionNotes.length === 0 ? (
            <Card><p style={{ color: colors.textMuted, textAlign: "center" }}>No sessions recorded yet.</p></Card>
          ) : (
            sessionNotes
              .map((s, idx) => ({ ...s, _idx: idx }))
              .filter(s => !filterPatient || String(s.patientId) === filterPatient)
              .reverse()
              .map((s) => (
              <Card key={s._idx} onClick={() => setViewingNote(s._idx)} style={{ marginBottom: 12, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: colors.text }}>
                      {s.title}
                      {s.recordings && s.recordings.length > 0 && (
                        <span style={{ fontSize: 12, color: colors.primary, marginLeft: 8 }}>
                          🎙 {s.recordings.length}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
                      {s.date}
                      {s.patientName && <span> · {s.patientName}</span>}
                    </div>
                  </div>
                  <Chip label={s.type} active />
                </div>
                <p style={{ fontSize: 13, color: colors.textLight, margin: "8px 0 0", lineHeight: 1.5 }}>
                  {s.notes.slice(0, 120)}{s.notes.length > 120 ? "..." : ""}
                </p>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Mini playback component for the session detail view
function RecordingPlayback({ rec }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const audioRef = useRef(null);

  const toggle = () => {
    if (!rec.url) return; // no audio available (transcript-only after reload)
    if (!audioRef.current) {
      const audio = new Audio(rec.url);
      audioRef.current = audio;
      audio.ontimeupdate = () => setProgress((audio.currentTime / audio.duration) * 100);
      audio.onended = () => { setPlaying(false); setProgress(0); };
    }
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const formatTime = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px", background: colors.primaryLight,
        borderRadius: rec.transcript && showTranscript ? "10px 10px 0 0" : 10,
      }}>
        <button
          onClick={toggle}
          disabled={!rec.url}
          title={!rec.url ? "Audio unavailable — transcript only" : undefined}
          style={{
            width: 32, height: 32, borderRadius: "50%",
            background: !rec.url ? colors.border : colors.primary,
            border: "none", cursor: rec.url ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0,
            opacity: rec.url ? 1 : 0.55,
          }}
        >
          {!rec.url ? "○" : playing ? "❚❚" : "▶"}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>
            {rec.label || `Recording · ${rec.timestamp}`}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: colors.border, overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: colors.primary, borderRadius: 2, transition: "width 0.3s" }} />
            </div>
            <span style={{ fontSize: 11, color: colors.textMuted }}>{formatTime(rec.duration)}</span>
          </div>
        </div>
        {rec.transcript && rec.transcript.length > 0 && (
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 12, color: colors.primary, padding: 4, flexShrink: 0,
              fontFamily: "inherit", fontWeight: 600,
            }}
          >
            {showTranscript ? "Hide" : "Transcript"}
          </button>
        )}
      </div>
      {rec.transcript && rec.transcript.length > 0 && showTranscript && (
        <div style={{
          padding: "12px 14px", background: "#F7FAFC",
          borderRadius: "0 0 10px 10px",
          border: `1px solid ${colors.border}`,
          borderTop: `1px dashed ${colors.border}`,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: colors.primary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            Conversation Transcript
            <span style={{ display: "flex", gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#fff", background: colors.primary, borderRadius: 4, padding: "1px 6px" }}>Person 1</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#fff", background: "#805AD5", borderRadius: 4, padding: "1px 6px" }}>Person 2</span>
            </span>
            <button
              onClick={() => downloadTranscript(rec)}
              style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: colors.primary, background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, textTransform: "none", letterSpacing: 0 }}
              title="Download transcript as .txt file"
            >
              ⬇ Download
            </button>
          </div>
          {(Array.isArray(rec.transcript) ? rec.transcript : [{ speaker: 1, text: rec.transcript }]).map((seg, i) => (
            <div key={i} style={{
              marginBottom: 8, display: "flex", gap: 10, alignItems: "flex-start",
              padding: "8px 10px", borderRadius: 8,
              background: seg.speaker === 1 ? "#EBF8FF" : "#FAF5FF",
              borderLeft: `3px solid ${seg.speaker === 1 ? colors.primary : "#805AD5"}`,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, flexShrink: 0, paddingTop: 2,
                color: seg.speaker === 1 ? colors.primary : "#805AD5",
                textTransform: "uppercase", letterSpacing: 0.4, minWidth: 60,
              }}>
                Person {seg.speaker}:
              </span>
              <span style={{ fontSize: 13, color: colors.text, lineHeight: 1.6 }}>"{seg.text}"</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Smart Notes Generation (Template-Based) ────────────────────────────────

const CLINICAL_KEYWORDS = {
  mood: ["feeling", "felt", "mood", "happy", "sad", "angry", "anxious", "depressed", "hopeless", "hopeful", "calm", "stressed", "overwhelmed", "worried", "scared", "frustrated", "irritable", "numb", "excited", "grateful", "lonely", "exhausted", "better", "worse", "okay", "fine", "terrible", "great", "good", "bad"],
  goals: ["goal", "goals", "want to", "working on", "plan", "hope to", "trying to", "improve", "reduce", "increase", "develop", "learn", "practice", "achieve", "progress", "milestone", "target", "objective", "outcome"],
  homework: ["homework", "assignment", "practice", "exercise", "try", "between sessions", "this week", "before next", "daily", "journal", "track", "monitor", "log", "record", "write down", "breathing", "meditation", "mindfulness", "worksheet", "cbt"],
  nextSteps: ["next session", "follow up", "next time", "come back", "schedule", "refer", "referral", "appointment", "check in", "revisit", "continue", "explore further", "next week", "reassess", "medication", "prescribe"],
  cbt: ["thought", "thinking", "belief", "cognitive", "distortion", "reframe", "evidence", "automatic thought", "core belief", "schema", "pattern", "behavior", "trigger", "coping", "strategy", "skill"],
  trauma: ["trauma", "ptsd", "flashback", "nightmare", "avoid", "trigger", "hypervigilant", "safety", "grounding", "emdr", "exposure"],
  relationships: ["relationship", "partner", "spouse", "family", "friend", "conflict", "communication", "boundary", "boundaries", "attachment", "support", "trust", "intimacy"],
  selfHarm: ["self-harm", "suicidal", "suicide", "ideation", "safety plan", "crisis", "urge", "cutting", "overdose", "risk"],
  substances: ["alcohol", "drug", "substance", "drinking", "using", "sober", "relapse", "recovery", "addiction", "craving", "trigger"],
};

function generateTemplateNotes(transcript) {
  if (!transcript || transcript.length === 0) return null;

  const fullText = transcript.map(s => s.text).join(" ").toLowerCase();
  const sentences = transcript.map(s => s.text.trim()).filter(Boolean);
  const speaker1Lines = transcript.filter(s => s.speaker === 1).map(s => s.text);
  const speaker2Lines = transcript.filter(s => s.speaker === 2).map(s => s.text);

  // Detect which clinical themes are present
  const themes = {};
  for (const [category, keywords] of Object.entries(CLINICAL_KEYWORDS)) {
    const matches = keywords.filter(kw => fullText.includes(kw));
    if (matches.length > 0) themes[category] = matches;
  }

  // Build title from dominant themes
  const themeLabels = {
    mood: "Mood & Affect",
    cbt: "CBT / Cognitive Work",
    trauma: "Trauma Processing",
    relationships: "Relationship Dynamics",
    selfHarm: "Safety & Risk Assessment",
    substances: "Substance Use",
    goals: "Goal Setting",
    homework: "Skills Practice",
  };
  const topThemes = Object.keys(themes)
    .filter(k => !["goals", "homework", "nextSteps"].includes(k))
    .sort((a, b) => (themes[b]?.length || 0) - (themes[a]?.length || 0))
    .slice(0, 2);
  const title = topThemes.length > 0
    ? "Session: " + topThemes.map(t => themeLabels[t] || t).join(" & ")
    : "Therapy Session Notes";

  // Build notes summary
  const noteParts = [];
  noteParts.push(`Session included ${sentences.length} transcript segments across ${new Set(transcript.map(s => s.speaker)).size} speaker(s).`);

  if (themes.mood) {
    noteParts.push(`Mood/affect themes discussed: ${themes.mood.slice(0, 5).join(", ")}.`);
  }
  if (themes.cbt) {
    noteParts.push(`Cognitive-behavioral themes identified: ${themes.cbt.slice(0, 4).join(", ")}.`);
  }
  if (themes.trauma) {
    noteParts.push(`Trauma-related content addressed during session.`);
  }
  if (themes.relationships) {
    noteParts.push(`Relationship/interpersonal themes explored: ${themes.relationships.slice(0, 4).join(", ")}.`);
  }
  if (themes.selfHarm) {
    noteParts.push(`⚠ Safety-related content detected — review risk assessment.`);
  }
  if (themes.substances) {
    noteParts.push(`Substance use themes present: ${themes.substances.slice(0, 3).join(", ")}.`);
  }

  // Pull key quotes (longest patient statements, likely most substantive)
  const patientLines = speaker2Lines.length > 0 ? speaker2Lines : speaker1Lines;
  const keyStatements = [...patientLines]
    .sort((a, b) => b.length - a.length)
    .slice(0, 3)
    .map(s => `• "${s.length > 150 ? s.slice(0, 147) + '...' : s}"`);
  if (keyStatements.length > 0) {
    noteParts.push("\nKey patient statements:\n" + keyStatements.join("\n"));
  }

  // Extract goal-related sentences
  const goalSentences = sentences.filter(s => {
    const lower = s.toLowerCase();
    return CLINICAL_KEYWORDS.goals.some(kw => lower.includes(kw));
  });
  const goalsText = goalSentences.length > 0
    ? goalSentences.slice(0, 3).map(s => `• ${s}`).join("\n")
    : "No specific goals discussed — consider reviewing treatment plan next session.";

  // Extract homework-related sentences
  const hwSentences = sentences.filter(s => {
    const lower = s.toLowerCase();
    return CLINICAL_KEYWORDS.homework.some(kw => lower.includes(kw));
  });
  const homeworkText = hwSentences.length > 0
    ? hwSentences.slice(0, 3).map(s => `• ${s}`).join("\n")
    : "No specific homework assigned — consider assigning a between-session task.";

  // Extract next-steps sentences
  const nsSentences = sentences.filter(s => {
    const lower = s.toLowerCase();
    return CLINICAL_KEYWORDS.nextSteps.some(kw => lower.includes(kw));
  });
  const nextStepsText = nsSentences.length > 0
    ? nsSentences.slice(0, 3).map(s => `• ${s}`).join("\n")
    : "Schedule follow-up session. Continue monitoring progress on treatment goals.";

  return {
    title,
    notes: noteParts.join("\n"),
    goals: goalsText,
    homework: homeworkText,
    nextSteps: nextStepsText,
  };
}

// ─── Feedback ───────────────────────────────────────────────────────────────

function Feedback({ user }) {
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const categories = [
    { value: "general", label: "General Feedback" },
    { value: "bug", label: "Bug Report" },
    { value: "feature", label: "Feature Request" },
    { value: "usability", label: "Usability" },
    { value: "clinical", label: "Clinical Workflow" },
  ];

  const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const data = await api.get("/feedback");
      setHistory(data.entries || []);
    } catch (e) {
      console.error("Failed to load feedback history:", e);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleSubmit() {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await api.post("/feedback", { category, message: message.trim(), rating: rating || null });
      setSubmitted(true);
      setMessage("");
      setRating(0);
      setCategory("general");
      loadHistory();
      setTimeout(() => setSubmitted(false), 4000);
    } catch (e) {
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    width: "100%", padding: "10px 14px", border: `1px solid ${colors.border}`,
    borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: "#fff",
    boxSizing: "border-box",
  };

  return React.createElement("div", { style: { maxWidth: 700, margin: "0 auto" } },
    React.createElement("h2", { style: { color: colors.text, marginBottom: 4 } }, "Feedback"),
    React.createElement("p", { style: { color: colors.textLight, marginBottom: 24, fontSize: 14 } },
      "Help us improve PsychAssist — your feedback shapes what we build next."
    ),

    // ── Submission success banner ──
    submitted && React.createElement("div", {
      style: {
        background: "#F0FFF4", border: "1px solid #C6F6D5", borderRadius: 10,
        padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10,
      }
    },
      React.createElement("span", { style: { fontSize: 22 } }, "✅"),
      React.createElement("span", { style: { color: "#276749", fontWeight: 500 } },
        "Thank you! Your feedback has been submitted."
      )
    ),

    // ── Feedback form card ──
    React.createElement("div", {
      style: {
        background: "#fff", borderRadius: 12, border: `1px solid ${colors.border}`,
        padding: 28, marginBottom: 28,
      }
    },
      // Rating
      React.createElement("label", { style: { fontWeight: 600, fontSize: 14, color: colors.text, display: "block", marginBottom: 8 } },
        "How's your experience so far?"
      ),
      React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 6 } },
        [1,2,3,4,5].map(n =>
          React.createElement("div", {
            key: n,
            onClick: () => setRating(n),
            style: {
              width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer", fontSize: 20, transition: "all 0.15s",
              background: n <= rating ? colors.primary : colors.bg,
              color: n <= rating ? "#fff" : colors.textLight,
              border: `2px solid ${n <= rating ? colors.primary : colors.border}`,
            }
          }, "★")
        )
      ),
      React.createElement("div", {
        style: { fontSize: 13, color: colors.textLight, marginBottom: 20, minHeight: 18 }
      }, rating > 0 ? ratingLabels[rating] : "Click to rate"),

      // Category
      React.createElement("label", { style: { fontWeight: 600, fontSize: 14, color: colors.text, display: "block", marginBottom: 8 } },
        "Category"
      ),
      React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 } },
        categories.map(c =>
          React.createElement("button", {
            key: c.value,
            onClick: () => setCategory(c.value),
            style: {
              padding: "6px 14px", borderRadius: 20, fontSize: 13, fontFamily: "inherit",
              cursor: "pointer", transition: "all 0.15s", border: "1px solid",
              background: category === c.value ? colors.primary : "#fff",
              color: category === c.value ? "#fff" : colors.text,
              borderColor: category === c.value ? colors.primary : colors.border,
            }
          }, c.label)
        )
      ),

      // Message
      React.createElement("label", { style: { fontWeight: 600, fontSize: 14, color: colors.text, display: "block", marginBottom: 8 } },
        "Your feedback"
      ),
      React.createElement("textarea", {
        value: message,
        onChange: e => setMessage(e.target.value),
        placeholder: category === "bug"
          ? "Describe the bug — what happened and what you expected..."
          : category === "feature"
          ? "Describe the feature you'd like to see..."
          : "Tell us what's on your mind...",
        rows: 5,
        style: { ...inputStyle, resize: "vertical", minHeight: 100 },
      }),
      React.createElement("div", { style: { fontSize: 12, color: colors.textLight, marginTop: 4, marginBottom: 16, textAlign: "right" } },
        `${message.length} / 2000`
      ),

      // Submit
      React.createElement("button", {
        onClick: handleSubmit,
        disabled: submitting || !message.trim() || message.length > 2000,
        style: {
          padding: "10px 28px", background: (!message.trim() || submitting) ? colors.border : colors.primary,
          color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600,
          cursor: (!message.trim() || submitting) ? "not-allowed" : "pointer", fontFamily: "inherit",
        }
      }, submitting ? "Submitting..." : "Submit Feedback")
    ),

    // ── Previous feedback ──
    React.createElement("h3", { style: { color: colors.text, marginBottom: 12, fontSize: 16 } },
      "Your Previous Feedback"
    ),
    loadingHistory
      ? React.createElement("p", { style: { color: colors.textLight, fontSize: 14 } }, "Loading...")
      : history.length === 0
      ? React.createElement("p", { style: { color: colors.textLight, fontSize: 14 } },
          "No feedback submitted yet."
        )
      : history.map((entry, i) =>
          React.createElement("div", {
            key: entry.id || i,
            style: {
              background: "#fff", borderRadius: 10, border: `1px solid ${colors.border}`,
              padding: "16px 20px", marginBottom: 10,
            }
          },
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } },
              React.createElement("span", {
                style: {
                  fontSize: 12, padding: "2px 10px", borderRadius: 12,
                  background: colors.primaryLight, color: colors.primary, fontWeight: 600,
                }
              }, (categories.find(c => c.value === entry.category) || { label: entry.category }).label),
              React.createElement("span", { style: { fontSize: 12, color: colors.textLight } },
                entry.created_at ? new Date(entry.created_at).toLocaleDateString() : ""
              )
            ),
            entry.rating && React.createElement("div", { style: { marginBottom: 4 } },
              Array.from({ length: 5 }, (_, j) =>
                React.createElement("span", {
                  key: j,
                  style: { color: j < entry.rating ? colors.primary : colors.border, fontSize: 14 }
                }, "★")
              )
            ),
            React.createElement("p", { style: { margin: 0, fontSize: 14, color: colors.text, lineHeight: 1.5 } },
              entry.message
            ),
            entry.admin_response && React.createElement("div", {
              style: {
                marginTop: 10, padding: "10px 14px", background: colors.primaryLight,
                borderRadius: 8, fontSize: 13, color: colors.text,
              }
            },
              React.createElement("strong", null, "Response: "),
              entry.admin_response
            )
          )
        )
  );
}

// ─── Settings ───────────────────────────────────────────────────────────────

function Settings({ user, onLogout }) {
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState("");

  const handleUpgrade = async (plan) => {
    setUpgradeLoading(true);
    setUpgradeError("");
    try {
      const data = await api.post("/billing/checkout", { plan });
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setUpgradeError(err.message || "Failed to start checkout");
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      const data = await api.post("/billing/portal");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setUpgradeError(err.message || "Failed to open billing portal");
    }
  };

  return (
    <div>
      <SectionTitle sub="Account, billing, and app info">Settings</SectionTitle>

      {/* Account */}
      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: "0 0 16px" }}>Account</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Name</div>
            <div style={{ fontSize: 14, color: colors.text, marginTop: 4 }}>{user?.fullName || user?.full_name || "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Email</div>
            <div style={{ fontSize: 14, color: colors.text, marginTop: 4 }}>{user?.email || "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Plan</div>
            <div style={{ fontSize: 14, color: colors.primary, marginTop: 4, fontWeight: 600, textTransform: "capitalize" }}>{user?.plan || "starter"}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Member Since</div>
            <div style={{ fontSize: 14, color: colors.text, marginTop: 4 }}>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {onLogout && <Button variant="secondary" onClick={onLogout}>Log Out</Button>}
        </div>
      </Card>

      {/* Subscription */}
      {user?.plan === "starter" && (
        <Card style={{ marginBottom: 20, border: `2px solid ${colors.primary}` }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: "0 0 8px" }}>Upgrade to Professional</h3>
          <p style={{ fontSize: 13, color: colors.textLight, marginBottom: 16, lineHeight: 1.6 }}>
            Unlock unlimited patients, auto-generated session notes, PDF exports, and priority support. First month free.
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Button onClick={() => handleUpgrade("professional")} style={{ opacity: upgradeLoading ? 0.7 : 1 }} disabled={upgradeLoading}>
              {upgradeLoading ? "Loading..." : "Upgrade — $14/mo"}
            </Button>
            <span style={{ fontSize: 13, color: colors.textMuted }}>Cancel anytime</span>
          </div>
          {upgradeError && (
            <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "#FFF5F5", border: "1px solid #FC8181", fontSize: 13, color: "#C53030" }}>
              {upgradeError}
            </div>
          )}
        </Card>
      )}

      {user?.plan !== "starter" && (
        <Card style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: "0 0 12px" }}>Billing</h3>
          <p style={{ fontSize: 13, color: colors.textLight, marginBottom: 12 }}>Manage your subscription, update payment, or download invoices.</p>
          <Button variant="secondary" onClick={handleManageBilling}>Manage Billing</Button>
        </Card>
      )}

      {/* How Auto-Generate Works */}
      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: "0 0 16px" }}>How Auto-Generate Notes Works</h3>
        <div style={{ fontSize: 13, color: colors.textLight, lineHeight: 1.7 }}>
          <p style={{ marginBottom: 8 }}>1. <strong>Record</strong> a session using the voice recorder — speech is transcribed live with speaker detection.</p>
          <p style={{ marginBottom: 8 }}>2. <strong>Click "Auto-Generate Notes"</strong> in the session form — the transcript is analyzed locally.</p>
          <p style={{ marginBottom: 8 }}>3. <strong>Clinical themes are detected</strong> and structured notes are generated.</p>
          <p style={{ margin: 0 }}>4. <strong>Review and edit</strong> the generated notes before saving.</p>
        </div>
      </Card>

      <Card>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: "0 0 12px" }}>About PsychAssist</h3>
        <div style={{ fontSize: 13, color: colors.textLight, lineHeight: 1.7 }}>
          <p style={{ margin: 0 }}>PsychAssist Pro — a clinical session management tool for mental health professionals. Patient management, mood tracking, CBT tools, breathing exercises, journaling, voice-recorded sessions with live transcription, and smart auto-generated session notes.</p>
        </div>
      </Card>
    </div>
  );
}

// ─── API Client ─────────────────────────────────────────────────────────────

const API_BASE = window.PSYCHASSIST_API || (window.location.hostname === "localhost" || window.location.protocol === "file:" ? "http://localhost:4000/api" : window.location.origin + "/api");

const api = {
  _token: null,

  setToken(t) { this._token = t; if (t) localStorage.setItem("pa_token", t); else localStorage.removeItem("pa_token"); },
  getToken() { if (!this._token) this._token = localStorage.getItem("pa_token") || null; return this._token; },

  async request(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...options.headers };
    const token = this.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      this.setToken(null);
      throw new Error("Session expired. Please log in again.");
    }
    if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`);
    return data;
  },

  get(path)       { return this.request(path); },
  post(path, body) { return this.request(path, { method: "POST", body: JSON.stringify(body) }); },
  put(path, body)  { return this.request(path, { method: "PUT", body: JSON.stringify(body) }); },
  del(path)        { return this.request(path, { method: "DELETE" }); },
};

// ─── Auth Screen ────────────────────────────────────────────────────────────

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let data;
      if (mode === "signup") {
        data = await api.post("/auth/signup", { email, password, fullName });
      } else {
        data = await api.post("/auth/login", { email, password });
      }
      api.setToken(data.token);
      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.primaryLight} 100%)`,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{ width: 400, padding: 40 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: colors.primary, letterSpacing: -1 }}>PsychAssist</div>
          <div style={{ fontSize: 12, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.5, marginTop: 4 }}>Pro Edition</div>
        </div>

        <Card>
          <div style={{ display: "flex", gap: 0, marginBottom: 24, borderRadius: 10, overflow: "hidden", border: `1px solid ${colors.border}` }}>
            {["login", "signup"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                style={{
                  flex: 1, padding: "10px 0", border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 14, fontWeight: 600,
                  background: mode === m ? colors.primary : "#fff",
                  color: mode === m ? "#fff" : colors.textLight,
                  transition: "all 0.15s",
                }}>
                {m === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>Full Name</label>
                <Input value={fullName} onChange={setFullName} placeholder="Dr. Jane Smith" />
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>Email</label>
              <Input type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 6 }}>Password</label>
              <Input type="password" value={password} onChange={setPassword} placeholder={mode === "signup" ? "Min 8 characters" : "Your password"} />
            </div>

            {error && (
              <div style={{ padding: "8px 12px", borderRadius: 8, background: "#FFF5F5", border: "1px solid #FC8181", fontSize: 13, color: "#C53030", marginBottom: 16 }}>
                {error}
              </div>
            )}

            <Button style={{ width: "100%", justifyContent: "center", opacity: loading ? 0.7 : 1 }} disabled={loading}>
              {loading ? "Please wait..." : (mode === "login" ? "Log In" : "Create Account")}
            </Button>
          </form>

          {mode === "signup" && (
            <p style={{ fontSize: 12, color: colors.textMuted, textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
              Free Starter plan includes 5 patients and all core features.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────────────────────

function PsychAssistApp() {
  // ── Auth state ───────────────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [showUpgradeModal, setShowUpgradeModal] = useState(null); // null or feature name

  // Check for existing token on mount
  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api.get("/auth/me")
        .then(data => { setUser(data.user); setAuthChecked(true); })
        .catch(() => { api.setToken(null); setAuthChecked(true); });
    } else {
      setAuthChecked(true);
    }
  }, []);

  const handleLogin = (userData, token) => {
    setUser(userData);
    loadAllData();
  };

  const handleLogout = () => {
    api.setToken(null);
    setUser(null);
    setPatients([]);
    setSessionNotes([]);
    setMoodHistory([]);
    setJournalEntries([]);
    setPage("dashboard");
  };

  // ── App data state ──────────────────────────────────────────────────────
  const [moodHistory, setMoodHistory] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [sessionNotes, setSessionNotes] = useState([]);
  const [patients, setPatients] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load all data from API after login
  const loadAllData = useCallback(async () => {
    try {
      const [pRes, sRes, mRes, jRes] = await Promise.all([
        api.get("/patients"),
        api.get("/sessions"),
        api.get("/mood"),
        api.get("/journal"),
      ]);
      setPatients(pRes.patients || []);
      setSessionNotes((sRes.sessions || []).map(s => ({
        ...s, patientName: s.patient_id ? (pRes.patients || []).find(p => p.id === s.patient_id)?.full_name : null,
        recordings: [], // recordings are local-only (audio blobs can't be stored in DB)
      })));
      setMoodHistory((mRes.entries || []).map(e => ({
        ...e, symptoms: e.symptoms || [],
      })));
      setJournalEntries((jRes.entries || []).map(e => ({
        ...e, tags: e.tags || [],
      })));
      setDataLoaded(true);
    } catch (err) {
      console.error("Failed to load data:", err);
    }
  }, []);

  useEffect(() => {
    if (user) loadAllData();
  }, [user, loadAllData]);

  // ── API-synced setters (wrap state + POST/PUT to server) ────────────────
  const addPatient = async (patientData) => {
    const data = await api.post("/patients", patientData);
    setPatients(prev => [data.patient, ...prev]);
    return data.patient;
  };

  const updatePatient = async (id, patientData) => {
    const data = await api.put(`/patients/${id}`, patientData);
    setPatients(prev => prev.map(p => p.id === id ? data.patient : p));
    return data.patient;
  };

  const deletePatient = async (id) => {
    await api.del(`/patients/${id}`);
    setPatients(prev => prev.filter(p => p.id !== id));
  };

  const addSession = async (sessionData) => {
    const data = await api.post("/sessions", sessionData);
    setSessionNotes(prev => [{ ...data.session, recordings: sessionData.recordings || [] }, ...prev]);
    return data.session;
  };

  const addMoodEntry = async (entry) => {
    const data = await api.post("/mood", entry);
    setMoodHistory(prev => [data.entry, ...prev]);
    return data.entry;
  };

  const addJournalEntry = async (entry) => {
    const data = await api.post("/journal", entry);
    setJournalEntries(prev => [data.entry, ...prev]);
    return data.entry;
  };

  const updateJournalEntry = async (id, entry) => {
    const data = await api.put(`/journal/${id}`, entry);
    setJournalEntries(prev => prev.map(e => e.id === id ? data.entry : e));
    return data.entry;
  };

  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedMoodPatientId, setSelectedMoodPatientId] = useState(null);

  const navigateTo = (p) => {
    if (p !== "sessions") setSelectedPatientId(null);
    if (p !== "mood") setSelectedMoodPatientId(null);
    setPage(p);
  };

  // ── Show auth screen if not logged in ───────────────────────────────────
  if (!authChecked) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: colors.bg, fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: colors.primary, marginBottom: 8 }}>PsychAssist</div>
          <div style={{ color: colors.textMuted }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  const renderPage = () => {
    // Check if the page is a pro feature and user is on starter plan
    if (PRO_FEATURES.has(page) && !isPro(user?.plan)) {
      return <ProLockScreen feature={page} userPlan={user?.plan} onUpgrade={() => setShowUpgradeModal(page)} />;
    }
    switch (page) {
      case "dashboard": return <Dashboard moodHistory={moodHistory} journalEntries={journalEntries} sessionNotes={sessionNotes} patients={patients} />;
      case "patients": return <Patients patients={patients} setPatients={setPatients} sessionNotes={sessionNotes} moodHistory={moodHistory} setPage={navigateTo} setSelectedPatientId={setSelectedPatientId} setSelectedMoodPatientId={setSelectedMoodPatientId} addPatient={addPatient} updatePatient={updatePatient} deletePatient={deletePatient} />;
      case "mood": return <MoodTracker moodHistory={moodHistory} setMoodHistory={setMoodHistory} patients={patients} selectedPatientId={selectedMoodPatientId} addMoodEntry={addMoodEntry} />;
      case "journal": return <Journal journalEntries={journalEntries} setJournalEntries={setJournalEntries} addJournalEntry={addJournalEntry} updateJournalEntry={updateJournalEntry} />;
      case "cbt": return <CBTTools />;
      case "breathing": return <BreathingExercise />;
      case "sessions": return <SessionNotes sessionNotes={sessionNotes} setSessionNotes={setSessionNotes} patients={patients} selectedPatientId={selectedPatientId} addSession={addSession} />;
      case "feedback": return <Feedback user={user} />;
      case "settings": return <Settings user={user} onLogout={handleLogout} />;
      default: return null;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: colors.bg, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Sidebar */}
      <div style={{
        width: 220,
        background: colors.card,
        borderRight: `1px solid ${colors.border}`,
        padding: "24px 0",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}>
        <div style={{ padding: "0 20px", marginBottom: 32 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: colors.primary, letterSpacing: -0.5 }}>PsychAssist</div>
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2, textTransform: "uppercase", letterSpacing: 1 }}>Pro Edition</div>
        </div>

        <nav style={{ flex: 1 }}>
          {NAV_ITEMS.map((item) => (
            <div
              key={item.id}
              onClick={() => navigateTo(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 20px",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: page === item.id ? 600 : 400,
                color: page === item.id ? colors.primary : colors.textLight,
                background: page === item.id ? colors.primaryLight : "transparent",
                borderRight: page === item.id ? `3px solid ${colors.primary}` : "3px solid transparent",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              {item.label}
              {item.pro && !isPro(user?.plan) && (
                <span style={{
                  fontSize: 9, fontWeight: 700, background: "#ECC94B", color: "#744210",
                  padding: "1px 6px", borderRadius: 4, textTransform: "uppercase", letterSpacing: 0.5,
                  marginLeft: "auto",
                }}>PRO</span>
              )}
            </div>
          ))}
        </nav>

        {/* User info + logout */}
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 2 }}>{user.fullName || user.email}</div>
          <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8, textTransform: "capitalize" }}>{user.plan} plan</div>
          <button onClick={handleLogout} style={{
            background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
            fontSize: 12, color: colors.textMuted, padding: 0, textDecoration: "underline",
          }}>Log out</button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: 32, overflowY: "auto", maxWidth: 900 }}>
        {renderPage()}
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal
          feature={showUpgradeModal}
          onClose={() => setShowUpgradeModal(null)}
        />
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(PsychAssistApp));
