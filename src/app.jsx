import { useState, useEffect, useRef, useCallback, useMemo } from “react”;

/* ═══════════════════════════════════════════════════════════════════════════
ONEKIT — Every tool. One place.
SVRD Holdings — v1.0

15 Phase 1 Tools | Hash Routing | PWA-Ready | AdSense Slots
Brand: #0a0a0a bg, #8b0000 red, #4b0082 purple, #9370db light purple
═══════════════════════════════════════════════════════════════════════════ */

// ─── BRAND TOKENS ────────────────────────────────────────────────────────────
const T = {
bg: “#0a0a0a”, surface: “#111111”, elevated: “#1a1a1a”,
border: “#222222”, borderLight: “#333333”,
red: “#8b0000”, redLight: “#cc1a1a”,
purple: “#4b0082”, purpleLight: “#9370db”,
text: “#e8e8e8”, textMuted: “#888888”, textDim: “#555555”,
white: “#ffffff”, green: “#22c55e”, yellow: “#eab308”, orange: “#f97316”,
};

const FONT = `'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif`;
const MONO = `'JetBrains Mono', 'Fira Code', monospace`;

// ─── TOOL REGISTRY ───────────────────────────────────────────────────────────
const CATEGORIES = [
{ id: “calculators”, label: “Calculators”, icon: “🧮” },
{ id: “converters”, label: “Converters”, icon: “🔄” },
{ id: “generators”, label: “Generators”, icon: “⚡” },
{ id: “text”, label: “Text Tools”, icon: “📝” },
{ id: “dev”, label: “Dev Tools”, icon: “🛠️” },
];

const TOOLS = [
{ id: “calculator”, name: “Calculator”, cat: “calculators”, desc: “Basic & scientific calculator” },
{ id: “percentage”, name: “Percentage Calculator”, cat: “calculators”, desc: “Find percentages instantly” },
{ id: “tip”, name: “Tip Calculator”, cat: “calculators”, desc: “Split bills & calculate tips” },
{ id: “bmi”, name: “BMI Calculator”, cat: “calculators”, desc: “Body mass index calculator” },
{ id: “unit-converter”, name: “Unit Converter”, cat: “converters”, desc: “Weight, length, temp, volume” },
{ id: “color-converter”, name: “Color Converter”, cat: “converters”, desc: “HEX, RGB, HSL converter” },
{ id: “base64”, name: “Base64 Encode/Decode”, cat: “converters”, desc: “Encode & decode Base64 strings” },
{ id: “password-gen”, name: “Password Generator”, cat: “generators”, desc: “Secure random passwords” },
{ id: “lorem”, name: “Lorem Ipsum”, cat: “generators”, desc: “Placeholder text generator” },
{ id: “uuid”, name: “UUID Generator”, cat: “generators”, desc: “Generate unique UUIDs” },
{ id: “word-counter”, name: “Word Counter”, cat: “text”, desc: “Count words, chars, sentences” },
{ id: “case-converter”, name: “Case Converter”, cat: “text”, desc: “UPPER, lower, Title, camelCase” },
{ id: “json-formatter”, name: “JSON Formatter”, cat: “dev”, desc: “Format & validate JSON” },
{ id: “regex”, name: “Regex Tester”, cat: “dev”, desc: “Test regular expressions live” },
{ id: “hash-gen”, name: “Hash Generator”, cat: “dev”, desc: “MD5, SHA-1, SHA-256 hashes” },
];

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────
const s = {
input: {
width: “100%”, padding: “10px 14px”, background: T.elevated, border: `1px solid ${T.border}`,
borderRadius: 8, color: T.text, fontFamily: FONT, fontSize: 14, outline: “none”,
transition: “border-color 0.2s”,
},
inputMono: {
width: “100%”, padding: “10px 14px”, background: T.elevated, border: `1px solid ${T.border}`,
borderRadius: 8, color: T.green, fontFamily: MONO, fontSize: 13, outline: “none”,
transition: “border-color 0.2s”,
},
textarea: {
width: “100%”, padding: “12px 14px”, background: T.elevated, border: `1px solid ${T.border}`,
borderRadius: 8, color: T.text, fontFamily: FONT, fontSize: 14, outline: “none”,
resize: “vertical”, minHeight: 120, transition: “border-color 0.2s”,
},
textareaMono: {
width: “100%”, padding: “12px 14px”, background: T.elevated, border: `1px solid ${T.border}`,
borderRadius: 8, color: T.green, fontFamily: MONO, fontSize: 13, outline: “none”,
resize: “vertical”, minHeight: 120, transition: “border-color 0.2s”,
},
btn: (color = T.purple) => ({
padding: “10px 20px”, background: color, color: T.white, border: “none”,
borderRadius: 8, fontFamily: FONT, fontSize: 14, fontWeight: 600,
cursor: “pointer”, transition: “all 0.2s”, display: “inline-flex”,
alignItems: “center”, gap: 8,
}),
btnSmall: (color = T.purple) => ({
padding: “6px 14px”, background: color, color: T.white, border: “none”,
borderRadius: 6, fontFamily: FONT, fontSize: 12, fontWeight: 600,
cursor: “pointer”, transition: “all 0.2s”,
}),
label: { fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 6, display: “block”, textTransform: “uppercase”, letterSpacing: 0.5 },
result: {
padding: “16px”, background: T.surface, border: `1px solid ${T.border}`,
borderRadius: 8, fontFamily: MONO, fontSize: 16, color: T.purpleLight, textAlign: “center”,
},
card: {
background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12,
padding: 20, marginBottom: 16,
},
};

