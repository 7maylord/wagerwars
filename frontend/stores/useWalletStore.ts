import { create } from "zustand";
import { persist } from "zustand/middleware";
import { connectWallet, disconnectWallet, getUSDCxBalance } from "@/lib/stacks";
import { USDCX_PRECISION } from "@/lib/contracts";

interface WalletState {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  stxBalance: number;
  usdcxBalance: number;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalances: () => Promise<void>;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      isConnected: false,
      isConnecting: false,
      address: null,
      stxBalance: 0,
      usdcxBalance: 0,

      connect: async () => {
        set({ isConnecting: true });
        try {
          const result = await connectWallet();
          set({
            isConnected: true,
            address: result.address,
            stxBalance: result.stxBalance,
            usdcxBalance: result.usdcxBalance,
            isConnecting: false,
          });
        } catch (error) {
          console.error("Failed to connect wallet:", error);
          set({ isConnecting: false });
          throw error;
        }
      },

      disconnect: () => {
        disconnectWallet();
        set({
          isConnected: false,
          address: null,
          stxBalance: 0,
          usdcxBalance: 0,
        });
      },

      refreshBalances: async () => {
        const { address, isConnected } = get();
        if (!isConnected || !address) return;

        try {
          const usdcxBalance = await getUSDCxBalance(address);
          set({ usdcxBalance });
        } catch (error) {
          console.error("Failed to refresh balances:", error);
        }
      },
    }),
    {
      name: "wagerwars-wallet",
      partialize: (state) => ({
        // Only persist connection state, not actual balances
        isConnected: state.isConnected,
        address: state.address,
      }),
    }
  )
);

// Helper to format balance for display
export function formatBalance(microAmount: number, symbol: string = "USDCx"): string {
  const amount = microAmount / USDCX_PRECISION;
  return `${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${symbol}`;
}
