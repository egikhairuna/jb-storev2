import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SessionStore {
  cashierName: string | null;
  loginTime: string | null;
  setSession: (name: string, time: string) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      cashierName: null,
      loginTime: null,
      setSession: (name, time) => set({ cashierName: name, loginTime: time }),
      clearSession: () => set({ cashierName: null, loginTime: null }),
    }),
    {
      name: 'pos-session',
      storage: createJSONStorage(() => typeof window !== 'undefined' ? sessionStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
      }),
    }
  )
);