function CopyBtn({ text }) {
const [copied, setCopied] = useState(false);
const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); };
return <button onClick={copy} style={s.btnSmall(copied ? T.green : T.purple)}>{copied ? “Copied!” : “Copy”}</button>;
}

function AdSlot() {
return (
<div style={{ minHeight: 90, background: T.surface, border: `1px dashed ${T.borderLight}`, borderRadius: 8, display: “flex”, alignItems: “center”, justifyContent: “center”, color: T.textDim, fontSize: 11, margin: “20px 0” }}>
Ad Space
</div>
);
}

// ─── TOOL 1: CALCULATOR ──────────────────────────────────────────────────────
function Calculator() {
const [display, setDisplay] = useState(“0”);
const [expr, setExpr] = useState(””);
const press = (v) => {
if (v === “C”) { setDisplay(“0”); setExpr(””); return; }
if (v === “⌫”) { setDisplay(d => d.length > 1 ? d.slice(0, -1) : “0”); return; }
if (v === “=”) {
try {
const safe = expr.replace(/×/g, “*”).replace(/÷/g, “/”);
const res = Function(’“use strict”; return (’ + safe + “)”)();
setDisplay(String(parseFloat(res.toFixed(10))));
setExpr(String(parseFloat(res.toFixed(10))));
} catch { setDisplay(“Error”); setExpr(””); }
return;
}
if (v === “±”) { setDisplay(d => d.startsWith(”-”) ? d.slice(1) : “-” + d); setExpr(e => e.startsWith(”-”) ? e.slice(1) : “-” + e); return; }
if (v === “%”) { try { setDisplay(d => String(parseFloat(d) / 100)); setExpr(e => String(parseFloat(e) / 100)); } catch {} return; }
const newExpr = expr === “” && display === “0” ? v : expr + v;
setExpr(newExpr);
setDisplay(display === “0” && !”+-×÷.”.includes(v) ? v : display + v);
};
const btns = [“C”, “±”, “%”, “÷”, “7”, “8”, “9”, “×”, “4”, “5”, “6”, “-”, “1”, “2”, “3”, “+”, “0”, “.”, “⌫”, “=”];
const isOp = (b) => [“÷”, “×”, “-”, “+”, “=”].includes(b);
return (
<div>
<div style={{ background: T.elevated, borderRadius: 12, padding: “20px 16px 12px”, marginBottom: 16, textAlign: “right” }}>
<div style={{ fontSize: 13, color: T.textDim, minHeight: 18, fontFamily: MONO }}>{expr || “ “}</div>
<div style={{ fontSize: 36, fontWeight: 700, fontFamily: MONO, color: T.white, wordBreak: “break-all” }}>{display}</div>
</div>
<div style={{ display: “grid”, gridTemplateColumns: “repeat(4, 1fr)”, gap: 8 }}>
{btns.map(b => (
<button key={b} onClick={() => press(b)} style={{
padding: “16px 0”, fontSize: 18, fontWeight: 600, fontFamily: FONT, border: “none”, borderRadius: 10, cursor: “pointer”,
background: b === “=” ? T.red : isOp(b) ? T.purple : b === “C” ? T.borderLight : T.elevated,
color: T.white, transition: “all 0.15s”,
…(b === “0” ? { gridColumn: “1 / 2” } : {}),
}}>{b}</button>
))}
</div>
</div>
);
}

// ─── TOOL 2: PERCENTAGE CALCULATOR ──────────────────────────────────────────
function PercentageCalc() {
const [mode, setMode] = useState(0);
const [a, setA] = useState(””); const [b, setB] = useState(””);
const modes = [“What is X% of Y?”, “X is what % of Y?”, “% change from X to Y”];
const calc = () => {
const x = parseFloat(a), y = parseFloat(b);
if (isNaN(x) || isNaN(y)) return “—”;
if (mode === 0) return ((x / 100) * y).toFixed(2);
if (mode === 1) return ((x / y) * 100).toFixed(2) + “%”;
return (((y - x) / Math.abs(x)) * 100).toFixed(2) + “%”;
};
return (
<div>
<div style={{ display: “flex”, gap: 6, marginBottom: 16, flexWrap: “wrap” }}>
{modes.map((m, i) => (
<button key={i} onClick={() => { setMode(i); setA(””); setB(””); }} style={{ …s.btnSmall(mode === i ? T.purple : T.elevated), border: `1px solid ${mode === i ? T.purple : T.border}` }}>{m}</button>
))}
</div>
<div style={{ display: “grid”, gridTemplateColumns: “1fr 1fr”, gap: 12, marginBottom: 16 }}>
<div><label style={s.label}>{mode === 2 ? “From” : mode === 1 ? “Value” : “Percentage”}</label><input style={s.input} type=“number” value={a} onChange={e => setA(e.target.value)} placeholder=“0” /></div>
<div><label style={s.label}>{mode === 2 ? “To” : mode === 1 ? “Total” : “Number”}</label><input style={s.input} type=“number” value={b} onChange={e => setB(e.target.value)} placeholder=“0” /></div>
</div>
<div style={s.result}>{calc()}</div>
</div>
);
}

