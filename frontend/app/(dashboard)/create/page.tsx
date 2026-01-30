"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Minus,
  Binary,
  List,
  LineChart,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useWalletStore } from "@/stores/useWalletStore";
import { MarketType, MarketCategory, USDCX_PRECISION } from "@/lib/contracts";
import { createBinaryMarket, createCategoricalMarket, createScalarMarket } from "@/lib/stacks";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, name: "Market Type" },
  { id: 2, name: "Question" },
  { id: 3, name: "Outcomes" },
  { id: 4, name: "Timing" },
  { id: 5, name: "Oracle & Liquidity" },
  { id: 6, name: "Review" },
];

const marketTypes: { type: MarketType; icon: typeof Binary; title: string; description: string }[] = [
  {
    type: "binary",
    icon: Binary,
    title: "Binary",
    description: "Simple Yes/No outcome. Best for straightforward questions.",
  },
  {
    type: "categorical",
    icon: List,
    title: "Categorical",
    description: "Multiple possible outcomes. Great for elections, competitions.",
  },
  {
    type: "scalar",
    icon: LineChart,
    title: "Scalar",
    description: "Numeric range outcome. Ideal for prices, percentages.",
  },
];

const categories: MarketCategory[] = ["crypto", "sports", "politics", "entertainment", "other"];

