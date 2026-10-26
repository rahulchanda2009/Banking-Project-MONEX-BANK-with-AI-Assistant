import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { inr } from "../api";
import { theme } from "./styles";

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [msg, setMsg] = useState("");
  const nav = useNavigate();
  const id = localStorage.getItem("userId");

  const load = () => api.get(`/api/loans/${id}`).then(r => setLoans(r.data));
  useEffect(() => { load(); }, [id]);

  const pay = async (loanId, type) => {
    const { data } = await api.post("/api/loan/pay", { loanId, amount: 10000 });
    if (data.success) { setMsg(`${type} loan EMI ₹10,000 paid. Outstanding: ${inr(data.outstanding)}`); load(); }
  };

  const vehicle = loans.find(l => l.loanType === "Vehicle");
  const home = loans.find(l => l.loanType === "Personal");

  return (
    <div style={theme.page}>
      <div style={theme.card}>
        <h3>Loans</h3>
        <div style={theme.green}>
          <b>Existing Loans</b>
          {loans.length===0 && <p>No active loans</p>}
          {loans.map(l=>(
            <p key={l.id}>{l.loanType}: {inr(l.outstanding)} outstanding</p>
          ))}
        </div>
        <h4>New Loan Options</h4>
        <button style={theme.btnDark} onClick={()=>alert("Vehicle loan application submitted (demo)")}>Apply Vehicle Loan</button>
        <button style={theme.btnDark} onClick={()=>alert("Personal loan application submitted (demo)")}>Apply Personal Loan</button>
        <button style={theme.btn} disabled={!vehicle} onClick={()=>pay(vehicle.id,"Vehicle")}>Pay Vehicle Loan</button>
        <button style={theme.btn} disabled={!home} onClick={()=>pay(home.id,"Home")}>Pay Home Loan</button>
        {msg && <p style={{color:"#b6f500"}}>{msg}</p>}
        <button style={theme.btnDark} onClick={()=>nav("/home")}>Back to Home</button>
      </div>
    </div>
  );
}