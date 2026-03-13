import { useState, useMemo, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ── SUPABASE ──────────────────────────────────────────────────────────────────
const SUPA_URL = "https://ojlxpobrkslaqxafpbqu.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbHhwb2Jya3NsYXF4YWZwYnF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNzM4OTQsImV4cCI6MjA4ODk0OTg5NH0.W6nTRkq-TKRo_O8jTkyQGgolQCF2DzHu3Cn-KM2e0aI";
const db = createClient(SUPA_URL, SUPA_KEY);

const toCamel = r => { if (!r) return r; const o = {}; for (const k in r) o[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = r[k]; return o; };
const toSnake = o => { const r = {}; for (const k in o) r[k.replace(/([A-Z])/g, c => `_${c.toLowerCase()}`)] = o[k]; return r; };
const dbAll = async t => { const { data, error } = await db.from(t).select("*").order("id"); if (error) { console.error(t, error); return []; } return (data || []).map(toCamel); };
const dbIns = async (t, o) => { const s = toSnake(o); delete s.id; const { data, error } = await db.from(t).insert(s).select().single(); if (error) { console.error("ins", t, error); return null; } return toCamel(data); };
const dbUpd = async (t, id, o) => { const s = toSnake(o); delete s.id; const { error } = await db.from(t).update(s).eq("id", id); if (error) console.error("upd", t, error); };
const dbDel = async (t, id) => { const { error } = await db.from(t).delete().eq("id", id); if (error) console.error("del", t, error); };

// ── THEME ─────────────────────────────────────────────────────────────────────
const T = { bg: "#ffffff", surface: "#ffffff", surface2: "#f5f5f5", border: "#e5e5e5", accent: "#a0522d", accentHover: "#b8622f", text: "#1a1a1a", textMuted: "#6b7280", textDim: "#9ca3af", green: "#4a7c59", red: "#b84040", yellow: "#9a6f1a", blue: "#3a6b8a", purple: "#7a5a8a" };
const fontStyle = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#fff;color:#1a1a1a;font-family:'DM Sans',sans-serif;}
  input,select,textarea,button{font-family:'DM Sans',sans-serif;}
  ::-webkit-scrollbar{width:5px;height:5px;}
  ::-webkit-scrollbar-track{background:#fff;}
  ::-webkit-scrollbar-thumb{background:#e5e5e5;border-radius:3px;}
  input[type=checkbox]{accent-color:#a0522d;width:15px;height:15px;cursor:pointer;}
  tr:hover > td{background:#f5f5f588;}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
`;

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const DEFAULT_CASE_TYPES = ["EB", "PL", "WIC", "Fleet", "Fire", "PI", "Life", "Other"];
const INSURERS = ["GEGI", "AIG", "AWAC", "China Taiping", "Chubb", "EQ", "Etiqa", "Liberty", "Merimen", "MSIG", "QBE", "SOMPO", "Tokio Marine"];
const STATUS_COLORS = { "New Lead": T.textMuted, "Interested": T.blue, "Proposal Sent": T.yellow, "Negotiating": T.purple, "Won": T.green, "Lost": T.red, "On Hold": T.textDim };
const GEGI_RATES = { "GTL / GLA / GPA": 0.20, "GHS": 0.15, "GP / SP / Dental": 0.10 };
const GEGI_OPTS = ["GTL / GLA / GPA", "GHS", "GP / SP / Dental"];

// ── HELPERS ───────────────────────────────────────────────────────────────────
const TODAY = new Date();
const daysUntil = d => d ? Math.ceil((new Date(d) - TODAY) / 86400000) : null;
const fmtDate = d => d ? new Date(d).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmt$ = n => (n == null || n === "") ? "—" : `$${parseFloat(n).toFixed(2)}`;
const uid = () => Date.now() + Math.floor(Math.random() * 9999);
const isGegiEB = c => c.insurer === "GEGI" && c.category === "EB";
const calcCommission = c => isGegiEB(c) ? (c.breakdown || []).reduce((s, r) => s + (parseFloat(r.amount) || 0) * (GEGI_RATES[r.coverage] || 0), 0) : parseFloat(c.manualCommission) || 0;
const casePremium = c => isGegiEB(c) ? (c.breakdown || []).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0) : parseFloat(c.premium) || 0;

// ── TABLE STYLES ──────────────────────────────────────────────────────────────
const tWrap = { overflowX: "auto", border: `1px solid ${T.border}`, borderRadius: 10 };
const tS = { width: "100%", borderCollapse: "collapse", fontSize: 14 };
const thRow = { background: T.surface2, borderBottom: `2px solid ${T.border}` };
const th = { padding: "10px 14px", color: T.textMuted, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7, textAlign: "left", whiteSpace: "nowrap" };
const td = { padding: "11px 14px", borderBottom: `1px solid ${T.border}33`, verticalAlign: "middle" };
const tdC = { ...td, textAlign: "center" };

// ── SHARED UI ─────────────────────────────────────────────────────────────────
function Spinner() {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, flexDirection: "column", gap: 14 }}>
    <div style={{ width: 32, height: 32, border: `3px solid ${T.border}`, borderTop: `3px solid ${T.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    <p style={{ color: T.textMuted, fontSize: 13 }}>Loading from database…</p>
  </div>;
}
function IconBtn({ onClick, title, icon, color = T.textMuted }) {
  const [h, sh] = useState(false);
  return <button onClick={onClick} title={title} onMouseEnter={() => sh(true)} onMouseLeave={() => sh(false)}
    style={{ background: h ? T.surface2 : "transparent", border: `1px solid ${h ? T.border : "transparent"}`, color: h ? color : T.textDim, borderRadius: 5, width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 13, transition: "all 0.15s", flexShrink: 0 }}>
    {icon}
  </button>;
}
function Badge({ color = T.accent, children }) {
  return <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{children}</span>;
}
function Inp({ label, value, onChange, type = "text", placeholder, rows, style: sx = {} }) {
  const base = { background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 11px", color: T.text, fontSize: 14, outline: "none", width: "100%", ...sx };
  return <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    {label && <label style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</label>}
    {rows ? <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...base, resize: "vertical" }} />
      : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={base} />}
  </div>;
}
function Sel({ label, value, onChange, options }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    {label && <label style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</label>}
    <select value={value} onChange={e => onChange(e.target.value)} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 11px", color: T.text, fontSize: 14, outline: "none" }}>
      <option value="">— Select —</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>;
}
function Btn({ onClick, color = T.accent, children, ghost, small }) {
  const [h, sh] = useState(false);
  return <button onClick={onClick} onMouseEnter={() => sh(true)} onMouseLeave={() => sh(false)}
    style={{ background: ghost ? "transparent" : h ? T.accentHover : color, border: ghost ? `1px solid ${T.border}` : "none", color: ghost ? T.textMuted : "#fff", borderRadius: 6, padding: small ? "5px 12px" : "8px 18px", fontSize: small ? 12.5 : 14, fontWeight: 500, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" }}>
    {children}
  </button>;
}
function Modal({ title, onClose, children, wide }) {
  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
    <div style={{ background: T.surface, borderRadius: 14, padding: 28, width: "100%", maxWidth: wide ? 780 : 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.18)", animation: "fadeIn 0.18s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <h3 style={{ fontSize: 17, fontWeight: 600 }}>{title}</h3>
        <IconBtn onClick={onClose} icon="✕" />
      </div>
      {children}
    </div>
  </div>;
}
function StatCard({ label, value, color = T.text, sub }) {
  return <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "16px 20px" }}>
    <p style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</p>
    <p style={{ fontSize: 22, fontWeight: 700, color }}>{value}</p>
    {sub && <p style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>{sub}</p>}
  </div>;
}
function SH({ title }) { return <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.2, marginBottom: 16 }}>{title}</h2>; }
function DayBadge({ d }) {
  const days = daysUntil(d);
  if (days == null) return <span style={{ color: T.textDim }}>—</span>;
  const col = days < 0 ? T.red : days < 14 ? T.yellow : T.green;
  return <span style={{ color: col, fontWeight: 600, fontSize: 12.5 }}>{days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}</span>;
}
function RowActions({ onEdit, onDelete }) {
  return <div style={{ display: "flex", gap: 3 }}>
    <IconBtn onClick={onEdit} title="Edit" color={T.accent} icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>} />
    <IconBtn onClick={onDelete} title="Delete" color={T.red} icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>} />
  </div>;
}
function CaseTypePicker({ value = [], onChange, options }) {
  const toggle = t => onChange(value.includes(t) ? value.filter(x => x !== t) : [...value, t]);
  return <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <label style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Case Types</label>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map(t => <button key={t} type="button" onClick={() => toggle(t)} style={{ background: value.includes(t) ? T.accent : T.surface2, color: value.includes(t) ? "#fff" : T.textMuted, border: `1px solid ${value.includes(t) ? T.accent : T.border}`, borderRadius: 5, padding: "4px 12px", fontSize: 12.5, fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}>{t}</button>)}
    </div>
    {value.length === 0 && <p style={{ fontSize: 11, color: T.textDim }}>Select one or more types</p>}
  </div>;
}

// ── EMPLOYEE MODAL ────────────────────────────────────────────────────────────
const EMP_COLS = [
  { key: "no", label: "No", w: 44 }, { key: "addRemove", label: "Add/Remove", w: 95 }, { key: "name", label: "Name", w: 160 }, { key: "nric", label: "NRIC/FIN No.", w: 115 },
  { key: "basisOfCoverage", label: "Basis of Coverage", w: 135 }, { key: "relationship", label: "Relationship", w: 110 }, { key: "dateOfHire", label: "Date of Hire", w: 105 },
  { key: "gender", label: "Gender", w: 72 }, { key: "dob", label: "Date of Birth", w: 105 }, { key: "nationality", label: "Nationality", w: 145 }, { key: "country", label: "Country", w: 100 },
  { key: "bankCode", label: "Bank Code", w: 82 }, { key: "branchCode", label: "Branch Code", w: 92 }, { key: "bankAccount", label: "Bank Account No.", w: 140 }, { key: "email", label: "Email", w: 185 },
  { key: "occupationClass", label: "Occ. Class", w: 82 }, { key: "sumAssured", label: "Sum Assured", w: 105 }, { key: "planType", label: "Plan Type", w: 90 }, { key: "date", label: "Date", w: 92 },
  { key: "gpa", label: "GPA", w: 60 }, { key: "gtl", label: "GTL", w: 60 }, { key: "gla", label: "GLA", w: 60 }, { key: "ghs", label: "GHS+MM", w: 80 }, { key: "mmm", label: "MMM", w: 60 },
  { key: "poc", label: "POC", w: 60 }, { key: "os", label: "OS", w: 60 }, { key: "dt", label: "DT", w: 60 },
];
const EMPTY_EMP = EMP_COLS.reduce((a, c) => { a[c.key] = ""; return a; }, {});
function EmployeeModal({ client, onClose, onSave }) {
  const [emps, setEmps] = useState(client.employees || []);
  const [pasteText, setPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const addRow = () => setEmps(e => [...e, { ...EMPTY_EMP, id: uid(), no: String(e.length + 1) }]);
  const delRow = id => setEmps(e => e.filter(x => x.id !== id));
  const upd = (id, k, v) => setEmps(e => e.map(x => x.id === id ? { ...x, [k]: v } : x));
  const parsePaste = () => {
    const lines = pasteText.trim().split("\n").filter(Boolean);
    const keys = EMP_COLS.map(c => c.key);
    const parsed = lines.map((line, i) => { const cells = line.split("\t"); const emp = { ...EMPTY_EMP, id: uid() }; keys.forEach((k, j) => { if (cells[j] !== undefined) emp[k] = cells[j].trim(); }); if (!emp.no) emp.no = String(i + 1); return emp; });
    setEmps(parsed); setPasteText(""); setShowPaste(false);
  };
  return <Modal title={`Employee Listing — ${client.company}`} onClose={onClose} wide>
    <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
      <Btn small onClick={addRow}>+ Add Row</Btn>
      <Btn small ghost onClick={() => setShowPaste(s => !s)}>Paste from Excel</Btn>
      <Btn small onClick={() => onSave(emps)}>Save Listing</Btn>
      <span style={{ color: T.textDim, fontSize: 12 }}>{emps.length} employee{emps.length !== 1 ? "s" : ""}</span>
    </div>
    {showPaste && <div style={{ marginBottom: 16, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: 14 }}>
      <p style={{ color: T.textMuted, fontSize: 12, marginBottom: 8 }}>Paste Excel cells — columns: {EMP_COLS.map(c => c.label).join(" · ")}</p>
      <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={5} placeholder="Paste here..." style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 10px", color: T.text, fontSize: 12, outline: "none", resize: "vertical", fontFamily: "monospace" }} />
      <div style={{ marginTop: 8, display: "flex", gap: 8 }}><Btn small onClick={parsePaste}>Import</Btn><Btn small ghost onClick={() => { setShowPaste(false); setPasteText(""); }}>Cancel</Btn></div>
    </div>}
    <div style={{ overflowX: "auto", maxHeight: 420, border: `1px solid ${T.border}`, borderRadius: 8 }}>
      <table style={{ ...tS, tableLayout: "fixed" }}>
        <thead style={{ position: "sticky", top: 0, zIndex: 2 }}><tr style={thRow}>
          {EMP_COLS.map(c => <th key={c.key} style={{ ...th, width: c.w, minWidth: c.w }}>{c.label}</th>)}
          <th style={{ ...th, width: 36 }}></th>
        </tr></thead>
        <tbody>
          {emps.length === 0 && <tr><td colSpan={EMP_COLS.length + 1} style={{ ...td, textAlign: "center", color: T.textDim, padding: 28 }}>No employees yet.</td></tr>}
          {emps.map(emp => <tr key={emp.id}>
            {EMP_COLS.map(c => <td key={c.key} style={{ ...td, padding: "3px 5px" }}>
              <input value={emp[c.key] || ""} onChange={e => upd(emp.id, c.key, e.target.value)} style={{ width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${T.border}55`, color: T.text, fontSize: 12, outline: "none", padding: "2px 3px" }} />
            </td>)}
            <td style={td}><IconBtn onClick={() => delRow(emp.id)} icon="✕" color={T.red} /></td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </Modal>;
}

// ── GEGI BREAKDOWN EDITOR ─────────────────────────────────────────────────────
function GegiBreakdownEditor({ breakdown, onChange }) {
  const init = (breakdown && breakdown.length > 0) ? breakdown : GEGI_OPTS.map(cov => ({ id: uid(), coverage: cov, amount: "" }));
  const [rows, setRows] = useState(init);
  const upd = (id, k, v) => { const u = rows.map(r => r.id === id ? { ...r, [k]: v } : r); setRows(u); onChange(u); };
  const addRow = () => { const u = [...rows, { id: uid(), coverage: "", amount: "" }]; setRows(u); onChange(u); };
  const delRow = id => { const u = rows.filter(r => r.id !== id); setRows(u); onChange(u); };
  const totP = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const totC = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0) * (GEGI_RATES[r.coverage] || 0), 0);
  return <div style={{ marginTop: 16 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
      <label style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Coverage Breakdown & Commission (Auto-calc)</label>
      <span style={{ fontSize: 11, color: T.accent, fontWeight: 600, background: T.accent + "15", border: `1px solid ${T.accent}33`, borderRadius: 4, padding: "2px 8px" }}>GEGI EB</span>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 110px 100px 32px", gap: 8, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: "8px 8px 0 0", padding: "7px 10px" }}>
      {["Coverage", "Premium ($)", "Rate", "Commission", ""].map((h, i) => <span key={i} style={{ fontSize: 11, color: h === "Commission" ? T.yellow : T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>{h}</span>)}
    </div>
    <div style={{ border: `1px solid ${T.border}`, borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
      {rows.map((r, i) => {
        const rate = GEGI_RATES[r.coverage]; const comm = (parseFloat(r.amount) || 0) * (rate || 0);
        return <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 130px 110px 100px 32px", gap: 8, padding: "7px 10px", alignItems: "center", borderTop: i === 0 ? "none" : `1px solid ${T.border}33`, background: i % 2 === 0 ? T.surface : "#fafafa" }}>
          <select value={r.coverage} onChange={e => upd(r.id, "coverage", e.target.value)} style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 5, padding: "5px 7px", color: T.text, fontSize: 13, outline: "none", width: "100%" }}>
            <option value="">— Select —</option>
            {GEGI_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
            <option value="Other">Other</option>
          </select>
          <input value={r.amount} onChange={e => upd(r.id, "amount", e.target.value)} type="number" placeholder="0.00" style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 5, padding: "5px 7px", color: T.text, fontSize: 13, outline: "none", width: "100%" }} />
          <span style={{ fontSize: 13, color: rate ? T.textMuted : T.textDim, textAlign: "center" }}>{rate ? `${(rate * 100).toFixed(0)}%` : "—"}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: comm > 0 ? T.yellow : T.textDim }}>{comm > 0 ? `$${comm.toFixed(2)}` : "—"}</span>
          <IconBtn onClick={() => delRow(r.id)} icon="✕" color={T.red} />
        </div>;
      })}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 110px 100px 32px", gap: 8, padding: "8px 10px", background: T.surface2, border: `1px solid ${T.border}`, borderTop: "none", borderRadius: "0 0 8px 8px", marginTop: -1 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: T.textMuted }}>Total</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: T.green }}>${totP.toFixed(2)}</span>
      <span /><span style={{ fontSize: 13, fontWeight: 700, color: T.yellow }}>${totC.toFixed(2)}</span><span />
    </div>
    <button onClick={addRow} style={{ marginTop: 8, background: "none", border: `1px dashed ${T.border}`, borderRadius: 6, padding: "5px 14px", color: T.textMuted, fontSize: 12.5, cursor: "pointer", width: "100%" }}>+ Add row</button>
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1 — TO-DO
// ══════════════════════════════════════════════════════════════════════════════
function TodoTab() {
  const [yearly, setYearly] = useState([]);
  const [todos, setTodos] = useState([]);
  const [archived, setArchived] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchive, setShowArchive] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const blank = { deadline: "", priority: "Medium", delegation: "Jayrius", company: "", task: "", notes: "" };
  const [form, setForm] = useState(blank);

  useEffect(() => {
    Promise.all([dbAll("yearly_tasks"), dbAll("todos"), dbAll("archived_tasks")])
      .then(([y, t, a]) => { setYearly(y); setTodos(t); setArchived(a); setLoading(false); });
  }, []);

  const toggleY = async id => {
    const t = yearly.find(x => x.id === id); if (!t) return;
    const nv = !t.done;
    setYearly(y => y.map(x => x.id === id ? { ...x, done: nv } : x));
    await dbUpd("yearly_tasks", id, { done: nv });
  };
  const archiveTask = async id => {
    const task = todos.find(x => x.id === id); if (!task) return;
    setTodos(t => t.filter(x => x.id !== id));
    await dbDel("todos", id);
    const arch = { deadline: task.deadline, priority: task.priority, delegation: task.delegation, company: task.company, task: task.task, notes: task.notes, completedAt: new Date().toISOString() };
    const created = await dbIns("archived_tasks", arch);
    if (created) setArchived(a => [created, ...a]);
  };
  const restore = async id => {
    const task = archived.find(x => x.id === id); if (!task) return;
    setArchived(a => a.filter(x => x.id !== id));
    await dbDel("archived_tasks", id);
    const created = await dbIns("todos", { deadline: task.deadline, priority: task.priority, delegation: task.delegation, company: task.company, task: task.task, notes: task.notes, done: false });
    if (created) setTodos(t => [created, ...t]);
  };
  const delTodo = async id => { setTodos(t => t.filter(x => x.id !== id)); await dbDel("todos", id); };
  const delArch = async id => { setArchived(a => a.filter(x => x.id !== id)); await dbDel("archived_tasks", id); };
  const openAdd = () => { setForm(blank); setEditId(null); setShowAdd(true); };
  const openEdit = t => { setForm({ ...t }); setEditId(t.id); setShowAdd(true); };
  const save = async () => {
    if (!form.task) return;
    if (editId) { setTodos(t => t.map(x => x.id === editId ? { ...x, ...form } : x)); await dbUpd("todos", editId, form); }
    else { const c = await dbIns("todos", { ...form, done: false }); if (c) setTodos(t => [...t, c]); }
    setShowAdd(false);
  };
  const grouped = useMemo(() => { const g = {}; yearly.forEach(t => { (g[t.category] = g[t.category] || []).push(t); }); return g; }, [yearly]);

  if (loading) return <Spinner />;
  return <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
    {/* Yearly */}
    <div>
      <SH title="Yearly Compulsory Tasks" />
      <div style={tWrap}><table style={tS}>
        <thead><tr style={thRow}>{["Category", "Due Date", "Days Left", "Done", "Title", "Agenda"].map(h => <th key={h} style={h === "Done" ? { ...th, textAlign: "center" } : th}>{h}</th>)}</tr></thead>
        <tbody>{Object.entries(grouped).map(([cat, tasks]) => tasks.map((t, i) => (
          <tr key={t.id} style={{ opacity: t.done ? 0.38 : 1 }}>
            <td style={{ ...td, color: T.textMuted, fontSize: 12.5 }}>{i === 0 ? cat : ""}</td>
            <td style={{ ...td, fontSize: 12.5, color: T.textMuted }}>{fmtDate(t.completion)}</td>
            <td style={td}><DayBadge d={t.completion} /></td>
            <td style={tdC}><input type="checkbox" checked={t.done} onChange={() => toggleY(t.id)} /></td>
            <td style={{ ...td, textDecoration: t.done ? "line-through" : "none" }}>{t.title}</td>
            <td style={{ ...td, color: T.textMuted, fontSize: 13 }}>{t.agenda}</td>
          </tr>
        )))}</tbody>
      </table></div>
    </div>
    {/* Action Tasks */}
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.2 }}>Action Tasks</h2>
          <span style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 99, padding: "2px 10px", fontSize: 12, color: T.textMuted }}>{todos.length} active</span>
        </div>
        <Btn onClick={openAdd}>+ Add Task</Btn>
      </div>
      {todos.length === 0
        ? <div style={{ border: `1px dashed ${T.border}`, borderRadius: 8, padding: 28, textAlign: "center", color: T.textDim, fontSize: 14 }}>All clear! No active tasks. 🎉</div>
        : <div style={tWrap}><table style={tS}>
          <thead><tr style={thRow}>{["Deadline", "Countdown", "Priority", "Assigned", "Company", "Task", "Notes", "Done", ""].map(h => <th key={h} style={h === "Done" ? { ...th, textAlign: "center" } : th}>{h}</th>)}</tr></thead>
          <tbody>{todos.map(t => <tr key={t.id}>
            <td style={{ ...td, fontSize: 12.5, color: T.textMuted, whiteSpace: "nowrap" }}>{fmtDate(t.deadline)}</td>
            <td style={td}><DayBadge d={t.deadline} /></td>
            <td style={td}><Badge color={t.priority === "High" ? T.red : t.priority === "Medium" ? T.yellow : T.textMuted}>{t.priority}</Badge></td>
            <td style={td}><Badge color={T.accent}>{t.delegation}</Badge></td>
            <td style={{ ...td, color: T.textMuted, fontSize: 13 }}>{t.company}</td>
            <td style={{ ...td, maxWidth: 220 }}>{t.task}</td>
            <td style={{ ...td, color: T.textDim, fontSize: 13, maxWidth: 200 }}>{t.notes}</td>
            <td style={tdC}><input type="checkbox" checked={false} onChange={() => archiveTask(t.id)} title="Tick to archive" /></td>
            <td style={td}><RowActions onEdit={() => openEdit(t)} onDelete={() => delTodo(t.id)} /></td>
          </tr>)}</tbody>
        </table></div>}
    </div>
    {/* Archive */}
    <div>
      <button onClick={() => setShowArchive(s => !s)} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: showArchive ? 14 : 0 }}>
        <span style={{ fontSize: 16, color: showArchive ? T.accent : T.textMuted }}>{showArchive ? "▼" : "▶"}</span>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: showArchive ? T.text : T.textMuted, letterSpacing: -0.2 }}>Completed Archive</h2>
        {archived.length > 0 && <span style={{ background: T.green + "20", border: `1px solid ${T.green}44`, borderRadius: 99, padding: "2px 10px", fontSize: 12, color: T.green, fontWeight: 600 }}>{archived.length} task{archived.length !== 1 ? "s" : ""}</span>}
      </button>
      {showArchive && (archived.length === 0
        ? <p style={{ color: T.textDim, fontSize: 13, padding: "12px 0" }}>No archived tasks yet.</p>
        : <div style={tWrap}><table style={tS}>
          <thead><tr style={{ ...thRow, background: "#f0faf4" }}>{["Completed On", "Deadline", "Priority", "Assigned", "Company", "Task", "Notes", ""].map(h => <th key={h} style={{ ...th, color: T.green + "bb" }}>{h}</th>)}</tr></thead>
          <tbody>{archived.map(t => <tr key={t.id} style={{ opacity: 0.75 }}>
            <td style={{ ...td, fontSize: 12, color: T.green, whiteSpace: "nowrap", fontWeight: 600 }}>{fmtDate(t.completedAt)}</td>
            <td style={{ ...td, fontSize: 12.5, color: T.textMuted, whiteSpace: "nowrap" }}>{fmtDate(t.deadline)}</td>
            <td style={td}><Badge color={t.priority === "High" ? T.red : t.priority === "Medium" ? T.yellow : T.textMuted}>{t.priority}</Badge></td>
            <td style={td}><Badge color={T.accent}>{t.delegation}</Badge></td>
            <td style={{ ...td, color: T.textMuted, fontSize: 13 }}>{t.company}</td>
            <td style={{ ...td, textDecoration: "line-through", color: T.textMuted, maxWidth: 220 }}>{t.task}</td>
            <td style={{ ...td, color: T.textDim, fontSize: 13, maxWidth: 200 }}>{t.notes}</td>
            <td style={td}><div style={{ display: "flex", gap: 3 }}>
              <button onClick={() => restore(t.id)} title="Restore to active" style={{ background: T.green + "15", border: `1px solid ${T.green}44`, borderRadius: 5, width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 13, color: T.green }}>↩</button>
              <IconBtn onClick={() => delArch(t.id)} title="Delete permanently" color={T.red} icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>} />
            </div></td>
          </tr>)}</tbody>
        </table></div>)}
    </div>
    {showAdd && <Modal title={editId ? "Edit Task" : "New Task"} onClose={() => setShowAdd(false)}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Inp label="Deadline" type="date" value={form.deadline} onChange={v => setForm(p => ({ ...p, deadline: v }))} />
        <Sel label="Priority" value={form.priority} onChange={v => setForm(p => ({ ...p, priority: v }))} options={["High", "Medium", "Low"]} />
        <Sel label="Assigned To" value={form.delegation} onChange={v => setForm(p => ({ ...p, delegation: v }))} options={["Jayrius", "Darrel"]} />
        <Inp label="Company" value={form.company} onChange={v => setForm(p => ({ ...p, company: v }))} />
      </div>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        <Inp label="Task" value={form.task} onChange={v => setForm(p => ({ ...p, task: v }))} placeholder="What needs to be done?" />
        <Inp label="Notes / Context" value={form.notes} onChange={v => setForm(p => ({ ...p, notes: v }))} placeholder="e.g. Last follow up 2 March" />
      </div>
      <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn ghost onClick={() => setShowAdd(false)}>Cancel</Btn>
        <Btn onClick={save}>{editId ? "Update Task" : "Add Task"}</Btn>
      </div>
    </Modal>}
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — CLIENTS
// ══════════════════════════════════════════════════════════════════════════════
function ClientsTab() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [empModal, setEmpModal] = useState(null);
  const [caseTypes] = useState(DEFAULT_CASE_TYPES);
  const makeBlank = () => ({ uen: "", company: "", poc: "", title: "", pocNumber: "", caseTypes: ["EB"], renewal: "", comments: "" });
  const [form, setForm] = useState(makeBlank());
  const blankIns = { date: "", poc: "", note: "", tags: "", loggedBy: "Jayrius" };
  const [insForm, setInsForm] = useState(blankIns);

  useEffect(() => { dbAll("clients").then(d => { setClients(d); setLoading(false); }); }, []);

  const openAdd = () => { setForm(makeBlank()); setEditId(null); setShowAdd(true); };
  const openEdit = c => { setForm({ uen: c.uen, company: c.company, poc: c.poc, title: c.title, pocNumber: c.pocNumber, caseTypes: Array.isArray(c.caseTypes) ? c.caseTypes : [c.caseType || "EB"], renewal: c.renewal || "", comments: c.comments || "" }); setEditId(c.id); setShowAdd(true); };
  const save = async () => {
    if (!form.company) return;
    if (editId) { setClients(c => c.map(x => x.id === editId ? { ...x, ...form } : x)); await dbUpd("clients", editId, form); }
    else { const created = await dbIns("clients", { ...form, employees: [], insights: [] }); if (created) setClients(c => [...c, created]); }
    setShowAdd(false);
  };
  const del = async id => { setClients(c => c.filter(x => x.id !== id)); await dbDel("clients", id); };
  const saveEmps = async (cid, emps) => { setClients(c => c.map(x => x.id === cid ? { ...x, employees: emps } : x)); await dbUpd("clients", cid, { employees: emps }); setEmpModal(null); };
  const addInsight = async cid => {
    if (!insForm.note) return;
    const client = clients.find(x => x.id === cid);
    const newIns = [{ ...insForm, id: uid() }, ...(client.insights || [])];
    setClients(c => c.map(x => x.id === cid ? { ...x, insights: newIns } : x));
    await dbUpd("clients", cid, { insights: newIns });
    setInsForm(blankIns);
  };
  const delInsight = async (cid, iid) => {
    const client = clients.find(x => x.id === cid);
    const newIns = (client.insights || []).filter(i => i.id !== iid);
    setClients(c => c.map(x => x.id === cid ? { ...x, insights: newIns } : x));
    await dbUpd("clients", cid, { insights: newIns });
  };

  const colGrid = "2fr 1.2fr 100px 120px 110px 90px 1.6fr auto";
  if (loading) return <Spinner />;
  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
      <SH title="Client Master List" />
      <Btn onClick={openAdd}>+ Add Client</Btn>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: colGrid, gap: 12, padding: "8px 18px", borderBottom: `2px solid ${T.border}`, background: T.surface2, borderRadius: "8px 8px 0 0" }}>
      {[{ label: "Company", align: "left" }, { label: "POC", align: "left" }, { label: "Contact", align: "center" }, { label: "Case Types", align: "center" }, { label: "Renewal", align: "center" }, { label: "Days Left", align: "center" }, { label: "Comments", align: "left" }, { label: "", align: "left" }]
        .map(h => <span key={h.label} style={{ color: T.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.7, textAlign: h.align, display: "block" }}>{h.label}</span>)}
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 0, border: `1px solid ${T.border}`, borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
      {clients.map((c, idx) => {
        const isExp = expandedId === c.id;
        const types = Array.isArray(c.caseTypes) ? c.caseTypes : (c.caseType ? [c.caseType] : []);
        return <div key={c.id} style={{ borderTop: idx === 0 ? "none" : `1px solid ${T.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: colGrid, gap: 12, padding: "13px 18px", alignItems: "center", cursor: "pointer", background: isExp ? "#faf9f7" : T.surface, transition: "background 0.15s" }}
            onClick={() => setExpandedId(isExp ? null : c.id)}>
            <div><div style={{ fontWeight: 600, fontSize: 14 }}>{c.company}</div><div style={{ color: T.textDim, fontSize: 11, marginTop: 2 }}>{c.uen}</div></div>
            <div><div style={{ fontSize: 13 }}>{c.poc}</div><div style={{ color: T.textDim, fontSize: 11, marginTop: 2 }}>{c.title}</div></div>
            <div style={{ textAlign: "center", color: T.textMuted, fontSize: 13 }}>{c.pocNumber}</div>
            <div style={{ textAlign: "center", display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>{types.map(t => <Badge key={t} color={T.accent}>{t}</Badge>)}</div>
            <div style={{ textAlign: "center", color: T.textMuted, fontSize: 12.5 }}>{fmtDate(c.renewal)}</div>
            <div style={{ textAlign: "center" }}><DayBadge d={c.renewal} /></div>
            <div style={{ color: T.textMuted, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.comments}</div>
            <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}><RowActions onEdit={() => openEdit(c)} onDelete={() => del(c.id)} /></div>
          </div>
          {isExp && <div style={{ background: "#fafafa", borderTop: `1px solid ${T.border}`, padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <p style={{ fontWeight: 600, fontSize: 14 }}>Employee Listing</p>
                <Btn small ghost onClick={() => setEmpModal(c)}>Manage</Btn>
              </div>
              <p style={{ color: T.textDim, fontSize: 13 }}>{(c.employees || []).length} employee{(c.employees || []).length !== 1 ? "s" : ""} on record</p>
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 6 }}>Client Comments</label>
                <textarea value={c.comments || ""} rows={3}
                  onChange={async e => { const v = e.target.value; setClients(cl => cl.map(x => x.id === c.id ? { ...x, comments: v } : x)); await dbUpd("clients", c.id, { comments: v }); }}
                  style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 10px", color: T.text, fontSize: 13, outline: "none", resize: "vertical" }} />
              </div>
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Insights & Conversations</p>
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 14, marginBottom: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <Inp label="Date" type="date" value={insForm.date} onChange={v => setInsForm({ ...insForm, date: v })} />
                  <Inp label="Contact" value={insForm.poc} onChange={v => setInsForm({ ...insForm, poc: v })} placeholder="Who did you speak with?" />
                  <Sel label="Logged by" value={insForm.loggedBy} onChange={v => setInsForm({ ...insForm, loggedBy: v })} options={["Jayrius", "Darrel"]} />
                  <Inp label="Tags" value={insForm.tags} onChange={v => setInsForm({ ...insForm, tags: v })} placeholder="Renewal, Upsell..." />
                </div>
                <Inp label="Note" value={insForm.note} onChange={v => setInsForm({ ...insForm, note: v })} rows={3} placeholder="What was discussed?" />
                <div style={{ marginTop: 10 }}><Btn small onClick={() => addInsight(c.id)}>+ Add Note</Btn></div>
              </div>
              <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                {(c.insights || []).length === 0 && <p style={{ color: T.textDim, fontSize: 13 }}>No notes yet.</p>}
                {(c.insights || []).map(ins => <div key={ins.id} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "11px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 7 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <Badge color={ins.loggedBy === "Jayrius" ? T.accent : T.purple}>{ins.loggedBy}</Badge>
                      {ins.poc && <span style={{ color: T.textMuted, fontSize: 12 }}>· {ins.poc}</span>}
                      <span style={{ color: T.textDim, fontSize: 12 }}>{fmtDate(ins.date)}</span>
                    </div>
                    <IconBtn onClick={() => delInsight(c.id, ins.id)} icon="✕" color={T.red} />
                  </div>
                  <p style={{ color: T.text, fontSize: 14, lineHeight: 1.6 }}>{ins.note}</p>
                  {ins.tags && <div style={{ marginTop: 8, display: "flex", gap: 5, flexWrap: "wrap" }}>{ins.tags.split(",").map(t => <span key={t} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 99, padding: "1px 9px", fontSize: 11, color: T.textMuted }}>{t.trim()}</span>)}</div>}
                </div>)}
              </div>
            </div>
          </div>}
        </div>;
      })}
    </div>
    {showAdd && <Modal title={editId ? "Edit Client" : "Add Client"} onClose={() => setShowAdd(false)}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Inp label="UEN" value={form.uen} onChange={v => setForm(p => ({ ...p, uen: v }))} />
        <Inp label="Company Name" value={form.company} onChange={v => setForm(p => ({ ...p, company: v }))} />
        <Inp label="POC Name" value={form.poc} onChange={v => setForm(p => ({ ...p, poc: v }))} />
        <Inp label="Title" value={form.title} onChange={v => setForm(p => ({ ...p, title: v }))} />
        <Inp label="Contact Number" value={form.pocNumber} onChange={v => setForm(p => ({ ...p, pocNumber: v }))} />
        <Inp label="Renewal Date" type="date" value={form.renewal} onChange={v => setForm(p => ({ ...p, renewal: v }))} />
      </div>
      <div style={{ marginTop: 14 }}><CaseTypePicker value={form.caseTypes || []} onChange={v => setForm(p => ({ ...p, caseTypes: v }))} options={caseTypes} /></div>
      <div style={{ marginTop: 14 }}><Inp label="Comments" value={form.comments} onChange={v => setForm(p => ({ ...p, comments: v }))} rows={3} /></div>
      <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn ghost onClick={() => setShowAdd(false)}>Cancel</Btn>
        <Btn onClick={save}>{editId ? "Update" : "Add Client"}</Btn>
      </div>
    </Modal>}
    {empModal && <EmployeeModal client={empModal} onClose={() => setEmpModal(null)} onSave={emps => saveEmps(empModal.id, emps)} />}
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3 — CASES
// ══════════════════════════════════════════════════════════════════════════════
function CasesTab() {
  const [clients, setClients] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [caseTypes, setCaseTypes] = useState(DEFAULT_CASE_TYPES);
  const [showAdd, setShowAdd] = useState(false);
  const [showTypeEdit, setShowTypeEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [newType, setNewType] = useState("");
  const makeBlank = () => ({ clientUen: "", company: "", date: "", category: "EB", policyName: "", insurer: "GEGI", premium: "", manualCommission: "", gst: "", assignment: "Jayrius", renewal: "", comments: "", breakdown: GEGI_OPTS.map(cov => ({ id: uid(), coverage: cov, amount: "" })) });
  const [form, setForm] = useState(makeBlank());

  useEffect(() => { Promise.all([dbAll("clients"), dbAll("cases")]).then(([cl, ca]) => { setClients(cl); setCases(ca); setLoading(false); }); }, []);

  const openAdd = () => { setForm(makeBlank()); setEditId(null); setShowAdd(true); };
  const openEdit = c => { setForm({ ...c, breakdown: (c.breakdown && c.breakdown.length > 0) ? c.breakdown : GEGI_OPTS.map(cov => ({ id: uid(), coverage: cov, amount: "" })) }); setEditId(c.id); setShowAdd(true); };
  const save = async () => {
    if (!form.company) return;
    if (editId) { setCases(c => c.map(x => x.id === editId ? { ...x, ...form } : x)); await dbUpd("cases", editId, form); }
    else { const created = await dbIns("cases", form); if (created) setCases(c => [...c, created]); }
    setShowAdd(false);
  };
  const del = async id => { setCases(c => c.filter(x => x.id !== id)); await dbDel("cases", id); };
  const pickClient = uen => { const cl = clients.find(c => c.uen === uen); setForm(f => ({ ...f, clientUen: uen, company: cl ? cl.company : "" })); };
  const gegiMode = form.insurer === "GEGI" && form.category === "EB";
  const totPremium = cases.reduce((s, c) => s + casePremium(c), 0);
  const totComm = cases.reduce((s, c) => s + calcCommission(c), 0);

  if (loading) return <Spinner />;
  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
      <SH title="All Cases" />
      <div style={{ display: "flex", gap: 10 }}>
        <Btn ghost small onClick={() => setShowTypeEdit(true)}>⚙ Case Types</Btn>
        <Btn onClick={openAdd}>+ Add Case</Btn>
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 22 }}>
      <StatCard label="Total Cases" value={cases.length} />
      <StatCard label="Total Premiums" value={`$${totPremium.toFixed(2)}`} color={T.green} />
      <StatCard label="Est. Commission" value={`$${totComm.toFixed(2)}`} color={T.yellow} />
    </div>
    <div style={tWrap}><table style={tS}>
      <thead><tr style={thRow}>{["Client (UEN)", "Date", "Type", "Policy", "Insurer", "Premium", "Commission", "GST", "Assigned", "Renewal", "Comments", ""].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
      <tbody>{cases.map(c => {
        const gegiEB = isGegiEB(c); const prem = casePremium(c); const comm = calcCommission(c);
        return <tr key={c.id}>
          <td style={td}><div style={{ fontWeight: 600, fontSize: 13.5 }}>{c.company}</div><div style={{ color: T.textDim, fontSize: 11 }}>{c.clientUen}</div></td>
          <td style={{ ...td, fontSize: 12.5, color: T.textMuted }}>{fmtDate(c.date)}</td>
          <td style={td}><Badge color={T.accent}>{c.category}</Badge></td>
          <td style={{ ...td, fontSize: 12.5, color: T.textMuted }}>{c.policyName}</td>
          <td style={td}><div style={{ display: "flex", flexDirection: "column", gap: 3 }}><Badge color={T.textMuted}>{c.insurer}</Badge>{gegiEB && <span style={{ fontSize: 10, color: T.accent, fontWeight: 600 }}>Auto-calc</span>}</div></td>
          <td style={{ ...td, fontWeight: 600, color: T.green }}>{prem > 0 ? fmt$(prem) : "—"}</td>
          <td style={{ ...td, fontWeight: 600, color: T.yellow }}>{comm > 0 ? fmt$(comm) : "—"}{gegiEB && comm > 0 && <div style={{ fontSize: 10, color: T.textDim, fontWeight: 400 }}>{(c.breakdown || []).filter(r => parseFloat(r.amount) > 0).map(r => `${r.coverage.split(" ")[0]} ${((GEGI_RATES[r.coverage] || 0) * 100).toFixed(0)}%`).join(" · ")}</div>}</td>
          <td style={td}>{fmt$(c.gst)}</td>
          <td style={td}><Badge color={T.blue}>{c.assignment}</Badge></td>
          <td style={{ ...td, fontSize: 12.5 }}>{fmtDate(c.renewal)}</td>
          <td style={{ ...td, fontSize: 12.5, color: T.textDim, maxWidth: 140 }}>{c.comments}</td>
          <td style={td}><RowActions onEdit={() => openEdit(c)} onDelete={() => del(c.id)} /></td>
        </tr>;
      })}</tbody>
    </table></div>
    {showTypeEdit && <Modal title="Manage Case Types" onClose={() => setShowTypeEdit(false)}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        {caseTypes.map(t => <div key={t} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 12px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13.5 }}>{t}</span>
          <IconBtn onClick={() => setCaseTypes(c => c.filter(x => x !== t))} icon="✕" color={T.red} />
        </div>)}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <input value={newType} onChange={e => setNewType(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newType.trim()) { setCaseTypes(c => [...c, newType.trim()]); setNewType(""); } }} placeholder="New type..."
          style={{ flex: 1, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 11px", color: T.text, fontSize: 14, outline: "none" }} />
        <Btn small onClick={() => { if (newType.trim() && !caseTypes.includes(newType.trim())) { setCaseTypes(c => [...c, newType.trim()]); setNewType(""); } }}>Add</Btn>
      </div>
      <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end" }}><Btn ghost onClick={() => setShowTypeEdit(false)}>Done</Btn></div>
    </Modal>}
    {showAdd && <Modal title={editId ? "Edit Case" : "Add Case"} onClose={() => setShowAdd(false)} wide>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 5 }}>Client (UEN)</label>
        <select value={form.clientUen} onChange={e => pickClient(e.target.value)} style={{ width: "100%", background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 11px", color: T.text, fontSize: 14, outline: "none" }}>
          <option value="">— Select client —</option>
          {clients.map(c => <option key={c.uen} value={c.uen}>{c.uen} — {c.company}</option>)}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <Inp label="Company (auto-filled)" value={form.company} onChange={v => setForm(p => ({ ...p, company: v }))} />
        <Inp label="Date" type="date" value={form.date} onChange={v => setForm(p => ({ ...p, date: v }))} />
        <Inp label="Renewal Date" type="date" value={form.renewal} onChange={v => setForm(p => ({ ...p, renewal: v }))} />
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Case Type</label>
          <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 11px", color: T.text, fontSize: 14, outline: "none" }}>
            {caseTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Insurer</label>
          <select value={form.insurer} onChange={e => setForm(p => ({ ...p, insurer: e.target.value }))} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 11px", color: T.text, fontSize: 14, outline: "none" }}>
            {INSURERS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <Inp label="Policy Name" value={form.policyName} onChange={v => setForm(p => ({ ...p, policyName: v }))} />
        <Sel label="Assigned To" value={form.assignment} onChange={v => setForm(p => ({ ...p, assignment: v }))} options={["Jayrius", "Darrel"]} />
        <Inp label="GST ($)" type="number" value={form.gst} onChange={v => setForm(p => ({ ...p, gst: v }))} />
      </div>
      {gegiMode
        ? <GegiBreakdownEditor breakdown={form.breakdown} onChange={rows => setForm(p => ({ ...p, breakdown: rows }))} />
        : <div style={{ marginTop: 16, padding: 16, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8 }}>
          <p style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>Premium & Commission — Manual Entry</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Inp label="Total Premium ($)" type="number" value={form.premium} onChange={v => setForm(p => ({ ...p, premium: v }))} placeholder="Enter premium before GST" />
            <Inp label="Commission ($)" type="number" value={form.manualCommission} onChange={v => setForm(p => ({ ...p, manualCommission: v }))} placeholder="Enter your commission amount" />
          </div>
          <p style={{ fontSize: 12, color: T.textDim, marginTop: 10 }}>For non-GEGI or non-EB policies — enter values directly.</p>
        </div>}
      <div style={{ marginTop: 14 }}><Inp label="Comments" value={form.comments} onChange={v => setForm(p => ({ ...p, comments: v }))} rows={2} /></div>
      <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn ghost onClick={() => setShowAdd(false)}>Cancel</Btn>
        <Btn onClick={save}>{editId ? "Update Case" : "Add Case"}</Btn>
      </div>
    </Modal>}
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 4 — FINANCES
// ══════════════════════════════════════════════════════════════════════════════
function FinancesTab() {
  const [expenses, setExpenses] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const blank = { date: "", spender: "Jayrius", amount: "", item: "", reason: "", settled: false };
  const [form, setForm] = useState(blank);

  useEffect(() => { Promise.all([dbAll("expenses"), dbAll("cases")]).then(([e, c]) => { setExpenses(e); setCases(c); setLoading(false); }); }, []);

  const toggleSettle = async id => { const e = expenses.find(x => x.id === id); if (!e) return; const nv = !e.settled; setExpenses(ex => ex.map(x => x.id === id ? { ...x, settled: nv } : x)); await dbUpd("expenses", id, { settled: nv }); };
  const addExp = async () => { if (!form.item || !form.amount) return; const created = await dbIns("expenses", { ...form, amount: parseFloat(form.amount) }); if (created) setExpenses(e => [...e, created]); setForm(blank); setShowAdd(false); };
  const del = async id => { setExpenses(e => e.filter(x => x.id !== id)); await dbDel("expenses", id); };

  const totalComm = cases.reduce((s, c) => s + calcCommission(c), 0);
  const totalExp = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const unsettled = expenses.filter(e => !e.settled).reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const netPL = totalComm - totalExp;
  const spenders = ["Jayrius", "Darrel"];
  const bySpender = spenders.reduce((acc, s) => { const sp = expenses.filter(e => e.spender === s); acc[s] = { total: sp.reduce((x, e) => x + parseFloat(e.amount || 0), 0), unsettled: sp.filter(e => !e.settled).reduce((x, e) => x + parseFloat(e.amount || 0), 0) }; return acc; }, {});
  const maxBar = Math.max(totalComm, totalExp, Math.abs(netPL), 1);
  const bars = [{ label: "Est. Commission", val: totalComm, color: T.green }, { label: "Total Expenses", val: totalExp, color: T.red }, { label: "Net P&L", val: netPL, color: netPL >= 0 ? T.blue : T.red, note: netPL < 0 ? " (loss)" : "" }];

  if (loading) return <Spinner />;
  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
      <SH title="Finances" />
      <Btn onClick={() => setShowAdd(true)}>+ Add Expense</Btn>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 22 }}>
      <StatCard label="Est. Commission" value={`$${totalComm.toFixed(2)}`} color={T.green} />
      <StatCard label="Total Expenses" value={`$${totalExp.toFixed(2)}`} color={T.red} />
      <StatCard label="Net P&L" value={`$${netPL.toFixed(2)}`} color={netPL >= 0 ? T.blue : T.red} />
      <StatCard label="Unsettled" value={`$${unsettled.toFixed(2)}`} color={unsettled > 0 ? T.yellow : T.green} sub="Pending reimbursement" />
    </div>
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "22px 26px", marginBottom: 22 }}>
      <p style={{ color: T.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 18 }}>P&L Overview</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {bars.map(b => <div key={b.label}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: T.textMuted, fontSize: 14 }}>{b.label}</span>
            <span style={{ color: b.color, fontWeight: 700, fontSize: 15 }}>${Math.abs(b.val).toFixed(2)}{b.note}</span>
          </div>
          <div style={{ background: T.surface2, borderRadius: 6, height: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(Math.abs(b.val) / maxBar) * 100}%`, background: b.color, borderRadius: 6, transition: "width 0.5s ease" }} />
          </div>
        </div>)}
      </div>
      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {spenders.map(s => <div key={s} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 16px" }}>
          <p style={{ color: T.textMuted, fontSize: 11, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.8 }}>{s}</p>
          <p style={{ fontWeight: 700, fontSize: 15 }}>${bySpender[s]?.total.toFixed(2)}</p>
          <p style={{ color: bySpender[s]?.unsettled > 0 ? T.red : T.textDim, fontSize: 12.5, marginTop: 3 }}>Unsettled: ${bySpender[s]?.unsettled.toFixed(2)}</p>
        </div>)}
      </div>
    </div>
    <div style={tWrap}><table style={tS}>
      <thead><tr style={thRow}>{["#", "Date", "Spender", "Amount", "Item", "Reason", "Settled", ""].map(h => <th key={h} style={h === "Settled" ? { ...th, textAlign: "center" } : th}>{h}</th>)}</tr></thead>
      <tbody>{expenses.map((e, i) => <tr key={e.id} style={{ background: !e.settled ? "#fff0f0" : "transparent" }}>
        <td style={{ ...td, color: T.textDim, fontSize: 12.5 }}>{i + 1}</td>
        <td style={{ ...td, fontSize: 12.5, color: T.textMuted }}>{fmtDate(e.date)}</td>
        <td style={td}><Badge color={e.spender === "Jayrius" ? T.accent : T.purple}>{e.spender}</Badge></td>
        <td style={{ ...td, color: !e.settled ? T.red : T.green, fontWeight: 700 }}>${parseFloat(e.amount || 0).toFixed(2)}</td>
        <td style={td}>{e.item}</td>
        <td style={{ ...td, color: T.textMuted, fontSize: 13.5 }}>{e.reason}</td>
        <td style={tdC}><input type="checkbox" checked={e.settled} onChange={() => toggleSettle(e.id)} /></td>
        <td style={td}><IconBtn onClick={() => del(e.id)} color={T.red} icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>} /></td>
      </tr>)}</tbody>
    </table></div>
    <p style={{ color: T.textDim, fontSize: 12, marginTop: 8 }}>Red rows = unsettled expenses</p>
    {showAdd && <Modal title="Add Expense" onClose={() => setShowAdd(false)}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Inp label="Date" type="date" value={form.date} onChange={v => setForm(p => ({ ...p, date: v }))} />
        <Sel label="Spender" value={form.spender} onChange={v => setForm(p => ({ ...p, spender: v }))} options={["Jayrius", "Darrel"]} />
        <Inp label="Amount ($)" type="number" value={form.amount} onChange={v => setForm(p => ({ ...p, amount: v }))} />
        <Inp label="Item" value={form.item} onChange={v => setForm(p => ({ ...p, item: v }))} />
      </div>
      <div style={{ marginTop: 14 }}><Inp label="Reason" value={form.reason} onChange={v => setForm(p => ({ ...p, reason: v }))} /></div>
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={form.settled} onChange={e => setForm(p => ({ ...p, settled: e.target.checked }))} />
        <label style={{ color: T.textMuted, fontSize: 14 }}>Already Settled</label>
      </div>
      <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn ghost onClick={() => setShowAdd(false)}>Cancel</Btn>
        <Btn onClick={addExp}>Add Expense</Btn>
      </div>
    </Modal>}
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 5 — PROSPECTS
// ══════════════════════════════════════════════════════════════════════════════
function ProspectsTab() {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filter, setFilter] = useState("All");
  const blank = { name: "", company: "", phone: "", source: "Cold Call", status: "New Lead", lastContact: "", nextAction: "", assignedTo: "Jayrius", notes: "" };
  const [form, setForm] = useState(blank);

  useEffect(() => { dbAll("prospects").then(d => { setProspects(d); setLoading(false); }); }, []);

  const statuses = ["All", "New Lead", "Interested", "Proposal Sent", "Negotiating", "Won", "Lost", "On Hold"];
  const filtered = filter === "All" ? prospects : prospects.filter(p => p.status === filter);
  const counts = statuses.slice(1).reduce((acc, s) => { acc[s] = prospects.filter(p => p.status === s).length; return acc; }, {});
  const openAdd = () => { setForm(blank); setEditId(null); setShowAdd(true); };
  const openEdit = p => { setForm({ ...p }); setEditId(p.id); setShowAdd(true); };
  const save = async () => {
    if (!form.name) return;
    if (editId) { setProspects(p => p.map(x => x.id === editId ? { ...x, ...form } : x)); await dbUpd("prospects", editId, form); }
    else { const c = await dbIns("prospects", form); if (c) setProspects(p => [...p, c]); }
    setShowAdd(false);
  };
  const del = async id => { setProspects(p => p.filter(x => x.id !== id)); await dbDel("prospects", id); };

  if (loading) return <Spinner />;
  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
      <SH title="Prospects Pipeline" />
      <Btn onClick={openAdd}>+ Add Prospect</Btn>
    </div>
    <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
      {statuses.map(s => <button key={s} onClick={() => setFilter(s)} style={{ background: filter === s ? (STATUS_COLORS[s] || T.accent) + "22" : T.surface, border: `1px solid ${filter === s ? (STATUS_COLORS[s] || T.accent) : T.border}`, color: filter === s ? (STATUS_COLORS[s] || T.accent) : T.textMuted, borderRadius: 20, padding: "6px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}>
        {s}{s !== "All" && counts[s] > 0 ? ` (${counts[s]})` : ""}</button>)}
    </div>
    <div style={tWrap}><table style={tS}>
      <thead><tr style={thRow}>{["Name", "Company", "Phone", "Source", "Status", "Last Contact", "Next Action", "Assigned", "Notes", ""].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
      <tbody>{filtered.map(p => <tr key={p.id}>
        <td style={{ ...td, fontWeight: 600 }}>{p.name}</td>
        <td style={{ ...td, color: T.textMuted }}>{p.company}</td>
        <td style={{ ...td, fontSize: 13 }}>{p.phone}</td>
        <td style={td}><Badge color={T.textMuted}>{p.source}</Badge></td>
        <td style={td}><Badge color={STATUS_COLORS[p.status] || T.textMuted}>{p.status}</Badge></td>
        <td style={{ ...td, fontSize: 12.5, color: T.textMuted }}>{fmtDate(p.lastContact)}</td>
        <td style={{ ...td, fontSize: 13.5 }}>{p.nextAction}</td>
        <td style={td}><Badge color={T.accent}>{p.assignedTo}</Badge></td>
        <td style={{ ...td, fontSize: 13, color: T.textDim, maxWidth: 180 }}>{p.notes}</td>
        <td style={td}><RowActions onEdit={() => openEdit(p)} onDelete={() => del(p.id)} /></td>
      </tr>)}</tbody>
    </table></div>
    {showAdd && <Modal title={editId ? "Edit Prospect" : "Add Prospect"} onClose={() => setShowAdd(false)}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Inp label="Name" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} />
        <Inp label="Company" value={form.company} onChange={v => setForm(p => ({ ...p, company: v }))} />
        <Inp label="Phone" value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} />
        <Sel label="Source" value={form.source} onChange={v => setForm(p => ({ ...p, source: v }))} options={["Cold Call", "Referral", "Walk-in", "Event", "Online", "Other"]} />
        <Sel label="Status" value={form.status} onChange={v => setForm(p => ({ ...p, status: v }))} options={statuses.slice(1)} />
        <Sel label="Assigned To" value={form.assignedTo} onChange={v => setForm(p => ({ ...p, assignedTo: v }))} options={["Jayrius", "Darrel"]} />
        <Inp label="Last Contact Date" type="date" value={form.lastContact} onChange={v => setForm(p => ({ ...p, lastContact: v }))} />
        <Inp label="Next Action" value={form.nextAction} onChange={v => setForm(p => ({ ...p, nextAction: v }))} />
      </div>
      <div style={{ marginTop: 14 }}><Inp label="Notes" value={form.notes} onChange={v => setForm(p => ({ ...p, notes: v }))} rows={2} /></div>
      <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn ghost onClick={() => setShowAdd(false)}>Cancel</Btn>
        <Btn onClick={save}>{editId ? "Update" : "Add Prospect"}</Btn>
      </div>
    </Modal>}
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 6 — RESOURCES
// ══════════════════════════════════════════════════════════════════════════════
function ResourcesTab() {
  const [links, setLinks] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contactSearch, setContactSearch] = useState("");
  const [showAddLink, setShowAddLink] = useState(false);
  const [editLinkId, setEditLinkId] = useState(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [editContactId, setEditContactId] = useState(null);
  const blankLink = { details: "", link: "", inputDate: "", comments: "" };
  const blankContact = { name: "", company: "", role: "", phone: "", email: "", specialty: "", notes: "" };
  const [linkForm, setLinkForm] = useState(blankLink);
  const [contactForm, setContactForm] = useState(blankContact);

  useEffect(() => { Promise.all([dbAll("links"), dbAll("industry_contacts")]).then(([l, c]) => { setLinks(l); setContacts(c); setLoading(false); }); }, []);

  const openEditLink = l => { setLinkForm({ ...l }); setEditLinkId(l.id); setShowAddLink(true); };
  const saveLink = async () => {
    if (!linkForm.details) return;
    if (editLinkId) { setLinks(l => l.map(x => x.id === editLinkId ? { ...x, ...linkForm } : x)); await dbUpd("links", editLinkId, linkForm); }
    else { const c = await dbIns("links", linkForm); if (c) setLinks(l => [...l, c]); }
    setShowAddLink(false); setEditLinkId(null); setLinkForm(blankLink);
  };
  const delLink = async id => { setLinks(l => l.filter(x => x.id !== id)); await dbDel("links", id); };

  const openEditContact = c => { setContactForm({ ...c }); setEditContactId(c.id); setShowAddContact(true); };
  const saveContact = async () => {
    if (!contactForm.name) return;
    if (editContactId) { setContacts(c => c.map(x => x.id === editContactId ? { ...x, ...contactForm } : x)); await dbUpd("industry_contacts", editContactId, contactForm); }
    else { const c = await dbIns("industry_contacts", contactForm); if (c) setContacts(ct => [...ct, c]); }
    setShowAddContact(false); setEditContactId(null); setContactForm(blankContact);
  };
  const delContact = async id => { setContacts(c => c.filter(x => x.id !== id)); await dbDel("industry_contacts", id); };
  const filteredContacts = contacts.filter(c => { const q = contactSearch.toLowerCase(); return !q || c.name?.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q) || c.specialty?.toLowerCase().includes(q); });

  if (loading) return <Spinner />;
  return <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SH title="Useful Links" />
        <Btn onClick={() => { setLinkForm(blankLink); setEditLinkId(null); setShowAddLink(true); }}>+ Add Link</Btn>
      </div>
      <div style={tWrap}><table style={tS}>
        <thead><tr style={thRow}>{["Details", "Input Date", "Link", "Comments", ""].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>{links.map(l => <tr key={l.id}>
          <td style={{ ...td, fontWeight: 500 }}>{l.details}</td>
          <td style={{ ...td, fontSize: 12.5, color: T.textMuted, whiteSpace: "nowrap" }}>{fmtDate(l.inputDate)}</td>
          <td style={td}>{l.link && <a href={l.link} target="_blank" rel="noopener noreferrer" style={{ color: T.blue, fontSize: 13, textDecoration: "none", maxWidth: 300, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.link}</a>}</td>
          <td style={{ ...td, color: T.textMuted, fontSize: 13 }}>{l.comments}</td>
          <td style={td}><RowActions onEdit={() => openEditLink(l)} onDelete={() => delLink(l.id)} /></td>
        </tr>)}</tbody>
      </table></div>
    </div>
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SH title="Industry Contact Directory" />
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Search name, company, specialty..."
            style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 12px", color: T.text, fontSize: 13.5, outline: "none", width: 280 }} />
          <Btn onClick={() => { setContactForm(blankContact); setEditContactId(null); setShowAddContact(true); }}>+ Add Contact</Btn>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
        {filteredContacts.map(c => <div key={c.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div><p style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</p><p style={{ color: T.textMuted, fontSize: 13, marginTop: 2 }}>{c.role}{c.company ? ` · ${c.company}` : ""}</p></div>
            <div style={{ display: "flex", gap: 3 }}><RowActions onEdit={() => openEditContact(c)} onDelete={() => delContact(c.id)} /></div>
          </div>
          {c.specialty && <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{c.specialty.split(",").map(s => <span key={s} style={{ background: T.accent + "15", color: T.accent, border: `1px solid ${T.accent}33`, borderRadius: 99, padding: "2px 9px", fontSize: 11, fontWeight: 600 }}>{s.trim()}</span>)}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {c.phone && <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              <span style={{ color: T.text, fontSize: 13 }}>{c.phone}</span>
            </div>}
            {c.email && <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
              <a href={`mailto:${c.email}`} style={{ color: T.blue, fontSize: 13, textDecoration: "none" }}>{c.email}</a>
            </div>}
          </div>
          {c.notes && <p style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.55, borderTop: `1px solid ${T.border}`, paddingTop: 10, margin: 0 }}>{c.notes}</p>}
        </div>)}
      </div>
    </div>
    {showAddLink && <Modal title={editLinkId ? "Edit Link" : "Add Link"} onClose={() => { setShowAddLink(false); setEditLinkId(null); }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Inp label="Details" value={linkForm.details} onChange={v => setLinkForm(p => ({ ...p, details: v }))} placeholder="e.g. Latest Claims & Panel Listing" />
        <Inp label="Link / URL" value={linkForm.link} onChange={v => setLinkForm(p => ({ ...p, link: v }))} placeholder="https://..." />
        <Inp label="Input Date" type="date" value={linkForm.inputDate} onChange={v => setLinkForm(p => ({ ...p, inputDate: v }))} />
        <Inp label="Comments" value={linkForm.comments} onChange={v => setLinkForm(p => ({ ...p, comments: v }))} rows={2} />
      </div>
      <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn ghost onClick={() => { setShowAddLink(false); setEditLinkId(null); }}>Cancel</Btn>
        <Btn onClick={saveLink}>{editLinkId ? "Update" : "Add Link"}</Btn>
      </div>
    </Modal>}
    {showAddContact && <Modal title={editContactId ? "Edit Contact" : "Add Industry Contact"} onClose={() => { setShowAddContact(false); setEditContactId(null); }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Inp label="Name" value={contactForm.name} onChange={v => setContactForm(p => ({ ...p, name: v }))} />
        <Inp label="Company / Insurer" value={contactForm.company} onChange={v => setContactForm(p => ({ ...p, company: v }))} />
        <Inp label="Role / Title" value={contactForm.role} onChange={v => setContactForm(p => ({ ...p, role: v }))} />
        <Inp label="Phone" value={contactForm.phone} onChange={v => setContactForm(p => ({ ...p, phone: v }))} />
        <Inp label="Email" value={contactForm.email} onChange={v => setContactForm(p => ({ ...p, email: v }))} />
        <Inp label="Specialty (comma-separated)" value={contactForm.specialty} onChange={v => setContactForm(p => ({ ...p, specialty: v }))} placeholder="e.g. Marine, Fire" />
      </div>
      <div style={{ marginTop: 14 }}><Inp label="Notes" value={contactForm.notes} onChange={v => setContactForm(p => ({ ...p, notes: v }))} rows={3} /></div>
      <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn ghost onClick={() => { setShowAddContact(false); setEditContactId(null); }}>Cancel</Btn>
        <Btn onClick={saveContact}>{editContactId ? "Update" : "Add Contact"}</Btn>
      </div>
    </Modal>}
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { key: "todo", label: "To-Do", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg> },
  { key: "clients", label: "Clients", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
  { key: "cases", label: "Cases", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg> },
  { key: "finances", label: "Finances", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> },
  { key: "prospects", label: "Prospects", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg> },
  { key: "resources", label: "Resources", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg> },
];

export default function App() {
  const [active, setActive] = useState("todo");
  return <>
    <style>{fontStyle}</style>
    <div style={{ minHeight: "100vh", background: T.bg }}>
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 700, letterSpacing: -0.3 }}><span style={{ color: T.accent }}>GEB</span> CRM</h1>
          <p style={{ color: T.textDim, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 3 }}>Group Employee Benefits · Jayrius & Darrel</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.green, display: "inline-block" }} />
          <span style={{ color: T.textDim, fontSize: 12.5 }}>{new Date().toLocaleDateString("en-SG", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
        </div>
      </div>
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "0 32px", display: "flex" }}>
        {TABS.map(t => <button key={t.key} onClick={() => setActive(t.key)} style={{ background: "none", border: "none", borderBottom: active === t.key ? `2px solid ${T.accent}` : "2px solid transparent", color: active === t.key ? T.accent : T.textMuted, padding: "12px 20px", fontSize: 14, fontWeight: active === t.key ? 600 : 400, cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 7 }}>{t.icon} {t.label}</button>)}
      </div>
      <div style={{ padding: "28px 32px", maxWidth: 1480, margin: "0 auto" }}>
        <div style={{ display: active === "todo" ? "block" : "none" }}><TodoTab /></div>
        <div style={{ display: active === "clients" ? "block" : "none" }}><ClientsTab /></div>
        <div style={{ display: active === "cases" ? "block" : "none" }}><CasesTab /></div>
        <div style={{ display: active === "finances" ? "block" : "none" }}><FinancesTab /></div>
        <div style={{ display: active === "prospects" ? "block" : "none" }}><ProspectsTab /></div>
        <div style={{ display: active === "resources" ? "block" : "none" }}><ResourcesTab /></div>
      </div>
    </div>
  </>;
}
