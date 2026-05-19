"use client";

import React from "react";
import { SidebarNav } from "@/components/pos/sidebar-nav";
import { BarcodeSidebar } from "@/components/barcode/barcode-sidebar";
import { BarcodePreview } from "@/components/barcode/barcode-preview";

export default function BarcodePage() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-transparent">
      {/* Vertical Navigation Sidebar */}
      <SidebarNav />

      <main className="flex flex-1 overflow-hidden">
        {/* Left: Barcode Management Sidebar */}
        <BarcodeSidebar />

        {/* Right: Barcode Preview & Print Area */}
        <BarcodePreview />
      </main>
    </div>
  );
}
