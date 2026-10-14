"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard"); }, [router]);
  return <p role="status" className="page">오늘 기록으로 이동하고 있어요…</p>;
}
