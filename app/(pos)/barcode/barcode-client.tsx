"use client";

import React from "react";
import { SidebarNav } from "@/components/pos/sidebar-nav";
import { BarcodeSidebar } from "@/components/barcode/barcode-sidebar";
import { BarcodePreview } from "@/components/barcode/barcode-preview";

export default function BarcodePage() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-neutral-950 text-white">
      {/* Vertical Navigation Sidebar */}
      <SidebarNav />

      {/* Main content area: 12-column grid */}
      <main className="flex-1 grid grid-cols-12 overflow-hidden min-w-0">
        {/* Left: Barcode Queue Sidebar (col-span-3) */}
        <div className="col-span-3 h-full overflow-hidden">
          <BarcodeSidebar />
        </div>

        {/* Right: Barcode Preview & Print Area (col-span-9) */}
        <div className="col-span-9 h-full overflow-hidden">
          <BarcodePreview />
        </div>
      </main>
    </div>
  );
}