// ─── TOOL 3: TIP CALCULATOR ─────────────────────────────────────────────────
function TipCalc() {
const [bill, setBill] = useState(””); const [tip, setTip] = useState(18); const [split, setSplit] = useState(1);
const b = parseFloat(bill) || 0;
const tipAmt = b * (tip / 100);
const total = b + tipAmt;
const perPerson = split > 0 ? total / split : total;
return (
<div>
<label style={s.label}>Bill Amount ($)</label>
<input style={{ …s.input, marginBottom: 16 }} type=“number” value={bill} onChange={e => setBill(e.target.value)} placeholder=“0.00” />
<label style={s.label}>Tip: {tip}%</label>
<div style={{ display: “flex”, gap: 8, marginBottom: 16, flexWrap: “wrap” }}>
{[10, 15, 18, 20, 25].map(t => (
<button key={t} onClick={() => setTip(t)} style={{ …s.btnSmall(tip === t ? T.purple : T.elevated), border: `1px solid ${tip === t ? T.purple : T.border}` }}>{t}%</button>
))}
<input type=“number” value={tip} onChange={e => setTip(Number(e.target.value))} style={{ …s.input, width: 70 }} />
</div>
<label style={s.label}>Split Between</label>
<input style={{ …s.input, marginBottom: 20, width: 80 }} type=“number” min=“1” value={split} onChange={e => setSplit(Math.max(1, parseInt(e.target.value) || 1))} />
<div style={{ display: “grid”, gridTemplateColumns: “1fr 1fr 1fr”, gap: 12 }}>
<div style={s.result}><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Tip</div>${tipAmt.toFixed(2)}</div>
<div style={s.result}><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Total</div>${total.toFixed(2)}</div>
<div style={{ …s.result, color: T.green }}><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Per Person</div>${perPerson.toFixed(2)}</div>
</div>
</div>
);
}

// ─── TOOL 4: BMI CALCULATOR ─────────────────────────────────────────────────
function BMICalc() {
const [unit, setUnit] = useState(“imperial”);
const [h1, setH1] = useState(””); const [h2, setH2] = useState(””); const [w, setW] = useState(””);
const calc = () => {
const wt = parseFloat(w);
if (unit === “imperial”) {
const inches = (parseFloat(h1) || 0) * 12 + (parseFloat(h2) || 0);
if (!inches || !wt) return null;
return (703 * wt) / (inches * inches);
}
const cm = parseFloat(h1);
if (!cm || !wt) return null;
return wt / ((cm / 100) ** 2);
};
const bmi = calc();
const cat = bmi ? (bmi < 18.5 ? “Underweight” : bmi < 25 ? “Normal” : bmi < 30 ? “Overweight” : “Obese”) : null;
const catColor = bmi ? (bmi < 18.5 ? T.yellow : bmi < 25 ? T.green : bmi < 30 ? T.orange : T.red) : T.textMuted;
return (
<div>
<div style={{ display: “flex”, gap: 8, marginBottom: 16 }}>
{[“imperial”, “metric”].map(u => (
<button key={u} onClick={() => { setUnit(u); setH1(””); setH2(””); setW(””); }} style={{ …s.btnSmall(unit === u ? T.purple : T.elevated), border: `1px solid ${unit === u ? T.purple : T.border}`, textTransform: “capitalize” }}>{u}</button>
))}
</div>
<div style={{ display: “grid”, gridTemplateColumns: unit === “imperial” ? “1fr 1fr” : “1fr”, gap: 12, marginBottom: 12 }}>
<div><label style={s.label}>{unit === “imperial” ? “Feet” : “Height (cm)”}</label><input style={s.input} type=“number” value={h1} onChange={e => setH1(e.target.value)} /></div>
{unit === “imperial” && <div><label style={s.label}>Inches</label><input style={s.input} type=“number” value={h2} onChange={e => setH2(e.target.value)} /></div>}
</div>
<label style={s.label}>Weight ({unit === “imperial” ? “lbs” : “kg”})</label>
<input style={{ …s.input, marginBottom: 20 }} type=“number” value={w} onChange={e => setW(e.target.value)} />
{bmi && (
<div style={{ …s.result, color: catColor }}>
<div style={{ fontSize: 32, fontWeight: 700 }}>{bmi.toFixed(1)}</div>
<div style={{ fontSize: 14, marginTop: 4 }}>{cat}</div>
</div>
)}
</div>
);
}

// ─── TOOL 5: UNIT CONVERTER ─────────────────────────────────────────────────
function UnitConverter() {
const units = {
Length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254 },
Weight: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495, ton: 907.185 },
Temperature: { “°C”: “c”, “°F”: “f”, “K”: “k” },
Volume: { L: 1, mL: 0.001, gal: 3.78541, qt: 0.946353, cup: 0.236588, “fl oz”: 0.0295735 },
};
const [cat, setCat] = useState(“Length”);
const [from, setFrom] = useState(””); const [to, setTo] = useState(””);
const [fromU, setFromU] = useState(””); const [toU, setToU] = useState(””);

useEffect(() => {
const keys = Object.keys(units[cat]);
setFromU(keys[0]); setToU(keys[1] || keys[0]); setFrom(””); setTo(””);
}, [cat]);

