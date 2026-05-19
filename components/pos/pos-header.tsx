import React, { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, Check } from "lucide-react";
import { useSyncProducts } from "@/hooks/use-sync";

interface POSHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
}

export const POSHeader = ({ 
  searchQuery, 
  onSearchChange, 
  searchRef,
}: POSHeaderProps) => {
  const { sync, isSyncing, status } = useSyncProducts();
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSync = useCallback(() => {
    sync(true);
  }, [sync]);

  // Show brief "✓ Synced" feedback for 2 seconds after success
  useEffect(() => {
    if (status === 'success') {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const categories = [
    { id: "all", name: "All Products" },
  ];

  const [activeCategory, setActiveCategory] = React.useState("all");

  const getSyncLabel = () => {
    if (isSyncing) return "Syncing...";
    if (showSuccess) return "Synced";
    return "Sync";
  };

  const getSyncIcon = () => {
    if (showSuccess) {
      return <Check className="h-4 w-4 text-green-400" />;
    }
    return <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />;
  };

  return (
    <header className="flex flex-col w-full">
      {/* Header row 1 (search + sync) */}
      <div 
        style={{
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
        className="px-4 py-2.5 flex items-center gap-3"
      >
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search products..."
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
            className="h-9 w-full rounded-lg px-3 pl-9 text-sm text-white placeholder:text-white/30 outline-none"
          />
        </div>

        <button
          onClick={handleSync}
          disabled={isSyncing}
          style={{ 
            background: showSuccess ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.1)', 
            border: showSuccess ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255,255,255,0.15)',
          }}
          className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-all ${
            isSyncing 
              ? "text-white/40 opacity-60 cursor-not-allowed" 
              : showSuccess 
                ? "text-green-400" 
                : "text-white/60 hover:text-white"
          }`}
        >
          {getSyncIcon()}
          <span className="hidden sm:inline">{getSyncLabel()}</span>
        </button>
      </div>

      {/* Category tabs row */}
      <div 
        style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
        className="px-4 py-2 flex gap-1 overflow-x-auto scrollbar-none"
      >
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={isActive ? { 
                background: 'rgba(255,255,255,0.2)', 
                border: '1px solid rgba(255,255,255,0.3)' 
              } : undefined}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                isActive ? "text-white" : "text-white/40 hover:text-white/70 hover:bg-white/10"
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>
    </header>
  );
};
