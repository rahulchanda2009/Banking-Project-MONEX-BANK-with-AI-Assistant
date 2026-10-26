import React, { useState, useRef, useEffect } from "react";
import api from "../api";

const green = "#b6f500";
const dark = "#161b22";
const darker = "#0d1117";
const red = "#ff5c5c";
const HISTORY_LIMIT = 10;

const WELCOME =
  "Hi! I'm your Monex assistant. Ask me about your balance, loans, cards, beneficiaries " +
  "or your registered details. You can also pick a loan option below 👇";

// Form fields only – eligibility rules, steps and contacts come from the RAG knowledge base
const LOAN_FORMS = {
  VEHICLE_LOAN: {
    label: "🚗 Want a Vehicle loan",
    name: "Vehicle loan",
    fields: [
      ["vehiclePrice", "On-road price of the vehicle (₹)"],
      ["downPayment", "Down payment you can make (₹)"],
      ["monthlyIncome", "Monthly income (₹)"],
      ["existingEmi", "Existing EMIs per month (₹, 0 if none)"],
    ],
  },
  HOME_LOAN: {
    label: "🏠 Want a Home loan",
    name: "Home loan",
    fields: [
      ["monthlySalary", "Monthly salary (₹)"],
      ["existingEmi", "Existing EMIs per month (₹, 0 if none)"],
      ["loanAmount", "Loan amount wanted (₹)"],
      ["age", "Your age (years)"],
    ],
  },
  PERSONAL_LOAN: {
    label: "💰 Want a Personal loan",
    name: "Personal loan",
    fields: [
      ["monthlyIncome", "Monthly income (₹)"],
      ["existingEmi", "Existing EMIs per month (₹, 0 if none)"],
      ["loanAmount", "Loan amount wanted (₹)"],
      ["employmentType", "Employment type (Salaried / Self-employed)"],
    ],
  },
};

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loanForm, setLoanForm] = useState(null);       // { type, values }
  const [demoMode, setDemoMode] = useState(false);
  const [hallucinate, setHallucinate] = useState(false);
  const endRef = useRef(null);
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loanForm, loading]);

  const push = (from, text, extra = {}) => setMsgs(m => [...m, { from, text, ...extra }]);

  const openChat = () => {
    setOpen(true);
    api.get("/ai/health")
      .then(({ data }) => {
        const on = !!data.demo_mode;
        setDemoMode(on);
        if (!on) setHallucinate(false);
      })
      .catch(() => { setDemoMode(false); setHallucinate(false); });
    if (msgs.length === 0) push("bot", WELCOME);
  };

  const resetChat = () => {
    setMsgs([{ from: "bot", text: WELCOME }]);
    setLoanForm(null);
    setInput("");
  };

  const send = async (message, displayText = message) => {
    if (!message.trim() || loading) return;

    // History excludes errors and hallucination-test turns, so they don't affect normal answers
    const history = msgs
      .filter(m => !m.error && !m.test)
      .slice(-HISTORY_LIMIT)
      .map(m => ({ role: m.from === "user" ? "user" : "assistant", content: m.text }));

    const isTest = hallucinate;
    push("user", displayText, { test: isTest });
    setInput("");
    setLoading(true);
    try {
      const { data } = await api.post("/ai/chat", { userId, message, history, hallucinate: isTest });
      push("bot", data.reply || "Sorry, I didn't get a response. Please try again.", { test: isTest });
    } catch (e) {
      push("bot", "Sorry, I couldn't reach the assistant. Please try again.", { error: true });
    } finally {
      setLoading(false);
    }
  };

  const startLoan = (type) => {
    const cfg = LOAN_FORMS[type];
    send(`I want a ${cfg.name}. What are the eligibility criteria and what details do you need from me?`, cfg.label);
    setLoanForm({ type, values: {} });
  };

  const submitLoanForm = () => {
    const cfg = LOAN_FORMS[loanForm.type];
    const details = cfg.fields
      .map(([key, label]) => `${label}: ${loanForm.values[key] || "not provided"}`)
      .join("; ");
    send(`I want to apply for a ${cfg.name}. My details: ${details}. ` +
         `Am I eligible, what are the next steps, and whom should I contact?`);
    setLoanForm(null);
  };

  const setField = (key, value) =>
    setLoanForm(f => ({ ...f, values: { ...f.values, [key]: value } }));

  return (
    <>
      {/* Floating bubble bottom-right */}
      {!open && (
        <button onClick={openChat} style={{
          position: "fixed", bottom: 24, right: 24, width: 60, height: 60,
          borderRadius: "50%", background: green, border: "none",
          fontSize: 28, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.5)", zIndex: 1000
        }}>💬</button>
      )}

      {/* Chat console on the right */}
      {open && (
        <div style={{
          position: "fixed", bottom: 0, right: 0, width: 360, height: "100vh",
          background: darker, color: "#fff", display: "flex", flexDirection: "column",
          borderLeft: `2px solid ${hallucinate ? red : green}`, zIndex: 1000, fontFamily: "Inter, sans-serif"
        }}>
          {/* Header */}
          <div style={{
            background: green, color: "#000", padding: 14,
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <b>🟢 Monex Assistant</b>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {demoMode && (
                <button
                  onClick={() => setHallucinate(h => !h)}
                  title="Demo only: makes the AI give wrong answers to test Galileo"
                  style={{
                    background: hallucinate ? red : "#000", color: hallucinate ? "#fff" : green,
                    border: "none", borderRadius: 8, padding: "4px 8px",
                    fontSize: 12, fontWeight: "bold", cursor: "pointer"
                  }}>
                  🧪 {hallucinate ? "Hallucination ON" : "Hallucination OFF"}
                </button>
              )}
              <button onClick={resetChat} title="New chat" style={{
                background: "none", border: "none", fontSize: 18, cursor: "pointer"
              }}>↺</button>
              <button onClick={() => setOpen(false)} title="Close" style={{
                background: "none", border: "none", fontSize: 20, cursor: "pointer"
              }}>✕</button>
            </div>
          </div>

          {hallucinate && (
            <div style={{ background: red, color: "#fff", fontSize: 12, padding: "6px 12px" }}>
              Test mode: answers are deliberately wrong and tagged in Galileo.
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ textAlign: m.from === "user" ? "right" : "left", margin: "8px 0" }}>
                <span style={{
                  display: "inline-block", padding: "8px 12px", borderRadius: 12, maxWidth: "80%",
                  whiteSpace: "pre-wrap", textAlign: "left",
                  background: m.from === "user" ? green : dark,
                  color: m.from === "user" ? "#000" : (m.error ? red : "#fff"),
                  border: m.test && m.from === "bot" ? `1px solid ${red}` : "none"
                }}>
                  {m.text}
                  {m.test && m.from === "bot" && (
                    <div style={{ marginTop: 6, fontSize: 11, color: red }}>🧪 test answer</div>
                  )}
                </span>
              </div>
            ))}

            {/* Loan quick buttons shown at start */}
            {msgs.length <= 1 && !loanForm && (
              <div style={{ marginTop: 10 }}>
                {Object.entries(LOAN_FORMS).map(([type, cfg]) => (
                  <button key={type} onClick={() => startLoan(type)} disabled={loading} style={{
                    display: "block", width: "100%", margin: "6px 0", padding: 10,
                    background: dark, color: green, border: `1px solid ${green}`,
                    borderRadius: 10, cursor: "pointer", textAlign: "left"
                  }}>{cfg.label}</button>
                ))}
              </div>
            )}

            {/* Loan inline form */}
            {loanForm && (
              <div style={{ background: dark, padding: 12, borderRadius: 10, marginTop: 8 }}>
                <div style={{ color: green, fontWeight: "bold", marginBottom: 6 }}>
                  {LOAN_FORMS[loanForm.type].name} details
                </div>
                {LOAN_FORMS[loanForm.type].fields.map(([key, label]) => (
                  <input key={key} placeholder={label} value={loanForm.values[key] || ""}
                    onChange={e => setField(key, e.target.value)} style={inputStyle} />
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <button onClick={submitLoanForm} disabled={loading} style={{
                    flex: 1, padding: 10, background: green, border: "none",
                    borderRadius: 10, fontWeight: "bold", cursor: "pointer"
                  }}>Check eligibility</button>
                  <button onClick={() => setLoanForm(null)} style={{
                    padding: "10px 12px", background: "none", color: "#8b949e",
                    border: "1px solid #30363d", borderRadius: 10, cursor: "pointer"
                  }}>Cancel</button>
                </div>
              </div>
            )}

            {loading && <div style={{ color: "#8b949e", fontStyle: "italic" }}>Assistant is typing…</div>}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div style={{ display: "flex", padding: 10, borderTop: `1px solid ${dark}` }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send(input)}
              placeholder={hallucinate ? "Ask something (test mode)…" : "Ask me anything…"}
              disabled={loading}
              style={{ flex: 1, padding: 10, borderRadius: 10, border: "none", background: dark, color: "#fff" }} />
            <button onClick={() => send(input)} disabled={loading} style={{
              marginLeft: 8, padding: "0 16px", background: green, border: "none",
              borderRadius: 10, fontWeight: "bold", cursor: "pointer", opacity: loading ? 0.6 : 1
            }}>➤</button>
          </div>
        </div>
      )}
    </>
  );
}

const inputStyle = {
  width: "100%", padding: 8, margin: "4px 0", borderRadius: 8,
  border: "none", background: darker, color: "#fff", boxSizing: "border-box"
};