const convert = (val, fu, tu) => {
if (!val || val === “”) return “”;
const v = parseFloat(val);
if (isNaN(v)) return “”;
if (cat === “Temperature”) {
let celsius;
if (fu === “°C”) celsius = v; else if (fu === “°F”) celsius = (v - 32) * 5/9; else celsius = v - 273.15;
if (tu === “°C”) return celsius.toFixed(4); if (tu === “°F”) return (celsius * 9/5 + 32).toFixed(4); return (celsius + 273.15).toFixed(4);
}
const base = v * units[cat][fu];
return (base / units[cat][tu]).toFixed(6).replace(/.?0+$/, “”);
};

return (
<div>
<div style={{ display: “flex”, gap: 6, marginBottom: 16, flexWrap: “wrap” }}>
{Object.keys(units).map(c => (
<button key={c} onClick={() => setCat(c)} style={{ …s.btnSmall(cat === c ? T.purple : T.elevated), border: `1px solid ${cat === c ? T.purple : T.border}` }}>{c}</button>
))}
</div>
<div style={{ display: “grid”, gridTemplateColumns: “1fr 1fr”, gap: 12 }}>
<div>
<label style={s.label}>From</label>
<select value={fromU} onChange={e => { setFromU(e.target.value); setTo(convert(from, e.target.value, toU)); }} style={{ …s.input, marginBottom: 8 }}>
{Object.keys(units[cat]).map(u => <option key={u} value={u}>{u}</option>)}
</select>
<input style={s.input} type=“number” value={from} onChange={e => { setFrom(e.target.value); setTo(convert(e.target.value, fromU, toU)); }} placeholder=“0” />
</div>
<div>
<label style={s.label}>To</label>
<select value={toU} onChange={e => { setToU(e.target.value); setTo(convert(from, fromU, e.target.value)); }} style={{ …s.input, marginBottom: 8 }}>
{Object.keys(units[cat]).map(u => <option key={u} value={u}>{u}</option>)}
</select>
<input style={s.inputMono} readOnly value={to} placeholder="—" />
</div>
</div>
</div>
);
}

