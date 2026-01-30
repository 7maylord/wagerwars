"use client";

import { useEffect, useState } from "react";
import { Search, TrendingUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import MarketCard from "@/components/MarketCard";
import { useMarketStore } from "@/stores/useMarketStore";
import { MarketCategory } from "@/lib/contracts";
import { cn } from "@/lib/utils";

const categories: { value: MarketCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "crypto", label: "Crypto" },
  { value: "sports", label: "Sports" },
  { value: "politics", label: "Politics" },
  { value: "entertainment", label: "Entertainment" },
];

const sortOptions = [
  { value: "volume", label: "Most Volume" },
  { value: "newest", label: "Newest" },
  { value: "ending", label: "Ending Soon" },
] as const;

export default function MarketsPage() {
  const { markets, isLoadingMarkets, filters, loadMarkets, setFilters } = useMarketStore();
  const [searchInput, setSearchInput] = useState(filters.search);

  useEffect(() => {
    loadMarkets();
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        setFilters({ search: searchInput });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const selectedSort = sortOptions.find((s) => s.value === filters.sort);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative border-b border-border/50 bg-gradient-to-b from-card/50 to-background">
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="absolute inset-0 gradient-radial-top" />

        <div className="relative container px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3 font-display text-glow-cyan">
              Prediction Markets
            </h1>
            <p className="text-muted-foreground mb-6">
              Trade on future outcomes. Bet with conviction.
            </p>

            {/* Search */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search markets..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 bg-card border-border focus:border-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-16 z-40 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container px-4 py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Category Tabs */}
            <Tabs
              value={filters.category}
              onValueChange={(v) => setFilters({ category: v as MarketCategory | "all" })}
            >
              <TabsList className="bg-muted/50 h-9">
                {categories.map((cat) => (
                  <TabsTrigger
                    key={cat.value}
                    value={cat.value}
                    className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {cat.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-border gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {selectedSort?.label}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                {sortOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setFilters({ sort: option.value })}
                    className={cn(
                      "cursor-pointer",
                      filters.sort === option.value && "text-primary"
                    )}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Markets Grid */}
      <div className="container px-4 py-8">
        {isLoadingMarkets ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-[280px] bg-card" />
            ))}
          </div>
        ) : markets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {markets.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">No markets found</p>
            <Button variant="outline" onClick={() => setFilters({ category: "all", search: "" })}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
