import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   CREDITSIM — Frontend React complet
   Colonnes modèle exactes : colonnes_modele.json (26 features)
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── Mock store (remplacer par appels API réels) ──────────────────────────────
let AGENT_STORE = [
  { id: 1, email: "agent@banque.fr", password: "demo123", name: "jihad el",
    role: "Agent Senior", agency: "BMCE", createdAt: "2024-01-01T00:00:00Z" }
];
let SIM_STORE = [
  { id: 1, agentId: 1, clientName: "el jihad", age: 35, income: 45000,
    housing: "OWN", employment: 5, creditHistLength: 8, purpose: "PERSONAL",
    grade: "B", amount: 15000, rate: 12.5, defaultHistory: false,
    score: 724, decision: "ACCEPTED", createdAt: "2024-01-15T10:30:00Z" },
  { id: 2, agentId: 1, clientName: "Marie Leblanc", age: 28, income: 28000,
    housing: "RENT", employment: 1, creditHistLength: 2, purpose: "EDUCATION",
    grade: "D", amount: 8000, rate: 18.9, defaultHistory: true,
    score: 312, decision: "REFUSED", createdAt: "2024-01-14T14:20:00Z" },
  { id: 3, agentId: 1, clientName: "Pierre Moreau", age: 42, income: 72000,
    housing: "MORTGAGE", employment: 12, creditHistLength: 15, purpose: "HOME_IMPROVEMENT",
    grade: "A", amount: 25000, rate: 8.2, defaultHistory: false,
    score: 881, decision: "ACCEPTED", createdAt: "2024-01-13T09:15:00Z" },
];

// ─── Scoring engine (réplique du modèle XGBoost pour la démo live) ────────────
function computeScore(d) {
  const income = +d.income || 1; const amount = +d.amount || 0;
  const pct = amount / income;
  const gMap = { A: 220, B: 130, C: 50, D: -90, E: -190, F: -260, G: -310 };
  const pMap = {
    HOME_IMPROVEMENT: 60, EDUCATION: 40, MEDICAL: 30, VENTURE: 20,
    PERSONAL: 0, DEBT_CONSOLIDATION: -40, VACATION: -50
  };
  let s = 500;
  if (pct < 0.2) s += 160; else if (pct < 0.5) s += 90;
  else if (pct < 1) s += 20; else if (pct < 2) s -= 70; else s -= 160;
  s += gMap[d.grade] || 0;
  s += d.housing === "OWN" ? 80 : d.housing === "MORTGAGE" ? 40 : -20;
  const emp = +d.employment || 0;
  s += emp >= 10 ? 80 : emp >= 5 ? 40 : emp >= 2 ? 10 : -50;
  if (d.defaultHistory === true || d.defaultHistory === "true") s -= 220;
  const age = +d.age || 30;
  s += age >= 30 && age <= 55 ? 30 : age < 25 ? -40 : 0;
  s += (+d.rate || 15) < 10 ? 30 : (+d.rate || 15) > 20 ? -60 : 0;
  s += pMap[d.purpose] || 0;
  const hist = +d.creditHistLength || 0;
  s += hist >= 10 ? 40 : hist >= 5 ? 20 : hist < 2 ? -20 : 0;
  return Math.max(0, Math.min(1000, Math.round(s)));
}

// ─── Utilities ────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
const fmtDate = (iso) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
const decision = (score) => score >= 600 ? "ACCEPTED" : "REFUSED";

// ─── Score Gauge ──────────────────────────────────────────────────────────────
function Gauge({ score, size = "lg" }) {
  const r = size === "lg" ? 78 : size === "md" ? 58 : 44;
  const sw = size === "lg" ? 10 : size === "md" ? 8 : 6;
  const cx = r + sw; const cy = r + sw;
  const svgW = cx * 2; const arc = Math.PI * r;
  const prog = (score / 1000) * arc;
  const color = score >= 700 ? "#10b981" : score >= 500 ? "#f59e0b" : "#ef4444";
  const label = score >= 700 ? "Excellent" : score >= 600 ? "Bon" : score >= 500 ? "Moyen" : "Faible";
  const fs = size === "lg" ? 26 : size === "md" ? 20 : 15;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={svgW} height={cy} overflow="visible">
        <path d={`M${sw} ${cy} A${r} ${r} 0 0 1 ${svgW - sw} ${cy}`}
          fill="none" stroke="#1e293b" strokeWidth={sw} strokeLinecap="round" />
        <path d={`M${sw} ${cy} A${r} ${r} 0 0 1 ${svgW - sw} ${cy}`}
          fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={`${prog} ${arc}`} style={{ transition: "stroke-dasharray 0.9s ease" }} />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={fs}
          fontWeight="800" fill={color} fontFamily="'Space Mono',monospace">{score}</text>
        <text x={cx} y={cy + 11} textAnchor="middle" fontSize={size === "lg" ? 11 : 9}
          fill="#475569" fontFamily="inherit">/ 1000</text>
      </svg>
      <span style={{ fontSize: size === "lg" ? 12 : 10, fontWeight: 700, color, letterSpacing: "0.1em" }}>
        {label.toUpperCase()}
      </span>
    </div>
  );
}

// ─── Decision Badge ───────────────────────────────────────────────────────────
function Badge({ d, size = "md" }) {
  const ok = d === "ACCEPTED";
  const p = size === "sm" ? "2px 10px" : "4px 18px";
  const fs = size === "sm" ? 11 : 13;
  return (
    <span style={{
      padding: p, borderRadius: 20, fontSize: fs, fontWeight: 700, letterSpacing: "0.08em",
      background: ok ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
      color: ok ? "#10b981" : "#ef4444",
      border: `1px solid ${ok ? "#10b981" : "#ef4444"}55`
    }}>{ok ? "✓ ACCEPTÉ" : "✗ REFUSÉ"}</span>
  );
}