// ─── TOOL 6: COLOR CONVERTER ────────────────────────────────────────────────
function ColorConverter() {
const [hex, setHex] = useState(”#8b0000”);
const hexToRgb = (h) => { const m = h.replace(”#”, “”).match(/.{2}/g); return m ? m.map(x => parseInt(x, 16)) : [0,0,0]; };
const rgbToHsl = ([r,g,b]) => { r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let h=0,s2=0;if(mx!==mn){const d=mx-mn;s2=l>0.5?d/(2-mx-mn):d/(mx+mn);if(mx===r)h=((g-b)/d+(g<b?6:0))/6;else if(mx===g)h=((b-r)/d+2)/6;else h=((r-g)/d+4)/6;}return[Math.round(h*360),Math.round(s2*100),Math.round(l*100)]; };
const rgb = hexToRgb(hex);
const hsl = rgbToHsl(rgb);
return (
<div>
<div style={{ display: “flex”, gap: 12, alignItems: “center”, marginBottom: 20 }}>
<input type=“color” value={hex} onChange={e => setHex(e.target.value)} style={{ width: 60, height: 60, border: “none”, borderRadius: 8, cursor: “pointer”, background: “none” }} />
<div style={{ flex: 1 }}>
<label style={s.label}>HEX</label>
<input style={s.inputMono} value={hex} onChange={e => setHex(e.target.value)} />
</div>
</div>
<div style={{ display: “grid”, gridTemplateColumns: “1fr 1fr”, gap: 12 }}>
<div style={s.card}>
<div style={{ fontSize: 11, color: T.textMuted, marginBottom: 6 }}>RGB</div>
<div style={{ fontFamily: MONO, color: T.green }}>{`rgb(${rgb.join(", ")})`}</div>
<CopyBtn text={`rgb(${rgb.join(", ")})`} />
</div>
<div style={s.card}>
<div style={{ fontSize: 11, color: T.textMuted, marginBottom: 6 }}>HSL</div>
<div style={{ fontFamily: MONO, color: T.green }}>{`hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`}</div>
<CopyBtn text={`hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`} />
</div>
</div>
<div style={{ height: 48, borderRadius: 8, background: hex, marginTop: 12, border: `1px solid ${T.border}` }} />
</div>
);
}

// ─── TOOL 7: BASE64 ENCODE/DECODE ───────────────────────────────────────────
function Base64Tool() {
const [input, setInput] = useState(””); const [output, setOutput] = useState(””); const [mode, setMode] = useState(“encode”);
const run = (val, m) => {
try { setOutput(m === “encode” ? btoa(val) : atob(val)); } catch { setOutput(“Invalid input”); }
};
return (
<div>
<div style={{ display: “flex”, gap: 8, marginBottom: 16 }}>
{[“encode”, “decode”].map(m => (
<button key={m} onClick={() => { setMode(m); setInput(””); setOutput(””); }} style={{ …s.btnSmall(mode === m ? T.purple : T.elevated), border: `1px solid ${mode === m ? T.purple : T.border}`, textTransform: “capitalize” }}>{m}</button>
))}
</div>
<label style={s.label}>Input</label>
<textarea style={s.textarea} value={input} onChange={e => { setInput(e.target.value); run(e.target.value, mode); }} placeholder={mode === “encode” ? “Enter text to encode…” : “Enter Base64 to decode…”} />
<div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “center”, margin: “12px 0 6px” }}>
<label style={{ …s.label, margin: 0 }}>Output</label>
{output && <CopyBtn text={output} />}
</div>
<textarea style={s.textareaMono} readOnly value={output} />
</div>
);
}

// ─── TOOL 8: PASSWORD GENERATOR ─────────────────────────────────────────────
function PasswordGen() {
const [len, setLen] = useState(16);
const [opts, setOpts] = useState({ upper: true, lower: true, numbers: true, symbols: true });
const [pw, setPw] = useState(””);
const generate = useCallback(() => {
let chars = “”;
if (opts.upper) chars += “ABCDEFGHIJKLMNOPQRSTUVWXYZ”;
if (opts.lower) chars += “abcdefghijklmnopqrstuvwxyz”;
if (opts.numbers) chars += “0123456789”;
if (opts.symbols) chars += “!@#$%^&*()_+-=[]{}|;:,.<>?”;
if (!chars) return;
const arr = new Uint32Array(len);
crypto.getRandomValues(arr);
setPw(Array.from(arr, v => chars[v % chars.length]).join(””));
}, [len, opts]);
useEffect(() => { generate(); }, [generate]);
const strength = len >= 20 && Object.values(opts).filter(Boolean).length >= 3 ? “Strong” : len >= 12 ? “Good” : “Weak”;
const strengthColor = strength === “Strong” ? T.green : strength === “Good” ? T.yellow : T.red;
return (
<div>
<div style={{ …s.result, fontSize: 20, wordBreak: “break-all”, letterSpacing: 1, marginBottom: 16, position: “relative” }}>
{pw}
<div style={{ position: “absolute”, top: 8, right: 8 }}><CopyBtn text={pw} /></div>
</div>
<div style={{ display: “flex”, alignItems: “center”, gap: 8, marginBottom: 12 }}>
<span style={{ fontSize: 12, color: strengthColor, fontWeight: 700 }}>{strength}</span>
<div style={{ flex: 1, height: 4, background: T.border, borderRadius: 2 }}>
<div style={{ width: strength === “Strong” ? “100%” : strength === “Good” ? “60%” : “30%”, height: “100%”, background: strengthColor, borderRadius: 2, transition: “all 0.3s” }} />
</div>
</div>
<label style={s.label}>Length: {len}</label>
<input type=“range” min=“4” max=“64” value={len} onChange={e => setLen(Number(e.target.value))} style={{ width: “100%”, marginBottom: 16, accentColor: T.purple }} />
<div style={{ display: “flex”, gap: 8, flexWrap: “wrap”, marginBottom: 16 }}>
{Object.keys(opts).map(k => (
<button key={k} onClick={() => setOpts(o => ({ …o, [k]: !o[k] }))} style={{ …s.btnSmall(opts[k] ? T.purple : T.elevated), border: `1px solid ${opts[k] ? T.purple : T.border}`, textTransform: “capitalize” }}>{k}</button>
))}
</div>
<button onClick={generate} style={s.btn(T.red)}>Generate New</button>
</div>
);
}

// ─── TOOL 9: LOREM IPSUM ────────────────────────────────────────────────────
function LoremIpsum() {
const words = “lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum”.split(” “);
const [count, setCount] = useState(3); const [type, setType] = useState(“paragraphs”);
const gen = () => {
if (type === “words”) return Array.from({ length: count }, (_, i) => words[i % words.length]).join(” “);
if (type === “sentences”) return Array.from({ length: count }, () => { const len = 8 + Math.floor(Math.random() * 12); return Array.from({ length: len }, () => words[Math.floor(Math.random() * words.length)]).join(” “) + “.”; }).join(” “);
return Array.from({ length: count }, () => { const sCount = 3 + Math.floor(Math.random() * 4); return Array.from({ length: sCount }, () => { const len = 8 + Math.floor(Math.random() * 12); let sent = Array.from({ length: len }, () => words[Math.floor(Math.random() * words.length)]).join(” “) + “.”; return sent.charAt(0).toUpperCase() + sent.slice(1); }).join(” “); }).join(”\n\n”);
};
const text = gen();
return (
<div>
<div style={{ display: “flex”, gap: 8, marginBottom: 16 }}>
{[“paragraphs”, “sentences”, “words”].map(t => (
<button key={t} onClick={() => setType(t)} style={{ …s.btnSmall(type === t ? T.purple : T.elevated), border: `1px solid ${type === t ? T.purple : T.border}`, textTransform: “capitalize” }}>{t}</button>
))}
</div>
<div style={{ display: “flex”, alignItems: “center”, gap: 12, marginBottom: 16 }}>
<label style={{ …s.label, margin: 0 }}>Count:</label>
<input type=“number” min=“1” max=“50” value={count} onChange={e => setCount(Math.max(1, parseInt(e.target.value) || 1))} style={{ …s.input, width: 70 }} />
<CopyBtn text={text} />
</div>
<div style={{ …s.textarea, minHeight: 200, whiteSpace: “pre-wrap”, color: T.textMuted, fontSize: 13 }}>{text}</div>
</div>
);
}

// ─── TOOL 10: UUID GENERATOR ────────────────────────────────────────────────
function UUIDGen() {
const gen = () => crypto.randomUUID ? crypto.randomUUID() : “xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx”.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === “x” ? r : (r & 0x3 | 0x8)).toString(16); });
const [uuids, setUuids] = useState(() => Array.from({ length: 5 }, gen));
const [count, setCount] = useState(5);
return (
<div>
<div style={{ display: “flex”, gap: 12, alignItems: “center”, marginBottom: 16 }}>
<label style={{ …s.label, margin: 0 }}>Count:</label>
<input type=“number” min=“1” max=“50” value={count} onChange={e => setCount(Math.max(1, parseInt(e.target.value) || 1))} style={{ …s.input, width: 70 }} />
<button onClick={() => setUuids(Array.from({ length: count }, gen))} style={s.btn(T.red)}>Generate</button>
</div>
<div style={{ display: “flex”, flexDirection: “column”, gap: 6 }}>
{uuids.map((u, i) => (
<div key={i} style={{ display: “flex”, alignItems: “center”, gap: 8, background: T.elevated, padding: “8px 12px”, borderRadius: 6, fontFamily: MONO, fontSize: 13, color: T.purpleLight }}>
<span style={{ flex: 1, overflow: “hidden”, textOverflow: “ellipsis” }}>{u}</span>
<CopyBtn text={u} />
</div>
))}
</div>
<button onClick={() => navigator.clipboard.writeText(uuids.join(”\n”))} style={{ …s.btn(T.purple), marginTop: 12, width: “100%” }}>Copy All</button>
</div>
);
}

