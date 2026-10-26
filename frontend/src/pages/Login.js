import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { theme } from "./styles";

export default function Login() {
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();

  const submit = async () => {
    const { data } = await api.post("/api/login", { username, password });
    if (data.success) {
      localStorage.setItem("userId", data.userId);
      nav("/home");
    } else setErr("Invalid credentials");
  };

  return (
    <div style={theme.page}>
      <div style={theme.card}>
        <h2 style={{ textAlign:"center" }}>🟢 MONEX BANK</h2>
        <p style={{textAlign:"center",color:"#8b949e"}}>Banking for the future</p>
        <input style={theme.input} placeholder="Username" value={username} onChange={e=>setU(e.target.value)} />
        <input style={theme.input} type="password" placeholder="Password" value={password} onChange={e=>setP(e.target.value)} />
        {err && <p style={{color:"salmon"}}>{err}</p>}
        <button style={theme.btn} onClick={submit}>Submit</button>
        <p style={{fontSize:12,color:"#8b949e"}}>Try: leonard / leonard</p>
      </div>
    </div>
  );
}