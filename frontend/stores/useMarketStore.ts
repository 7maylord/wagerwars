import { create } from "zustand";
import {
  Market,
  MarketCategory,
  MarketStatus,
  UserPosition,
  PricePoint,
  Trade,
  PortfolioStats,
} from "@/lib/contracts";
import {
  fetchMarkets,
  fetchMarket,
  fetchPriceHistory,
  fetchRecentTrades,
  getUserPosition,
  getUserPositions,
} from "@/lib/stacks";

type SortOption = "newest" | "volume" | "ending";

interface MarketFilters {
  category: MarketCategory | "all";
  status: MarketStatus | "all";
  search: string;
  sort: SortOption;
}

interface MarketState {
  // Markets list
  markets: Market[];
  isLoadingMarkets: boolean;
  filters: MarketFilters;

  // Current market detail
  currentMarket: Market | null;
  priceHistory: PricePoint[];
  recentTrades: Trade[];
  userPosition: UserPosition | null;
  isLoadingMarket: boolean;

  // Portfolio
  positions: UserPosition[];
  portfolioStats: PortfolioStats | null;
  isLoadingPortfolio: boolean;

  // Actions
  loadMarkets: () => Promise<void>;
  setFilters: (filters: Partial<MarketFilters>) => void;
  loadMarket: (marketId: string, userAddress?: string) => Promise<void>;
  loadPortfolio: (userAddress: string) => Promise<void>;
  refreshMarket: (marketId: string) => Promise<void>;
}

const defaultFilters: MarketFilters = {
  category: "all",
  status: "all",
  search: "",
  sort: "volume",
};

export const useMarketStore = create<MarketState>()((set, get) => ({
  markets: [],
  isLoadingMarkets: false,
  filters: defaultFilters,

  currentMarket: null,
  priceHistory: [],
  recentTrades: [],
  userPosition: null,
  isLoadingMarket: false,

  positions: [],
  portfolioStats: null,
  isLoadingPortfolio: false,

  loadMarkets: async () => {
    set({ isLoadingMarkets: true });
    try {
      const { filters } = get();
      const markets = await fetchMarkets({
        category: filters.category === "all" ? undefined : filters.category,
        status: filters.status === "all" ? undefined : filters.status,
        search: filters.search || undefined,
      });

      // Sort markets
      const sorted = [...markets].sort((a, b) => {
        switch (filters.sort) {
          case "newest":
            return b.createdAt - a.createdAt;
          case "volume":
            return b.volume - a.volume;
          case "ending":
            return a.lockTime - b.lockTime;
          default:
            return 0;
        }
      });

      set({ markets: sorted, isLoadingMarkets: false });
    } catch (error) {
      console.error("Failed to load markets:", error);
      set({ isLoadingMarkets: false });
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    // Reload markets with new filters
    get().loadMarkets();
  },

  loadMarket: async (marketId, userAddress) => {
    set({ isLoadingMarket: true, currentMarket: null });
    try {
      const [market, priceHistory, recentTrades] = await Promise.all([
        fetchMarket(marketId),
        fetchPriceHistory(marketId),
        fetchRecentTrades(marketId),
      ]);

      let userPosition = null;
      if (userAddress) {
        userPosition = await getUserPosition(marketId, userAddress);
      }

      set({
        currentMarket: market,
        priceHistory,
        recentTrades,
        userPosition,
        isLoadingMarket: false,
      });
    } catch (error) {
      console.error("Failed to load market:", error);
      set({ isLoadingMarket: false });
    }
  },

  loadPortfolio: async (userAddress) => {
    set({ isLoadingPortfolio: true });
    try {
      const positions = await getUserPositions(userAddress);

      // Calculate stats
      const totalValue = positions.reduce((sum, p) => sum + p.value, 0);
      const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
      const totalCost = totalValue - totalPnl;

      const stats: PortfolioStats = {
        totalValue,
        totalPnl,
        totalPnlPercent: totalCost > 0 ? (totalPnl / totalCost) * 100 : 0,
        activePositions: positions.length,
        marketsWon: 3, // Mock
        marketsLost: 1, // Mock
      };

      set({
        positions,
        portfolioStats: stats,
        isLoadingPortfolio: false,
      });
    } catch (error) {
      console.error("Failed to load portfolio:", error);
      set({ isLoadingPortfolio: false });
    }
  },

  refreshMarket: async (marketId) => {
    const { currentMarket } = get();
    if (currentMarket?.id !== marketId) return;

    try {
      const [market, recentTrades] = await Promise.all([
        fetchMarket(marketId),
        fetchRecentTrades(marketId),
      ]);

      set({
        currentMarket: market,
        recentTrades,
      });
    } catch (error) {
      console.error("Failed to refresh market:", error);
    }
  },
}));