// ─── TOOL 11: WORD COUNTER ──────────────────────────────────────────────────
function WordCounter() {
const [text, setText] = useState(””);
const words = text.trim() ? text.trim().split(/\s+/).length : 0;
const chars = text.length;
const charsNoSpace = text.replace(/\s/g, “”).length;
const sentences = text.trim() ? (text.match(/[.!?]+/g) || []).length || (text.trim() ? 1 : 0) : 0;
const paragraphs = text.trim() ? text.split(/\n\n+/).filter(p => p.trim()).length : 0;
const readTime = Math.max(1, Math.ceil(words / 200));
return (
<div>
<textarea style={{ …s.textarea, minHeight: 160 }} value={text} onChange={e => setText(e.target.value)} placeholder=“Paste or type your text here…” />
<div style={{ display: “grid”, gridTemplateColumns: “repeat(3, 1fr)”, gap: 10, marginTop: 16 }}>
{[[“Words”, words], [“Characters”, chars], [“No Spaces”, charsNoSpace], [“Sentences”, sentences], [“Paragraphs”, paragraphs], [“Read Time”, `${readTime}m`]].map(([label, val]) => (
<div key={label} style={{ …s.result, padding: 12 }}>
<div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>{label}</div>
<div style={{ fontSize: 20, fontWeight: 700 }}>{val}</div>
</div>
))}
</div>
</div>
);
}

// ─── TOOL 12: CASE CONVERTER ────────────────────────────────────────────────
function CaseConverter() {
const [text, setText] = useState(””);
const cases = {
UPPERCASE: t => t.toUpperCase(),
lowercase: t => t.toLowerCase(),
“Title Case”: t => t.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()),
“Sentence case”: t => t.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase()),
camelCase: t => t.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (*, c) => c.toUpperCase()),
“snake_case”: t => t.toLowerCase().replace(/[^a-zA-Z0-9]+/g, “*”).replace(/^*|*$/g, “”),
“kebab-case”: t => t.toLowerCase().replace(/[^a-zA-Z0-9]+/g, “-”).replace(/^-|-$/g, “”),
};
const [active, setActive] = useState(“UPPERCASE”);
const result = text ? cases[active](text) : “”;
return (
<div>
<textarea style={s.textarea} value={text} onChange={e => setText(e.target.value)} placeholder=“Enter your text…” />
<div style={{ display: “flex”, gap: 6, flexWrap: “wrap”, margin: “12px 0” }}>
{Object.keys(cases).map(c => (
<button key={c} onClick={() => setActive(c)} style={{ …s.btnSmall(active === c ? T.purple : T.elevated), border: `1px solid ${active === c ? T.purple : T.border}` }}>{c}</button>
))}
</div>
{result && (
<div>
<div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “center”, marginBottom: 6 }}>
<label style={{ …s.label, margin: 0 }}>Result</label>
<CopyBtn text={result} />
</div>
<div style={{ …s.textareaMono, minHeight: 80, whiteSpace: “pre-wrap” }}>{result}</div>
</div>
)}
</div>
);
}

