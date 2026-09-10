"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, History, LayoutDashboard, MessageCircle, Settings } from "lucide-react";

const items = [
  { href: "/dashboard", label: "오늘", icon: LayoutDashboard },
  { href: "/records", label: "기록", icon: History },
  { href: "/insights", label: "인사이트", icon: BarChart3 },
  { href: "/ai", label: "AI", icon: MessageCircle },
  { href: "/settings", label: "설정", icon: Settings },
];

export function Navigation() {
  const path = usePathname();
  return <nav aria-label="주요 메뉴" className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-2xl justify-around border-t border-line bg-surface/95 px-2 pt-2 backdrop-blur-xl">
    {items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined}
      className={`flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 rounded-xl text-xs font-bold focus-visible:ring-2 focus-visible:ring-accent ${path === href ? "text-accent-deep" : "text-ink-muted"}`}>
      <Icon className="size-5" aria-hidden="true" />{label}
    </Link>)}
  </nav>;
}