// ─── Input Field ─────────────────────────────────────────────────────────────
function Field({ label, type = "text", value, onChange, placeholder, icon, required, hint }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.1em" }}>
        {label.toUpperCase()} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      <div style={{ position: "relative" }}>
        {icon && <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: focus ? "#6366f1" : "#475569", transition: "color 0.2s" }}>{icon}</span>}
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} required={required}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{
            width: "100%", padding: icon ? "9px 12px 9px 34px" : "9px 12px",
            background: "#080f1f", border: `1px solid ${focus ? "#6366f1" : "#1a2d4a"}`,
            borderRadius: 8, color: "#e2e8f0", fontSize: 13, outline: "none",
            boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.2s",
            boxShadow: focus ? "0 0 0 3px rgba(99,102,241,0.08)" : "none"
          }} />
      </div>
      {hint && <span style={{ fontSize: 11, color: "#475569" }}>{hint}</span>}
    </div>
  );
}

// ─── Custom Select ────────────────────────────────────────────────────────────
function Select({ label, value, onChange, options, required }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const sel = options.find(o => o.value === value);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.1em" }}>
        {label.toUpperCase()} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      <div ref={ref} style={{ position: "relative", zIndex: open ? 500 : "auto" }}>
        <button type="button" onClick={() => setOpen(!open)} style={{
          width: "100%", padding: "9px 12px",
          background: "#080f1f", border: `1px solid ${open ? "#6366f1" : "#1a2d4a"}`,
          borderRadius: 8, color: sel ? "#e2e8f0" : "#475569", fontSize: 13, textAlign: "left",
          cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
          fontFamily: "inherit", boxShadow: open ? "0 0 0 3px rgba(99,102,241,0.08)" : "none",
          transition: "all 0.2s"
        }}>
          <span>{sel?.label || "Sélectionner…"}</span>
          <span style={{ color: "#6366f1", transform: open ? "rotate(180deg)" : "none", transition: "0.2s" }}>▾</span>
        </button>
        {open && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
            background: "#0a1628", border: "1px solid #1a2d4a", borderRadius: 10,
            maxHeight: 220, overflowY: "auto", zIndex: 9999,
            boxShadow: "0 24px 60px rgba(0,0,0,0.6)"
          }}>
            {options.map(opt => (
              <div key={opt.value} onMouseDown={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  padding: "10px 14px", cursor: "pointer", fontSize: 13,
                  color: value === opt.value ? "#818cf8" : "#cbd5e1",
                  background: value === opt.value ? "rgba(99,102,241,0.12)" : "transparent",
                  borderLeft: value === opt.value ? "2px solid #6366f1" : "2px solid transparent",
                  transition: "all 0.1s"
                }}
                onMouseEnter={e => { if (value !== opt.value) e.currentTarget.style.background = "rgba(99,102,241,0.06)"; }}
                onMouseLeave={e => { if (value !== opt.value) e.currentTarget.style.background = "transparent"; }}
              >{opt.label}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ label, value, onChange, danger }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
      onClick={() => onChange(!value)}>
      <div style={{
        width: 42, height: 23, borderRadius: 12, position: "relative",
        background: value ? (danger ? "#ef4444" : "#6366f1") : "#1a2d4a",
        border: "1px solid #1a2d4a", transition: "background 0.3s", flexShrink: 0
      }}>
        <div style={{
          position: "absolute", top: 3, left: value ? 21 : 3, width: 15, height: 15,
          borderRadius: "50%", background: "white", transition: "left 0.3s",
          boxShadow: "0 1px 4px rgba(0,0,0,0.4)"
        }} />
      </div>
      <span style={{ fontSize: 13, color: value ? (danger ? "#ef4444" : "#818cf8") : "#94a3b8", fontWeight: 600 }}>
        {label}
      </span>
    </div>
  );
}

// ─── Options ─────────────────────────────────────────────────────────────────
const HOUSING_OPTS = [
  { value: "OWN", label: "🏠 Propriétaire" },
  { value: "RENT", label: "🔑 Locataire" },
  { value: "MORTGAGE", label: "🏦 Crédit immobilier" },
  { value: "OTHER", label: "📋 Autre" },
];
const PURPOSE_OPTS = [
  { value: "PERSONAL", label: "💳 Personnel" },
  { value: "HOME_IMPROVEMENT", label: "🔨 Rénovation" },
  { value: "EDUCATION", label: "🎓 Éducation" },
  { value: "MEDICAL", label: "🏥 Médical" },
  { value: "DEBT_CONSOLIDATION", label: "💰 Consolidation dettes" },
  { value: "VENTURE", label: "🚀 Entrepreneuriat" },
];
const GRADE_OPTS = ["A","B","C","D","E","F","G"].map(g => ({
  value: g,
  label: `Grade ${g} — ${["Excellent","Très Bon","Bon","Moyen","Passable","Faible","Très Faible"][["A","B","C","D","E","F","G"].indexOf(g)]}`
}));
const ROLE_OPTS = [
  { value: "Agent", label: "Agent Bancaire" },
  { value: "Agent Senior", label: "Agent Senior" },
  { value: "Responsable", label: "Responsable d'agence" },
  { value: "Analyste", label: "Analyste Crédit" },
];

// ─── Simulation Form ──────────────────────────────────────────────────────────
const EMPTY_FORM = {
  clientName: "", age: "", income: "", housing: "", employment: "",
  creditHistLength: "", purpose: "", grade: "", amount: "", rate: "", defaultHistory: false
};

function SimForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial ? { ...initial } : { ...EMPTY_FORM });
  const [liveScore, setLiveScore] = useState(null);
  const set = k => v => {
    const next = { ...form, [k]: v };
    setForm(next);
    if (next.income && next.amount && next.grade) setLiveScore(computeScore(next));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Live Score Preview */}
      {liveScore !== null && (
        <div style={{
          background: "linear-gradient(135deg,#080f1f,#0a1628)", border: "1px solid #1a2d4a",
          borderRadius: 12, padding: "16px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: "#475569", fontWeight: 700, letterSpacing: "0.1em" }}>APERÇU DU SCORE</p>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>Mis à jour en temps réel</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Gauge score={liveScore} size="sm" />
            <Badge d={decision(liveScore)} />
          </div>
        </div>
      )}

      {/* Infos Client */}
      <Section title="👤 Informations Client">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: "1/-1" }}>
            <Field label="Nom complet du client" value={form.clientName} onChange={set("clientName")}
              placeholder="Ex: Jihad el" icon="👤" required />
          </div>
          <Field label="Âge" type="number" value={form.age} onChange={set("age")} placeholder="35" icon="🎂" required hint="Entre 18 et 80 ans" />
          <Field label="Revenu annuel (€)" type="number" value={form.income} onChange={set("income")} placeholder="45000" icon="💶" required />
        </div>
      </Section>

      {/* Logement & Emploi */}
      <Section title="🏠 Situation Personnelle">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Select label="Type de logement" value={form.housing} onChange={set("housing")} options={HOUSING_OPTS} required />
          <Field label="Ancienneté emploi (années)" type="number" value={form.employment} onChange={set("employment")} placeholder="5" icon="📅" required />
          <Field label="Historique crédit (années)" type="number" value={form.creditHistLength} onChange={set("creditHistLength")} placeholder="8" icon="📊" required hint="cb_person_cred_hist_length" />
        </div>
      </Section>

      {/* Crédit */}
      <Section title="💰 Détails du Crédit">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Select label="Motif du crédit" value={form.purpose} onChange={set("purpose")} options={PURPOSE_OPTS} required />
          <Select label="Grade IA (risque)" value={form.grade} onChange={set("grade")} options={GRADE_OPTS} required />
          <Field label="Montant demandé (€)" type="number" value={form.amount} onChange={set("amount")} placeholder="15000" icon="💰" required />
          <Field label="Taux d'intérêt (%)" type="number" value={form.rate} onChange={set("rate")} placeholder="12.5" icon="📈" required />
        </div>
      </Section>

      {/* Historique */}
      <Section title="⚠️ Historique">
        <Toggle
          label="Défaut de paiement enregistré (cb_person_default_on_file = Y)"
          value={form.defaultHistory}
          onChange={set("defaultHistory")}
          danger
        />
      </Section>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", paddingTop: 4 }}>
        <Btn ghost onClick={onCancel}>Annuler</Btn>
        <Btn primary onClick={() => {
          const s = computeScore(form);
          onSubmit({ ...form, score: s, decision: decision(s) });
        }} disabled={loading || !form.clientName || !form.income || !form.grade || !form.amount}>
          {loading ? "⏳ Calcul en cours…" : "🚀 Calculer & Enregistrer"}
        </Btn>
      </div>
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ background: "#05101e", border: "1px solid #1a2d4a", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #1a2d4a", background: "rgba(99,102,241,0.05)" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#6366f1", letterSpacing: "0.08em" }}>{title}</span>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
function Btn({ children, onClick, primary, ghost, danger, disabled, small, full }) {
  const [hov, setHov] = useState(false);
  const base = {
    padding: small ? "6px 14px" : "10px 22px", borderRadius: 9, border: "1px solid",
    fontSize: small ? 12 : 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit", transition: "all 0.2s", display: "inline-flex",
    alignItems: "center", gap: 6, width: full ? "100%" : undefined,
    justifyContent: full ? "center" : undefined, opacity: disabled ? 0.5 : 1
  };
  if (primary) return (
    <button style={{ ...base, background: disabled ? "#1a2d4a" : hov ? "#4f46e5" : "linear-gradient(135deg,#6366f1,#4f46e5)", borderColor: "#6366f1", color: "white", boxShadow: disabled ? "none" : "0 4px 18px rgba(99,102,241,0.35)" }}
      onClick={!disabled ? onClick : undefined} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>{children}</button>
  );
  if (danger) return (
    <button style={{ ...base, background: hov ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.35)", color: "#ef4444" }}
      onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>{children}</button>
  );
  return (
    <button style={{ ...base, background: hov ? "rgba(99,102,241,0.06)" : "transparent", borderColor: "#1a2d4a", color: "#94a3b8" }}
      onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>{children}</button>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, maxW = 700 }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: 20
    }}>
      <div style={{
        background: "#080f1f", border: "1px solid #1a2d4a", borderRadius: 16,
        width: "100%", maxWidth: maxW, maxHeight: "92vh", overflow: "auto",
        boxShadow: "0 40px 100px rgba(0,0,0,0.8)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #1a2d4a", position: "sticky", top: 0, background: "#080f1f", zIndex: 10 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#e2e8f0" }}>{title}</h3>
          <button onClick={onClose} style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
            color: "#ef4444", width: 30, height: 30, borderRadius: 8,
            cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center"
          }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Sim Card ─────────────────────────────────────────────────────────────────
function SimCard({ sim, onView, onEdit, onDel }) {
  const [hov, setHov] = useState(false);
  const ok = sim.decision === "ACCEPTED";
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      background: "linear-gradient(135deg,#080f1f,#0a1628)",
      border: `1px solid ${ok ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
      borderRadius: 12, padding: 20,
      transform: hov ? "translateY(-3px)" : "none",
      boxShadow: hov ? "0 16px 48px rgba(0,0,0,0.4)" : "none",
      transition: "all 0.25s"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#e2e8f0" }}>{sim.clientName}</h4>
          <p style={{ margin: "3px 0 0", fontSize: 11, color: "#475569" }}>{fmtDate(sim.createdAt)}</p>
        </div>
        <Badge d={sim.decision} size="sm" />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: "#475569" }}>Montant</p>
          <p style={{ margin: "2px 0 0", fontSize: 17, fontWeight: 800, color: "#e2e8f0", fontFamily: "'Space Mono',monospace" }}>{fmt(sim.amount)}</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 11, color: "#475569" }}>Taux</p>
          <p style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 700, color: "#f59e0b", fontFamily: "'Space Mono',monospace" }}>{sim.rate}%</p>
        </div>
        <Gauge score={sim.score} size="sm" />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => onView(sim)} style={{ flex: 1, padding: "7px", borderRadius: 7, border: "1px solid #1a2d4a", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>👁 Voir</button>
        <button onClick={() => onEdit(sim)} style={{ flex: 1, padding: "7px", borderRadius: 7, border: "1px solid rgba(99,102,241,0.35)", background: "rgba(99,102,241,0.07)", color: "#818cf8", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>✏️ Modifier</button>
        <button onClick={() => onDel(sim.id)} style={{ padding: "7px 13px", borderRadius: 7, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.07)", color: "#ef4444", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>🗑</button>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function Stat({ label, val, sub, icon, color = "#6366f1" }) {
  return (
    <div style={{ background: "linear-gradient(135deg,#080f1f,#0a1628)", border: "1px solid #1a2d4a", borderRadius: 12, padding: "18px 22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: "0.12em" }}>{label.toUpperCase()}</p>
          <p style={{ margin: "8px 0 4px", fontSize: 30, fontWeight: 900, color, fontFamily: "'Space Mono',monospace" }}>{val}</p>
          <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>{sub}</p>
        </div>
        <span style={{ fontSize: 26, opacity: 0.5 }}>{icon}</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH PAGES
// ══════════════════════════════════════════════════════════════════════════════
function AuthLayout({ children }) {
  return (
    <div style={{
      minHeight: "100vh", background: "#030a15",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Sora',sans-serif", position: "relative", overflow: "hidden"
    }}>
      {/* Grid bg */}
      <div style={{
        position: "absolute", inset: 0, backgroundImage:
          "linear-gradient(rgba(99,102,241,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.04) 1px,transparent 1px)",
        backgroundSize: "50px 50px"
      }} />
      {/* Glow center */}
      <div style={{
        position: "absolute", width: 700, height: 700, borderRadius: "50%",
        background: "radial-gradient(circle,rgba(99,102,241,0.1) 0%,transparent 70%)",
        top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none"
      }} />
      {/* Glow top-right */}
      <div style={{
        position: "absolute", width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle,rgba(16,185,129,0.06) 0%,transparent 70%)",
        top: "-100px", right: "-100px", pointerEvents: "none"
      }} />
      <div style={{ width: "100%", maxWidth: 460, padding: "0 20px", position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 60, height: 60, borderRadius: 16, marginBottom: 14,
            background: "linear-gradient(135deg,#6366f1,#4f46e5)",
            boxShadow: "0 8px 32px rgba(99,102,241,0.45)"
          }}>
            <span style={{ fontSize: 26 }}>💎</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, color: "#f1f5f9", letterSpacing: "-0.02em" }}>
            Credit<span style={{ color: "#6366f1" }}>Sim</span>
          </h1>
          <p style={{ margin: "6px 0 0", color: "#475569", fontSize: 13 }}>Plateforme d'analyse de risque crédit</p>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin, onGoRegister }) {
  const [email, setEmail] = useState("agent@banque.fr");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = () => {
    if (!email || !password) { setError("Veuillez remplir tous les champs."); return; }
    setLoading(true); setError("");
    setTimeout(() => {
      const user = AGENT_STORE.find(u => u.email === email && u.password === password);
      if (user) onLogin(user);
      else setError("Email ou mot de passe incorrect.");
      setLoading(false);
    }, 800);
  };

  return (
    <AuthLayout>
      <div style={{ background: "#080f1f", border: "1px solid #1a2d4a", borderRadius: 16, padding: "32px", boxShadow: "0 28px 80px rgba(0,0,0,0.5)" }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800, color: "#e2e8f0" }}>Connexion</h2>
        <p style={{ margin: "0 0 24px", fontSize: 13, color: "#475569" }}>Accédez à votre espace agent</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Adresse email" type="email" value={email} onChange={setEmail} placeholder="agent@banque.fr" icon="📧" required />
          <Field label="Mot de passe" type="password" value={password} onChange={setPassword} placeholder="••••••••" icon="🔒" required />
        </div>

        {error && <ErrBox msg={error} />}

        <Btn primary full onClick={submit} disabled={loading} style={{ marginTop: 20 }}>
          {loading ? "⏳ Connexion…" : "Se connecter →"}
        </Btn>
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
            Pas encore de compte ?{" "}
            <span onClick={onGoRegister} style={{ color: "#6366f1", cursor: "pointer", fontWeight: 700, textDecoration: "underline" }}>
              Créer un compte
            </span>
          </p>
        </div>
        <p style={{ margin: "16px 0 0", textAlign: "center", fontSize: 11, color: "#2d3f55", background: "#05101e", border: "1px solid #1a2d4a", borderRadius: 8, padding: "8px 12px" }}>
          🔑 Démo : agent@banque.fr / demo123
        </p>
      </div>
    </AuthLayout>
  );
}

// ─── Register Page ────────────────────────────────────────────────────────────
function RegisterPage({ onRegister, onGoLogin }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", role: "", agency: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [strength, setStrength] = useState(0);

  const set = k => v => {
    setForm(p => ({ ...p, [k]: v }));
    if (k === "password") {
      let s = 0;
      if (v.length >= 8) s++;
      if (/[A-Z]/.test(v)) s++;
      if (/[0-9]/.test(v)) s++;
      if (/[^A-Za-z0-9]/.test(v)) s++;
      setStrength(s);
    }
  };

  const submit = () => {
    if (!form.name || !form.email || !form.password || !form.role)
      return setError("Veuillez remplir tous les champs obligatoires.");
    if (form.password !== form.confirmPassword)
      return setError("Les mots de passe ne correspondent pas.");
    if (form.password.length < 6)
      return setError("Le mot de passe doit contenir au moins 6 caractères.");
    if (AGENT_STORE.find(u => u.email === form.email))
      return setError("Cette adresse email est déjà utilisée.");
    setLoading(true); setError("");
    setTimeout(() => {
      const newUser = {
        id: AGENT_STORE.length + 1,
        email: form.email, password: form.password,
        name: form.name, role: form.role || "Agent",
        agency: form.agency, createdAt: new Date().toISOString()
      };
      AGENT_STORE.push(newUser);
      setSuccess(true);
      setTimeout(() => onRegister(newUser), 1500);
      setLoading(false);
    }, 900);
  };

  const strengthColor = ["#ef4444","#f59e0b","#6366f1","#10b981"][strength - 1] || "#1a2d4a";
  const strengthLabel = ["","Faible","Moyen","Fort","Très fort"][strength] || "";

  return (
    <AuthLayout>
      <div style={{ background: "#080f1f", border: "1px solid #1a2d4a", borderRadius: 16, padding: "32px", boxShadow: "0 28px 80px rgba(0,0,0,0.5)" }}>
        {success ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "#10b981" }}>Compte créé !</h3>
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>Redirection vers votre dashboard…</p>
          </div>
        ) : (
          <>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "#e2e8f0" }}>Créer un compte</h2>
            <p style={{ margin: "0 0 24px", fontSize: 13, color: "#475569" }}>Rejoignez CreditSim en tant qu'agent bancaire</p>

            {/* Étape visuelle */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {["Identité","Accès","Agence"].map((s, i) => (
                <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ height: 3, borderRadius: 2, background: "#1a2d4a", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", background: "#6366f1",
                      width: (form.name && i === 0) || (form.password && i === 1) || (form.agency && i === 2) ? "100%" : "0%",
                      transition: "width 0.4s ease"
                    }} />
                  </div>
                  <span style={{ fontSize: 10, color: "#475569" }}>{s}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Identité */}
              <Field label="Nom complet" value={form.name} onChange={set("name")}
                placeholder="jihad EL " icon="👤" required />
              <Field label="Adresse email professionnelle" type="email" value={form.email}
                onChange={set("email")} placeholder="jihad.el@banque.fr" icon="📧" required />
              <Select label="Rôle" value={form.role} onChange={set("role")} options={ROLE_OPTS} required />

              <div style={{ height: 1, background: "#1a2d4a", margin: "4px 0" }} />

              {/* Mot de passe */}
              <div style={{ position: "relative" }}>
                <Field label="Mot de passe" type={showPwd ? "text" : "password"} value={form.password}
                  onChange={set("password")} placeholder="Min. 6 caractères" icon="🔒" required />
                <button onClick={() => setShowPwd(!showPwd)} style={{
                  position: "absolute", right: 10, top: 27,
                  background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 14
                }}>{showPwd ? "🙈" : "👁"}</button>
              </div>
              {/* Indicateur de force */}
              {form.password && (
                <div style={{ marginTop: -8 }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength ? strengthColor : "#1a2d4a", transition: "background 0.3s" }} />
                    ))}
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: strengthColor }}>{strengthLabel}</p>
                </div>
              )}
              <Field label="Confirmer le mot de passe" type={showPwd ? "text" : "password"}
                value={form.confirmPassword} onChange={set("confirmPassword")}
                placeholder="Répétez le mot de passe" icon="🔐" required />

              <div style={{ height: 1, background: "#1a2d4a", margin: "4px 0" }} />

              {/* Agence */}
              <Field label="Nom de l'agence (optionnel)" value={form.agency} onChange={set("agency")}
                placeholder="Ex: BMCE" icon="🏦"
                hint="Vous pourrez modifier cette information plus tard" />
            </div>

            {error && <ErrBox msg={error} />}

            <div style={{ marginTop: 22 }}>
              <Btn primary full onClick={submit} disabled={loading}>
                {loading ? "⏳ Création du compte…" : "✨ Créer mon compte"}
              </Btn>
            </div>

            <div style={{ marginTop: 20, textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
                Déjà un compte ?{" "}
                <span onClick={onGoLogin} style={{ color: "#6366f1", cursor: "pointer", fontWeight: 700, textDecoration: "underline" }}>
                  Se connecter
                </span>
              </p>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}

function ErrBox({ msg }) {
  return (
    <div style={{
      marginTop: 14, padding: "10px 14px",
      background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
      borderRadius: 8, color: "#fca5a5", fontSize: 13
    }}>⚠️ {msg}</div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN APP (Dashboard)
// ══════════════════════════════════════════════════════════════════════════════
function App({ user, onLogout }) {
  const [sims, setSims] = useState(SIM_STORE.filter(s => s.agentId === user.id));
  const [tab, setTab] = useState("dashboard");
  const [showNew, setShowNew] = useState(false);
  const [editSim, setEditSim] = useState(null);
  const [viewSim, setViewSim] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const total = sims.length;
  const acc = sims.filter(s => s.decision === "ACCEPTED").length;
  const taux = total ? Math.round((acc / total) * 100) : 0;
  const avgScore = total ? Math.round(sims.reduce((a, s) => a + s.score, 0) / total) : 0;
  const avgAmount = total ? sims.reduce((a, s) => a + parseFloat(s.amount), 0) / total : 0;

  const filtered = sims
    .filter(s => s.clientName.toLowerCase().includes(search.toLowerCase()))
    .filter(s => filter === "ALL" || s.decision === filter)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const create = (data) => {
    setLoading(true);
    setTimeout(() => {
      const ns = { ...data, id: Date.now(), agentId: user.id, createdAt: new Date().toISOString() };
      setSims(p => [ns, ...p]);
      SIM_STORE.push(ns);
      setShowNew(false); setLoading(false);
    }, 900);
  };

  const update = (data) => {
    setLoading(true);
    setTimeout(() => {
      setSims(p => p.map(s => s.id === editSim.id ? { ...s, ...data } : s));
      setEditSim(null); setLoading(false);
    }, 900);
  };

  const del = (id) => {
    if (confirm("Supprimer ce dossier ?")) {
      setSims(p => p.filter(s => s.id !== id));
      setViewSim(null);
    }
  };

  const navItems = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "simulations", icon: "📋", label: "Simulations" },
    { id: "analytics", icon: "📈", label: "Analytique" },
    { id: "profile", icon: "👤", label: "Profil" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#030a15", fontFamily: "'Sora',sans-serif", color: "#e2e8f0" }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: sidebarOpen ? 230 : 64, background: "#060d1c", borderRight: "1px solid #1a2d4a",
        display: "flex", flexDirection: "column", transition: "width 0.3s", flexShrink: 0, overflow: "hidden"
      }}>
        {/* Brand */}
        <div style={{ padding: "20px 16px 18px", borderBottom: "1px solid #1a2d4a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {sidebarOpen && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, boxShadow: "0 4px 14px rgba(99,102,241,0.4)" }}>💎</div>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 900, letterSpacing: "-0.01em" }}>Credit<span style={{ color: "#6366f1" }}>Sim</span></p>
                <p style={{ margin: 0, fontSize: 9, color: "#2d3f55", letterSpacing: "0.1em" }}>RISK ENGINE v2.4</p>
              </div>
            </div>
          )}
          {!sidebarOpen && (
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, margin: "0 auto" }}>💎</div>
          )}
          {sidebarOpen && (
            <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 16 }}>◀</button>
          )}
        </div>

        {/* Nav */}
        <nav style={{ padding: "16px 8px", flex: 1 }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} title={item.label} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "9px 10px", borderRadius: 9, border: "none", cursor: "pointer",
              marginBottom: 2, fontSize: 13, fontWeight: 600, fontFamily: "inherit",
              background: tab === item.id ? "rgba(99,102,241,0.14)" : "transparent",
              color: tab === item.id ? "#818cf8" : "#475569",
              borderLeft: tab === item.id ? "2px solid #6366f1" : "2px solid transparent",
              transition: "all 0.2s", whiteSpace: "nowrap", overflow: "hidden"
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              {sidebarOpen && item.label}
            </button>
          ))}
        </nav>

        {/* Collapse toggle (when closed) */}
        {!sidebarOpen && (
          <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 16, padding: "12px", margin: "0 auto" }}>▶</button>
        )}

        {/* User */}
        <div style={{ padding: "12px", borderTop: "1px solid #1a2d4a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: sidebarOpen ? 10 : 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
              {user.name[0]}
            </div>
            {sidebarOpen && (
              <div style={{ overflow: "hidden" }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</p>
                <p style={{ margin: 0, fontSize: 10, color: "#475569" }}>{user.role}</p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button onClick={onLogout} style={{ width: "100%", padding: "7px", borderRadius: 7, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)", color: "#ef4444", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit" }}>
              ↩ Déconnexion
            </button>
          )}
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ padding: "16px 28px", borderBottom: "1px solid #1a2d4a", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(6,13,28,0.85)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 100 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>
              {tab === "dashboard" ? "📊 Dashboard" : tab === "simulations" ? "📋 Simulations" : tab === "analytics" ? "📈 Analytique" : "👤 Profil"}
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#475569" }}>
              {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <Btn primary onClick={() => { setShowNew(true); setTab("simulations"); }}>
            <span style={{ fontSize: 15 }}>+</span> Nouvelle Simulation
          </Btn>
        </div>

        <div style={{ padding: "28px", flex: 1 }}>

          {/* ── DASHBOARD ── */}
          {tab === "dashboard" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, marginBottom: 28 }}>
                <Stat label="Total dossiers" val={total} sub="Toutes périodes" icon="📁" color="#6366f1" />
                <Stat label="Acceptés" val={acc} sub={`Taux: ${taux}%`} icon="✅" color="#10b981" />
                <Stat label="Refusés" val={total - acc} sub="Risque élevé" icon="❌" color="#ef4444" />
                <Stat label="Score moyen" val={avgScore} sub="Sur 1000 pts" icon="🎯" color="#f59e0b" />
              </div>

              {/* Recent + Chart */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 20 }}>
                <div style={{ background: "#080f1f", border: "1px solid #1a2d4a", borderRadius: 14, padding: 22 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Dossiers récents</h3>
                    <Btn ghost small onClick={() => setTab("simulations")}>Voir tout →</Btn>
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1a2d4a" }}>
                        {["Client","Montant","Grade","Score","Décision","Date"].map(h => (
                          <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#475569", fontWeight: 700, letterSpacing: "0.06em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sims.slice(0, 6).map(s => (
                        <tr key={s.id} style={{ borderBottom: "1px solid #0a1628", cursor: "pointer" }}
                          onClick={() => setViewSim(s)}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,0.04)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ padding: "10px 12px", fontWeight: 700, color: "#e2e8f0" }}>{s.clientName}</td>
                          <td style={{ padding: "10px 12px", color: "#94a3b8", fontFamily: "'Space Mono',monospace" }}>{fmt(s.amount)}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(99,102,241,0.12)", color: "#818cf8", fontWeight: 800, fontSize: 11 }}>{s.grade}</span>
                          </td>
                          <td style={{ padding: "10px 12px", fontFamily: "'Space Mono',monospace", fontWeight: 700, color: s.score >= 700 ? "#10b981" : s.score >= 500 ? "#f59e0b" : "#ef4444" }}>{s.score}</td>
                          <td style={{ padding: "10px 12px" }}><Badge d={s.decision} size="sm" /></td>
                          <td style={{ padding: "10px 12px", color: "#475569" }}>{fmtDate(s.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Quick stats */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ background: "#080f1f", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: "18px", textAlign: "center" }}>
                    <p style={{ margin: "0 0 8px", fontSize: 10, color: "#475569", fontWeight: 700, letterSpacing: "0.1em" }}>TAUX D'ACCEPTATION</p>
                    <p style={{ margin: 0, fontSize: 44, fontWeight: 900, color: "#10b981", fontFamily: "'Space Mono',monospace" }}>{taux}%</p>
                  </div>
                  <div style={{ background: "#080f1f", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "18px", textAlign: "center" }}>
                    <p style={{ margin: "0 0 8px", fontSize: 10, color: "#475569", fontWeight: 700, letterSpacing: "0.1em" }}>MONTANT MOYEN</p>
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#f59e0b", fontFamily: "'Space Mono',monospace" }}>{fmt(avgAmount)}</p>
                  </div>
                  <div style={{ background: "#080f1f", border: "1px solid #1a2d4a", borderRadius: 12, padding: "18px" }}>
                    <p style={{ margin: "0 0 12px", fontSize: 10, color: "#475569", fontWeight: 700, letterSpacing: "0.1em" }}>DISTRIBUTION GRADES</p>
                    {["A","B","C","D","E"].map(g => {
                      const c = sims.filter(s => s.grade === g).length;
                      return c > 0 ? (
                        <div key={g} style={{ marginBottom: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                            <span style={{ color: "#64748b", fontWeight: 700 }}>Grade {g}</span>
                            <span style={{ color: "#6366f1", fontFamily: "'Space Mono',monospace" }}>{c}</span>
                          </div>
                          <div style={{ height: 5, background: "#1a2d4a", borderRadius: 3 }}>
                            <div style={{ height: "100%", background: "linear-gradient(90deg,#6366f1,#818cf8)", borderRadius: 3, width: `${(c / total) * 100}%`, transition: "width 0.8s" }} />
                          </div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SIMULATIONS ── */}
          {tab === "simulations" && (
            <div>
              <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                  <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#475569", fontSize: 13 }}>🔍</span>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un client…"
                    style={{ width: "100%", padding: "9px 12px 9px 34px", background: "#080f1f", border: "1px solid #1a2d4a", borderRadius: 9, color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                </div>
                {["ALL","ACCEPTED","REFUSED"].map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    padding: "9px 18px", borderRadius: 9, border: "1px solid",
                    fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    borderColor: filter === f ? "#6366f1" : "#1a2d4a",
                    background: filter === f ? "rgba(99,102,241,0.12)" : "transparent",
                    color: filter === f ? "#818cf8" : "#475569"
                  }}>{f === "ALL" ? "Tous" : f === "ACCEPTED" ? "✓ Acceptés" : "✗ Refusés"}</button>
                ))}
                <span style={{ padding: "9px 14px", background: "rgba(99,102,241,0.08)", borderRadius: 9, fontSize: 12, color: "#6366f1", fontWeight: 800 }}>
                  {filtered.length} dossier{filtered.length !== 1 ? "s" : ""}
                </span>
              </div>

              {filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 0", color: "#475569" }}>
                  <p style={{ fontSize: 48, margin: "0 0 16px" }}>📭</p>
                  <p style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>Aucun dossier</p>
                  <p style={{ fontSize: 13, margin: 0 }}>Créez votre première simulation</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 18 }}>
                  {filtered.map(s => (
                    <SimCard key={s.id} sim={s} onView={setViewSim} onEdit={setEditSim} onDel={del} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ANALYTICS ── */}
          {tab === "analytics" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18, marginBottom: 24 }}>
                <div style={{ background: "#080f1f", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: 22, textAlign: "center" }}>
                  <p style={{ margin: "0 0 8px", fontSize: 10, color: "#475569", fontWeight: 700, letterSpacing: "0.1em" }}>TAUX D'ACCEPTATION</p>
                  <p style={{ margin: 0, fontSize: 52, fontWeight: 900, color: "#10b981", fontFamily: "'Space Mono',monospace" }}>{taux}%</p>
                </div>
                <div style={{ background: "#080f1f", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, padding: 22, textAlign: "center" }}>
                  <p style={{ margin: "0 0 8px", fontSize: 10, color: "#475569", fontWeight: 700, letterSpacing: "0.1em" }}>SCORE MOYEN</p>
                  <p style={{ margin: 0, fontSize: 52, fontWeight: 900, color: "#6366f1", fontFamily: "'Space Mono',monospace" }}>{avgScore}</p>
                </div>
                <div style={{ background: "#080f1f", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: 22, textAlign: "center" }}>
                  <p style={{ margin: "0 0 8px", fontSize: 10, color: "#475569", fontWeight: 700, letterSpacing: "0.1em" }}>MONTANT MOYEN</p>
                  <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: "#f59e0b", fontFamily: "'Space Mono',monospace" }}>{fmt(avgAmount)}</p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div style={{ background: "#080f1f", border: "1px solid #1a2d4a", borderRadius: 14, padding: 22 }}>
                  <h3 style={{ margin: "0 0 18px", fontSize: 14, fontWeight: 800 }}>Distribution des scores</h3>
                  {[
                    { label: "Excellent (700–1000)", count: sims.filter(s => s.score >= 700).length, color: "#10b981" },
                    { label: "Bon (600–699)", count: sims.filter(s => s.score >= 600 && s.score < 700).length, color: "#6366f1" },
                    { label: "Moyen (500–599)", count: sims.filter(s => s.score >= 500 && s.score < 600).length, color: "#f59e0b" },
                    { label: "Faible (0–499)", count: sims.filter(s => s.score < 500).length, color: "#ef4444" },
                  ].map(({ label, count, color }) => (
                    <div key={label} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                        <span style={{ color: "#94a3b8" }}>{label}</span>
                        <span style={{ fontWeight: 800, color, fontFamily: "'Space Mono',monospace" }}>{count}</span>
                      </div>
                      <div style={{ height: 8, background: "#1a2d4a", borderRadius: 4 }}>
                        <div style={{ height: "100%", background: color, borderRadius: 4, width: total ? `${(count / total) * 100}%` : "0%", transition: "width 1s ease" }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ background: "#080f1f", border: "1px solid #1a2d4a", borderRadius: 14, padding: 22 }}>
                  <h3 style={{ margin: "0 0 18px", fontSize: 14, fontWeight: 800 }}>Répartition par motif</h3>
                  {PURPOSE_OPTS.map(({ value, label }) => {
                    const c = sims.filter(s => s.purpose === value).length;
                    return c > 0 ? (
                      <div key={value} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                          <span style={{ color: "#94a3b8" }}>{label}</span>
                          <span style={{ fontWeight: 800, color: "#6366f1", fontFamily: "'Space Mono',monospace" }}>{c}</span>
                        </div>
                        <div style={{ height: 8, background: "#1a2d4a", borderRadius: 4 }}>
                          <div style={{ height: "100%", background: "linear-gradient(90deg,#6366f1,#818cf8)", borderRadius: 4, width: `${(c / total) * 100}%`, transition: "width 1s" }} />
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── PROFILE ── */}
          {tab === "profile" && (
            <div style={{ maxWidth: 600 }}>
              <div style={{ background: "#080f1f", border: "1px solid #1a2d4a", borderRadius: 16, padding: "32px", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
                  <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 900, flexShrink: 0, boxShadow: "0 8px 24px rgba(99,102,241,0.4)" }}>
                    {user.name[0]}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#e2e8f0" }}>{user.name}</h2>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6366f1", fontWeight: 600 }}>{user.role}</p>
                    {user.agency && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#475569" }}>🏦 {user.agency}</p>}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {[
                    { label: "Email", val: user.email, icon: "📧" },
                    { label: "Rôle", val: user.role, icon: "💼" },
                    { label: "Agence", val: user.agency || "Non renseigné", icon: "🏦" },
                    { label: "Membre depuis", val: fmtDate(user.createdAt), icon: "📅" },
                    { label: "Dossiers traités", val: total.toString(), icon: "📁" },
                    { label: "Taux d'acceptation", val: `${taux}%`, icon: "📊" },
                  ].map(({ label, val, icon }) => (
                    <div key={label} style={{ background: "#05101e", border: "1px solid #1a2d4a", borderRadius: 10, padding: "12px 14px" }}>
                      <p style={{ margin: 0, fontSize: 10, color: "#475569", fontWeight: 700, letterSpacing: "0.1em" }}>{icon} {label.toUpperCase()}</p>
                      <p style={{ margin: "5px 0 0", fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{val}</p>
                    </div>
                  ))}
                </div>
              </div>
              <Btn danger full onClick={onLogout}>↩ Se déconnecter</Btn>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showNew && (
        <Modal title="➕ Nouvelle Simulation de Crédit" onClose={() => setShowNew(false)} maxW={740}>
          <SimForm onSubmit={create} onCancel={() => setShowNew(false)} loading={loading} />
        </Modal>
      )}
      {editSim && (
        <Modal title="✏️ Modifier la Simulation" onClose={() => setEditSim(null)} maxW={740}>
          <SimForm initial={editSim} onSubmit={update} onCancel={() => setEditSim(null)} loading={loading} />
        </Modal>
      )}
      {viewSim && (
        <Modal title={`📄 Dossier — ${viewSim.clientName}`} onClose={() => setViewSim(null)} maxW={580}>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {/* Score hero */}
            <div style={{
              background: "linear-gradient(135deg,#080f1f,#0a1628)",
              border: `2px solid ${viewSim.decision === "ACCEPTED" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
              borderRadius: 14, padding: "24px 32px",
              display: "flex", alignItems: "center", justifyContent: "space-around"
            }}>
              <Gauge score={viewSim.score} size="lg" />
              <div style={{ textAlign: "center" }}>
                <Badge d={viewSim.decision} />
                <p style={{ margin: "12px 0 0", fontSize: 12, color: "#475569" }}>Analysé le {fmtDate(viewSim.createdAt)}</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#475569" }}>Taux de remboursement estimé</p>
                <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 900, color: viewSim.decision === "ACCEPTED" ? "#10b981" : "#ef4444", fontFamily: "'Space Mono',monospace" }}>
                  {viewSim.score / 10}%
                </p>
              </div>
            </div>

            {/* Details */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { l: "Âge", v: `${viewSim.age} ans`, i: "🎂" },
                { l: "Revenu annuel", v: fmt(viewSim.income), i: "💶" },
                { l: "Logement", v: HOUSING_OPTS.find(h => h.value === viewSim.housing)?.label || viewSim.housing, i: "🏠" },
                { l: "Ancienneté emploi", v: `${viewSim.employment} ans`, i: "📅" },
                { l: "Historique crédit", v: `${viewSim.creditHistLength} ans`, i: "📊" },
                { l: "Motif", v: PURPOSE_OPTS.find(p => p.value === viewSim.purpose)?.label || viewSim.purpose, i: "🎯" },
                { l: "Grade IA", v: `Grade ${viewSim.grade}`, i: "🏆" },
                { l: "Montant", v: fmt(viewSim.amount), i: "💰" },
                { l: "Taux d'intérêt", v: `${viewSim.rate}%`, i: "📈" },
                { l: "Défaut de paiement", v: viewSim.defaultHistory ? "⚠️ Oui" : "✅ Non", i: "📜" },
              ].map(({ l, v, i }) => (
                <div key={l} style={{ background: "#05101e", border: "1px solid #1a2d4a", borderRadius: 8, padding: "11px 14px" }}>
                  <p style={{ margin: 0, fontSize: 10, color: "#475569", fontWeight: 700, letterSpacing: "0.08em" }}>{i} {l.toUpperCase()}</p>
                  <p style={{ margin: "5px 0 0", fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{v}</p>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <Btn primary onClick={() => { setEditSim(viewSim); setViewSim(null); }}>✏️ Modifier</Btn>
              <Btn danger onClick={() => del(viewSim.id)}>🗑 Supprimer</Btn>
              <Btn ghost onClick={() => setViewSim(null)}>Fermer</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  ROOT COMPONENT — Router Auth
// ══════════════════════════════════════════════════════════════════════════════
export default function CreditSim() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("login"); // "login" | "register"

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=Space+Mono:wght@400;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  if (!user) {
    if (page === "register")
      return <RegisterPage onRegister={(u) => setUser(u)} onGoLogin={() => setPage("login")} />;
    return <LoginPage onLogin={(u) => setUser(u)} onGoRegister={() => setPage("register")} />;
  }
  return <App user={user} onLogout={() => { setUser(null); setPage("login"); }} />;
}
