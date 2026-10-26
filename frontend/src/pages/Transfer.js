import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { inr } from "../api";
import { theme } from "./styles";

export default function Transfer() {
  const [bens, setBens] = useState([]);
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("IMPS");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const id = localStorage.getItem("userId");

  useEffect(() => {
    api.get("/api/beneficiaries").then(r =>
      setBens(r.data.filter(b => String(b.id) !== String(id))));
  }, [id]);

  const doTransfer = async () => {
    setLoading(true);
    setMsg(mode === "NEFT" ? "Processing NEFT... please wait (this takes a few seconds)" : "Processing...");
    const { data } = await api.post("/api/transfer", { fromId:id, toId, amount, mode });
    setMsg(data.msg || (data.success ? "Success" : "Failed"));
    setLoading(false);
  };

  return (
    <div style={theme.page}>
      <div style={theme.card}>
        <h3>Fund Transfer</h3>
        <div style={{display:"flex",gap:6}}>
          {["NEFT","IMPS","RTGS"].map(m=>(
            <button key={m} style={m===mode?theme.btn:theme.btnDark} onClick={()=>setMode(m)}>{m}</button>
          ))}
        </div>
        <label>Select Beneficiary</label>
        <select style={theme.input} value={toId} onChange={e=>setToId(e.target.value)}>
          <option value="">-- choose --</option>
          {bens.map(b=>(
            <option key={b.id} value={b.id}>{b.fullName} ({b.accountNumber})</option>
          ))}
        </select>
        <input style={theme.input} placeholder="Amount (₹)" value={amount} onChange={e=>setAmount(e.target.value)} />
        <button style={theme.btn} disabled={loading||!toId} onClick={doTransfer}>
          {loading?"Processing...":`Send via ${mode}`}
        </button>
        <button style={theme.btnDark} onClick={()=>alert("Add Beneficiary (demo)")}>Add Beneficiary</button>
        {msg && <p style={{color:"#b6f500"}}>{msg}</p>}
        <button style={theme.btnDark} onClick={()=>nav("/home")}>Back to Home</button>
      </div>
    </div>
  );
}