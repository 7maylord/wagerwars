"use client";

import { useMemo } from "react";
import { Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PricePoint, priceToPercent } from "@/lib/contracts";

interface PriceChartProps {
  data: PricePoint[];
  outcomeLabel?: string;
}

export default function PriceChart({ data, outcomeLabel = "Yes" }: PriceChartProps) {
  const chartData = useMemo(() => {
    return data.map((point) => ({
      timestamp: point.timestamp,
      price: priceToPercent(point.price),
      date: new Date(point.timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    }));
  }, [data]);

  const currentPrice = chartData[chartData.length - 1]?.price || 50;
  const startPrice = chartData[0]?.price || 50;
  const priceChange = currentPrice - startPrice;
  const isPositive = priceChange >= 0;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Price History</CardTitle>
          <div className="text-right">
            <p className="text-2xl font-bold font-mono text-primary">
              {currentPrice.toFixed(1)}%
            </p>
            <p className={`text-sm font-mono ${isPositive ? "text-success" : "text-destructive"}`}>
              {isPositive ? "+" : ""}{priceChange.toFixed(1)}%
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(180, 100%, 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(180, 100%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                stroke="hsl(229, 15%, 62%)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="hsl(229, 15%, 62%)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(230, 60%, 6%)",
                  border: "1px solid hsl(230, 35%, 16%)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                }}
                labelStyle={{ color: "hsl(229, 15%, 62%)", fontSize: 12 }}
                formatter={(value: number) => [`${value.toFixed(1)}%`, outcomeLabel]}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="hsl(180, 100%, 50%)"
                strokeWidth={2}
                fill="url(#priceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
