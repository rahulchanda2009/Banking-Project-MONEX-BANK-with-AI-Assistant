import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { inr } from "../api";
import { theme } from "./styles";

export default function Home() {
  const [u, setU] = useState(null);
  const nav = useNavigate();
  const id = localStorage.getItem("userId");

  useEffect(() => {
    if (!id) return nav("/");
    api.get(`/api/account/${id}`).then(r => setU(r.data));
  }, [id, nav]);

  if (!u) return <div style={theme.page}>Loading...</div>;

  return (
    <div style={theme.page}>
      <div style={theme.card}>
        <h3>Home</h3>
        <div style={theme.green}>
          <small>Total Balance</small>
          <h1>{inr(u.balance)}</h1>
          <small>Acc: {u.accountNumber}</small>
        </div>
        <p><b>Debit Card:</b> {u.debitCardNumber}<br/>Bal: {inr(u.debitCardBalance)}</p>
        <p><b>Credit Card:</b> {u.creditCardNumber}<br/>Limit: {inr(u.creditCardLimit)}</p>
        <button style={theme.btn} onClick={()=>nav("/transfer")}>Fund Transfer</button>
        <button style={theme.btn} onClick={()=>nav("/loans")}>Apply Loan</button>
        <button style={theme.btnDark} onClick={()=>nav("/home")}>Back to Home</button>
        <button style={theme.btnDark} onClick={()=>{localStorage.clear();nav("/");}}>Logout</button>
      </div>
    </div>
  );
}