// ─── TOOL 13: JSON FORMATTER ────────────────────────────────────────────────
function JSONFormatter() {
const [input, setInput] = useState(””); const [output, setOutput] = useState(””); const [error, setError] = useState(””);
const format = (indent = 2) => {
try { const parsed = JSON.parse(input); setOutput(JSON.stringify(parsed, null, indent)); setError(””); }
catch (e) { setError(e.message); setOutput(””); }
};
const minify = () => {
try { setOutput(JSON.stringify(JSON.parse(input))); setError(””); }
catch (e) { setError(e.message); setOutput(””); }
};
return (
<div>
<label style={s.label}>Input JSON</label>
<textarea style={s.textareaMono} value={input} onChange={e => setInput(e.target.value)} placeholder=’{“key”: “value”}’ />
<div style={{ display: “flex”, gap: 8, margin: “12px 0” }}>
<button onClick={() => format(2)} style={s.btn(T.purple)}>Format</button>
<button onClick={minify} style={s.btn(T.elevated)}>Minify</button>
{output && <CopyBtn text={output} />}
</div>
{error && <div style={{ color: T.red, fontSize: 13, fontFamily: MONO, marginBottom: 8 }}>{error}</div>}
{output && <textarea style={{ …s.textareaMono, minHeight: 200 }} readOnly value={output} />}
</div>
);
}

// ─── TOOL 14: REGEX TESTER ──────────────────────────────────────────────────
function RegexTester() {
const [pattern, setPattern] = useState(””); const [flags, setFlags] = useState(“g”); const [text, setText] = useState(””);
const [matches, setMatches] = useState([]);
useEffect(() => {
if (!pattern || !text) { setMatches([]); return; }
try {
const re = new RegExp(pattern, flags);
const m = []; let match;
if (flags.includes(“g”)) { while ((match = re.exec(text)) !== null) { m.push({ value: match[0], index: match.index, groups: match.slice(1) }); if (!match[0]) break; } }
else { match = re.exec(text); if (match) m.push({ value: match[0], index: match.index, groups: match.slice(1) }); }
setMatches(m);
} catch { setMatches([]); }
}, [pattern, flags, text]);
return (
<div>
<div style={{ display: “flex”, gap: 8, marginBottom: 12 }}>
<div style={{ flex: 1 }}>
<label style={s.label}>Pattern</label>
<input style={s.inputMono} value={pattern} onChange={e => setPattern(e.target.value)} placeholder=”[a-z]+” />
</div>
<div style={{ width: 80 }}>
<label style={s.label}>Flags</label>
<input style={s.inputMono} value={flags} onChange={e => setFlags(e.target.value)} placeholder=“g” />
</div>
</div>
<label style={s.label}>Test String</label>
<textarea style={s.textarea} value={text} onChange={e => setText(e.target.value)} placeholder=“Enter text to test against…” />
<div style={{ marginTop: 12, fontSize: 13 }}>
<span style={{ color: T.textMuted }}>Matches: </span>
<span style={{ color: matches.length ? T.green : T.textDim, fontWeight: 700 }}>{matches.length}</span>
</div>
{matches.length > 0 && (
<div style={{ display: “flex”, flexDirection: “column”, gap: 4, marginTop: 8 }}>
{matches.slice(0, 50).map((m, i) => (
<div key={i} style={{ display: “flex”, gap: 8, alignItems: “center”, fontSize: 12, fontFamily: MONO, padding: “4px 8px”, background: T.elevated, borderRadius: 4 }}>
<span style={{ color: T.textDim }}>#{i}</span>
<span style={{ color: T.purpleLight }}>”{m.value}”</span>
<span style={{ color: T.textDim }}>@{m.index}</span>
{m.groups.length > 0 && <span style={{ color: T.yellow }}>groups: [{m.groups.join(”, “)}]</span>}
</div>
))}
</div>
)}
</div>
);
}

// ─── TOOL 15: HASH GENERATOR ────────────────────────────────────────────────
function HashGen() {
const [input, setInput] = useState(””); const [hashes, setHashes] = useState({});
const compute = async (val) => {
if (!val) { setHashes({}); return; }
const enc = new TextEncoder().encode(val);
const results = {};
for (const algo of [“SHA-1”, “SHA-256”, “SHA-384”, “SHA-512”]) {
const buf = await crypto.subtle.digest(algo, enc);
results[algo] = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, “0”)).join(””);
}
setHashes(results);
};
return (
<div>
<label style={s.label}>Input Text</label>
<textarea style={s.textarea} value={input} onChange={e => { setInput(e.target.value); compute(e.target.value); }} placeholder=“Enter text to hash…” />
{Object.keys(hashes).length > 0 && (
<div style={{ display: “flex”, flexDirection: “column”, gap: 8, marginTop: 16 }}>
{Object.entries(hashes).map(([algo, hash]) => (
<div key={algo} style={s.card}>
<div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “center”, marginBottom: 6 }}>
<span style={{ fontSize: 12, fontWeight: 700, color: T.purpleLight }}>{algo}</span>
<CopyBtn text={hash} />
</div>
<div style={{ fontFamily: MONO, fontSize: 11, color: T.green, wordBreak: “break-all” }}>{hash}</div>
</div>
))}
</div>
)}
</div>
);
}

// ─── TOOL MAP ────────────────────────────────────────────────────────────────
const TOOL_COMPONENTS = {
“calculator”: Calculator, “percentage”: PercentageCalc, “tip”: TipCalc, “bmi”: BMICalc,
“unit-converter”: UnitConverter, “color-converter”: ColorConverter, “base64”: Base64Tool,
“password-gen”: PasswordGen, “lorem”: LoremIpsum, “uuid”: UUIDGen,
“word-counter”: WordCounter, “case-converter”: CaseConverter,
“json-formatter”: JSONFormatter, “regex”: RegexTester, “hash-gen”: HashGen,
};

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
const [route, setRoute] = useState(() => window.location.hash.slice(2) || “”);
const [filterCat, setFilterCat] = useState(“all”);
const [search, setSearch] = useState(””);

