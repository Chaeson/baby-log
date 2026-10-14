"use client";

import { useEffect, useState, type ReactNode } from "react";
import { API_BASE_URL, FAMILY_STORAGE_KEY } from "@/lib/api";
import { authHeaders, finishLogin, login } from "@/lib/auth";

export function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("로그인 상태를 확인하고 있어요…");
  useEffect(() => {
    let active = true;
    async function check() {
      const config = await fetch(`${API_BASE_URL}/api/v1/session/config`, { cache: "no-store" });
      if (!config.ok) throw new Error("서버 연결을 확인해 주세요.");
      const settings = await config.json();
      if (settings.authenticationRequired === false) { if (active) setReady(true); return; }
      if (settings.authenticationRequired !== true) throw new Error("서버 로그인 설정을 확인할 수 없어요.");
      await finishLogin();
      if (!authHeaders().Authorization) { if (active) setMessage("로그인하고 우리 가족 기록을 시작하세요."); return; }
      const response = await fetch(`${API_BASE_URL}/api/v1/session`, { method: "POST", headers: authHeaders() });
      if (!response.ok) throw new Error("로그인을 다시 진행해 주세요.");
      const session = await response.json();
      if (session.familyId) localStorage.setItem(FAMILY_STORAGE_KEY, session.familyId);
      else localStorage.removeItem(FAMILY_STORAGE_KEY);
      if (active) setReady(true);
    }
    void check().catch(error => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, []);
  if (ready) return children;
  return <main className="page space-y-5"><h1 className="text-3xl font-bold">우리 가족의 육아 기록</h1><p role="status">{message}</p><button className="action primary" onClick={() => void login().catch(error => setMessage(error.message))}>이메일로 로그인 / 가입</button></main>;
}
