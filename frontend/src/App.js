import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Transfer from "./pages/Transfer";
import Loans from "./pages/Loans";
import ChatBot from "./components/ChatBot";

function Shell() {
  const loc = useLocation();
  // Show chatbot everywhere except the login page
  const showBot = loc.pathname !== "/";
  return (
    <>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/transfer" element={<Transfer />} />
        <Route path="/loans" element={<Loans />} />
      </Routes>
      {showBot && <ChatBot />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}