export default function CreateMarketPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isConnected, connect, address } = useWalletStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [marketType, setMarketType] = useState<MarketType>("binary");
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<MarketCategory>("crypto");
  const [outcomes, setOutcomes] = useState<string[]>(["", ""]);
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [lockDate, setLockDate] = useState("");
  const [lockTime, setLockTime] = useState("12:00");
  const [resolutionDate, setResolutionDate] = useState("");
  const [resolutionTime, setResolutionTime] = useState("12:00");
  const [oracle, setOracle] = useState("");
  const [liquidity, setLiquidity] = useState("100");

  const addOutcome = () => {
    if (outcomes.length < 10) {
      setOutcomes([...outcomes, ""]);
    }
  };

  const removeOutcome = (index: number) => {
    if (outcomes.length > 2) {
      setOutcomes(outcomes.filter((_, i) => i !== index));
    }
  };

  const updateOutcome = (index: number, value: string) => {
    const newOutcomes = [...outcomes];
    newOutcomes[index] = value;
    setOutcomes(newOutcomes);
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!isConnected) {
      connect();
      return;
    }

    setIsSubmitting(true);
    try {
      const lockTimestamp = new Date(`${lockDate}T${lockTime}`).getTime();
      const resolutionTimestamp = new Date(`${resolutionDate}T${resolutionTime}`).getTime();
      const liquidityAmount = parseFloat(liquidity) * USDCX_PRECISION;

      let marketId: string;

      if (marketType === "binary") {
        marketId = await createBinaryMarket({
          question,
          description,
          category,
          lockTime: lockTimestamp,
          resolutionTime: resolutionTimestamp,
          oracle: oracle || address || "",
          liquidity: liquidityAmount,
        });
      } else if (marketType === "categorical") {
        marketId = await createCategoricalMarket({
          question,
          description,
          category,
          outcomes: outcomes.filter(Boolean),
          lockTime: lockTimestamp,
          resolutionTime: resolutionTimestamp,
          oracle: oracle || address || "",
          liquidity: liquidityAmount,
        });
      } else {
        marketId = await createScalarMarket({
          question,
          description,
          category,
          minValue: parseFloat(minValue),
          maxValue: parseFloat(maxValue),
          lockTime: lockTimestamp,
          resolutionTime: resolutionTimestamp,
          oracle: oracle || address || "",
          liquidity: liquidityAmount,
        });
      }

      toast({
        title: "Market Created!",
        description: "Your prediction market is now live.",
      });

      router.push(`/market/${marketId}`);
    } catch (error) {
      toast({
        title: "Failed to Create Market",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return true;
      case 2:
        return question.trim().length > 10 && category;
      case 3:
        if (marketType === "binary") return true;
        if (marketType === "categorical") return outcomes.filter(Boolean).length >= 2;
        if (marketType === "scalar") return minValue && maxValue && parseFloat(minValue) < parseFloat(maxValue);
        return false;
      case 4:
        return lockDate && resolutionDate && new Date(lockDate) < new Date(resolutionDate);
      case 5:
        return parseFloat(liquidity) >= 10;
      case 6:
        return isConnected;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/30">
        <div className="container px-4 py-6">
          <Link
            href="/markets"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Markets
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold">Create Market</h1>
          <p className="text-muted-foreground mt-1">
            Launch your own prediction market in minutes
          </p>
        </div>
      </div>

      <div className="container px-4 py-8 max-w-3xl">
        {/* Progress Steps */}
        <nav className="mb-8">
          <ol className="flex items-center justify-between">
            {steps.map((step, index) => (
              <li key={step.id} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                    currentStep > step.id
                      ? "bg-primary text-primary-foreground"
                      : currentStep === step.id
                      ? "bg-primary/20 text-primary border-2 border-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step.id
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "hidden sm:block w-12 lg:w-20 h-0.5 mx-2",
                      currentStep > step.id ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </li>
            ))}
          </ol>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            {steps.map((step) => (
              <span key={step.id} className="hidden sm:block">{step.name}</span>
            ))}
          </div>
        </nav>

        {/* Step Content */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].name}</CardTitle>
            <CardDescription>
              {currentStep === 1 && "Choose how your market will resolve"}
              {currentStep === 2 && "What do you want people to predict?"}
              {currentStep === 3 && "Define the possible outcomes"}
              {currentStep === 4 && "When will trading stop and the market resolve?"}
              {currentStep === 5 && "Who will resolve the market and how much liquidity to provide?"}
              {currentStep === 6 && "Review your market before submitting"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Market Type */}
            {currentStep === 1 && (
              <div className="grid gap-4">
                {marketTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.type}
                      onClick={() => setMarketType(type.type)}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-lg border text-left transition-all",
                        marketType === type.type
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-lg",
                        marketType === type.type ? "bg-primary/20" : "bg-muted"
                      )}>
                        <Icon className={cn(
                          "h-6 w-6",
                          marketType === type.type ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div>
                        <h3 className="font-medium">{type.title}</h3>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Step 2: Question */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="question">Question</Label>
                  <Textarea
                    id="question"
                    placeholder="Will Bitcoin reach $150,000 by March 2025?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="min-h-[100px] bg-input border-border"
                  />
                  <p className="text-xs text-muted-foreground">
                    Make it clear and unambiguous. {question.length}/200 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Provide additional context and resolution criteria..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[80px] bg-input border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as MarketCategory)}>
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat} className="capitalize">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 3: Outcomes */}
            {currentStep === 3 && (
              <div className="space-y-4">
                {marketType === "binary" && (
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <p className="text-muted-foreground">
                      Binary markets have two outcomes: <strong>Yes</strong> and <strong>No</strong>
                    </p>
                  </div>
                )}

                {marketType === "categorical" && (
                  <div className="space-y-3">
                    {outcomes.map((outcome, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          placeholder={`Outcome ${index + 1}`}
                          value={outcome}
                          onChange={(e) => updateOutcome(index, e.target.value)}
                          className="bg-input border-border"
                        />
                        {outcomes.length > 2 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOutcome(index)}
                            className="shrink-0"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {outcomes.length < 10 && (
                      <Button variant="outline" onClick={addOutcome} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Outcome
                      </Button>
                    )}
                  </div>
                )}

                {marketType === "scalar" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minValue">Minimum Value</Label>
                      <Input
                        id="minValue"
                        type="number"
                        placeholder="0"
                        value={minValue}
                        onChange={(e) => setMinValue(e.target.value)}
                        className="bg-input border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxValue">Maximum Value</Label>
                      <Input
                        id="maxValue"
                        type="number"
                        placeholder="100"
                        value={maxValue}
                        onChange={(e) => setMaxValue(e.target.value)}
                        className="bg-input border-border"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Timing */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label>Lock Time (trading stops)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="date"
                      value={lockDate}
                      onChange={(e) => setLockDate(e.target.value)}
                      className="bg-input border-border"
                    />
                    <Input
                      type="time"
                      value={lockTime}
                      onChange={(e) => setLockTime(e.target.value)}
                      className="bg-input border-border"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Resolution Time (market resolves)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="date"
                      value={resolutionDate}
                      onChange={(e) => setResolutionDate(e.target.value)}
                      className="bg-input border-border"
                    />
                    <Input
                      type="time"
                      value={resolutionTime}
                      onChange={(e) => setResolutionTime(e.target.value)}
                      className="bg-input border-border"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Resolution time must be after lock time
                  </p>
                </div>
              </div>
            )}

            {/* Step 5: Oracle & Liquidity */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="oracle">Oracle Address (optional)</Label>
                  <Input
                    id="oracle"
                    placeholder="SP... (leave empty to use your address)"
                    value={oracle}
                    onChange={(e) => setOracle(e.target.value)}
                    className="bg-input border-border font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    The oracle is responsible for resolving the market
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="liquidity">Initial Liquidity (USDCx)</Label>
                  <Input
                    id="liquidity"
                    type="number"
                    placeholder="100"
                    value={liquidity}
                    onChange={(e) => setLiquidity(e.target.value)}
                    className="bg-input border-border"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 10 USDCx. More liquidity = better prices for traders
                  </p>
                </div>
              </div>
            )}

            {/* Step 6: Review */}
            {currentStep === 6 && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium capitalize">{marketType}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-medium capitalize">{category}</span>
                  </div>
                  <div className="py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Question</span>
                    <p className="font-medium mt-1">{question}</p>
                  </div>
                  {marketType === "categorical" && (
                    <div className="py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Outcomes</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {outcomes.filter(Boolean).map((o, i) => (
                          <span key={i} className="px-2 py-1 bg-muted rounded text-sm">{o}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Lock Time</span>
                    <span className="font-medium">{lockDate} {lockTime}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Resolution Time</span>
                    <span className="font-medium">{resolutionDate} {resolutionTime}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Liquidity</span>
                    <span className="font-medium">{liquidity} USDCx</span>
                  </div>
                </div>

                {!isConnected && (
                  <p className="text-sm text-warning text-center py-2">
                    Connect your wallet to create the market
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {currentStep < steps.length ? (
            <Button
              onClick={nextStep}
              disabled={!canProceed()}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Create Market
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
