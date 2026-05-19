"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ShoppingCart, 
  ClipboardList, 
  QrCode, 
  LogOut 
} from "lucide-react";
import { useSessionStore } from "@/store/session.store";
import { signOut } from "next-auth/react";

export const SidebarNav = () => {
  const pathname = usePathname();
  const { cashierName, clearSession } = useSessionStore();

  const navItems = [
    { label: "CASHIER", icon: ShoppingCart, href: "/kasir" },
    { label: "ORDERS", icon: ClipboardList, href: "/orders" },
    { label: "BARCODE", icon: QrCode, href: "/barcode" },
  ];

  const cashierInitial = cashierName ? cashierName.charAt(0).toUpperCase() : "?";

  return (
    <aside 
      style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
      }}
      className="w-16 h-screen flex flex-col items-center py-4 gap-1 shrink-0 z-10"
    >
      {/* Top Section: Logo */}
      <div className="mb-6">
        <div 
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
          className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden"
        >
          <img 
            src="/icon-james.svg" 
            alt="Logo" 
            className="w-6 h-6 object-contain"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        </div>
      </div>

      {/* Center Section: Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              style={isActive ? {
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
              } : undefined}
              className={`flex flex-col items-center gap-1 w-full py-3 rounded-xl transition-all duration-150 group ${
                isActive 
                  ? "text-white" 
                  : "text-white/40 hover:text-white/70 hover:bg-white/10"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium tracking-tight uppercase">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section: User & Session */}
      <div className="mt-auto flex flex-col items-center gap-2 w-full">
        <div 
          style={{ background: 'rgba(255,255,255,0.1)' }}
          className="w-8 h-[1px] mb-2" 
        />
        
        <div 
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 text-xs font-medium"
          title={cashierName || "Cashier"}
        >
          {cashierInitial}
        </div>

        <button
          onClick={async () => {
            clearSession();
            await signOut({ callbackUrl: "/" });
          }}
          className="p-2 text-white/30 hover:text-red-400 transition-colors group"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