useEffect(() => {
const handler = () => setRoute(window.location.hash.slice(2) || “”);
window.addEventListener(“hashchange”, handler);
return () => window.removeEventListener(“hashchange”, handler);
}, []);

const navigate = (id) => { window.location.hash = `#/${id}`; };
const goHome = () => { window.location.hash = “”; setRoute(””); };

const activeTool = TOOLS.find(t => t.id === route);
const ToolComponent = activeTool ? TOOL_COMPONENTS[activeTool.id] : null;

const filtered = useMemo(() => {
let list = TOOLS;
if (filterCat !== “all”) list = list.filter(t => t.cat === filterCat);
if (search) list = list.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.desc.toLowerCase().includes(search.toLowerCase()));
return list;
}, [filterCat, search]);

// ─── TOOL VIEW ──────────────────────────────────────────────────────────
if (activeTool && ToolComponent) {
return (
<div style={{ background: T.bg, minHeight: “100dvh”, fontFamily: FONT, color: T.text }}>
{/* Header */}
<div style={{ display: “flex”, alignItems: “center”, gap: 12, padding: “16px 20px”, borderBottom: `1px solid ${T.border}`, background: T.surface }}>
<button onClick={goHome} style={{ background: “none”, border: “none”, color: T.purpleLight, fontSize: 20, cursor: “pointer”, padding: 0 }}>←</button>
<div>
<div style={{ fontSize: 16, fontWeight: 700, color: T.white }}>{activeTool.name}</div>
<div style={{ fontSize: 12, color: T.textMuted }}>{activeTool.desc}</div>
</div>
</div>
{/* Ad top */}
<div style={{ padding: “0 20px” }}><AdSlot /></div>
{/* Tool */}
<div style={{ padding: “0 20px 20px” }}>
<ToolComponent />
</div>
{/* Ad bottom */}
<div style={{ padding: “0 20px 40px” }}><AdSlot /></div>
</div>
);
}

// ─── HOME VIEW ────────────────────────────────────────────────────────────
return (
<div style={{ background: T.bg, minHeight: “100dvh”, fontFamily: FONT, color: T.text }}>
{/* Hero */}
<div style={{ padding: “48px 20px 32px”, textAlign: “center” }}>
<div style={{ display: “inline-flex”, alignItems: “center”, gap: 10, marginBottom: 12 }}>
<div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${T.red}, ${T.purple})`, display: “flex”, alignItems: “center”, justifyContent: “center”, fontSize: 18, fontWeight: 800, color: T.white }}>O</div>
<span style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, color: T.white }}>OneKit</span>
</div>
<p style={{ fontSize: 15, color: T.textMuted, maxWidth: 400, margin: “0 auto 20px” }}>Every tool. One place.</p>
{/* Search */}
<div style={{ maxWidth: 440, margin: “0 auto”, position: “relative” }}>
<input
style={{ …s.input, paddingLeft: 40, fontSize: 15, borderRadius: 12, background: T.surface, border: `1px solid ${T.borderLight}` }}
value={search} onChange={e => setSearch(e.target.value)}
placeholder=“Search tools…”
/>
<span style={{ position: “absolute”, left: 14, top: “50%”, transform: “translateY(-50%)”, fontSize: 16, color: T.textDim }}>🔍</span>
</div>
</div>

```
  {/* Categories */}
  <div style={{ padding: "0 20px 16px", display: "flex", gap: 6, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
    <button onClick={() => setFilterCat("all")} style={{ ...s.btnSmall(filterCat === "all" ? T.purple : T.elevated), border: `1px solid ${filterCat === "all" ? T.purple : T.border}`, whiteSpace: "nowrap" }}>All</button>
    {CATEGORIES.map(c => (
      <button key={c.id} onClick={() => setFilterCat(c.id)} style={{ ...s.btnSmall(filterCat === c.id ? T.purple : T.elevated), border: `1px solid ${filterCat === c.id ? T.purple : T.border}`, whiteSpace: "nowrap" }}>{c.icon} {c.label}</button>
    ))}
  </div>

  {/* Ad */}
  <div style={{ padding: "0 20px" }}><AdSlot /></div>

  {/* Tool Grid */}
  <div style={{ padding: "0 20px 60px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
    {filtered.map(tool => {
      const cat = CATEGORIES.find(c => c.id === tool.cat);
      return (
        <button key={tool.id} onClick={() => navigate(tool.id)} style={{
          ...s.card, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 14,
          transition: "all 0.2s", border: `1px solid ${T.border}`, marginBottom: 0,
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = T.purple; e.currentTarget.style.background = T.elevated; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.surface; }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 10, background: T.elevated, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
            {cat?.icon || "🔧"}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.white }}>{tool.name}</div>
            <div style={{ fontSize: 12, color: T.textMuted }}>{tool.desc}</div>
          </div>
        </button>
      );
    })}
  </div>

  {/* Footer */}
  <div style={{ textAlign: "center", padding: "20px", borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.textDim }}>
    © {new Date().getFullYear()} SVRD Holdings · <span style={{ color: T.purpleLight }}>OneKit</span> · Every tool. One place.
  </div>
</div>
```

);
}
