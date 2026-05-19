"use client";

import { useState, useEffect } from "react";
import { 
  ClipboardList, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  ShoppingBag,
  Trash2
} from "lucide-react";
import { SidebarNav } from "@/components/pos/sidebar-nav";
import { useOrders, useCleanupOrders } from "@/hooks/use-orders";
import { OrderDetailModal } from "@/components/pos/order-detail-modal";
import { useSession } from "next-auth/react";
import type { OrderSummary } from "@/types/api-schemas";

const PER_PAGE = 20;

export default function OperationalOrdersPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null);
  const { data: session } = useSession();

  const { data: ordersData, isLoading, isError } = useOrders({
    page,
    per_page: PER_PAGE,
    status: statusFilter,
  });

  const cleanupMutation = useCleanupOrders();

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const orders = ordersData?.data || [];
  const total = ordersData?.total || 0;
  const totalPages = Math.ceil(total / PER_PAGE);
  const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const to = Math.min(page * PER_PAGE, total);

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount).replace("Rp", "Rp ");
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400';
      case 'processing': return 'bg-blue-500/20 text-blue-400';
      case 'pending': return 'bg-amber-500/20 text-amber-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      case 'on-hold': return 'bg-gray-500/20 text-gray-400';
      case 'refunded': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-white/10 text-white/60';
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-neutral-950 text-white">
      <SidebarNav />
      
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 px-6 flex items-center justify-between border-b border-white/5 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-6 h-6 text-white/40" />
            <div>
              <h1 className="text-lg font-bold tracking-tight">POS Orders</h1>
              <div className="text-white/40 text-xs font-mono mt-0.5">
                Last 30 days · {total} transactions
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {session?.user?.role === 'ADMIN' && (
              <button
                onClick={() => cleanupMutation.mutate()}
                disabled={cleanupMutation.isPending}
                style={{ border: '1px solid rgba(239,68,68,0.2)' }}
                className="text-red-400/50 hover:text-red-400 text-xs px-2 py-1 rounded transition-all flex items-center gap-1 disabled:opacity-50"
              >
                <Trash2 className={`w-3 h-3 ${cleanupMutation.isPending ? 'animate-pulse' : ''}`} />
                {cleanupMutation.isPending ? "Clearing..." : "Clear"}
              </button>
            )}
          </div>
        </header>

        {/* Filters */}
        <div className="px-6 py-4 flex items-center justify-end border-b border-white/5 bg-white/[0.02]">

          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-white/20" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white/5 border border-white/10 text-white/70 text-sm rounded-lg px-3 py-1.5 outline-none hover:border-white/20 transition-all cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="pending">Pending</option>
              <option value="on-hold">On Hold</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-white/10 animate-spin" />
            </div>
          ) : isError ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <p className="text-red-400 bg-red-400/10 px-4 py-2 rounded-xl border border-red-400/20 text-sm">
                Failed to load orders. Please try again.
              </p>
            </div>
          ) : orders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <ShoppingBag className="w-12 h-12 text-white/10 mb-4" />
              <p className="text-white/30 font-medium">No orders yet</p>
              <p className="text-white/20 text-xs mt-1">POS orders in the last 30 days will appear here</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-neutral-900/80 backdrop-blur-md z-10">
                <tr className="border-b border-white/5">
                  <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">#</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Customer</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Items</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Total</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((order) => (
                  <tr 
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="group hover:bg-white/[0.03] transition-all cursor-pointer"
                  >
                    <td className="px-6 py-4 font-mono text-sm text-white/80">
                      #{order.wcOrderId || order.posOrderId.slice(-6)}
                    </td>
                    <td className="px-6 py-4 text-sm text-white/60">
                      {order.customerName || "Guest"}
                    </td>
                    <td className="px-6 py-4 text-xs text-white/50">
                      {order.items?.length || 0} item
                    </td>
                    <td className="px-6 py-4 font-mono text-sm font-bold text-white">
                      {formatIDR(order.total)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(order.wcStatus)}`}>
                        {order.wcStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[11px] text-white/40 whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        <footer 
          style={{ 
            background: 'rgba(0,0,0,0.3)', 
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid rgba(255,255,255,0.1)' 
          }}
          className="h-14 px-6 flex items-center justify-between shrink-0"
        >
          <div className="text-white/40 text-xs font-mono">
            Showing {from}–{to} of {total} orders
          </div>

          <div className="flex items-center">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              style={{ 
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)' 
              }}
              className="text-white/60 hover:text-white p-1.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="text-white/50 text-sm font-mono mx-3">
              Page {page} of {totalPages || 1}
            </span>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              style={{ 
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)' 
              }}
              className="text-white/60 hover:text-white p-1.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </footer>
      </main>

      <OrderDetailModal 
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}
