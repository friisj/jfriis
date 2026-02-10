/* eslint-disable */
"use client";

import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Check,
  ChevronRight,
  ExternalLink,
  Layers,
  Microscope,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  User,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

type AttachmentType = "ticker" | "theme" | "expert" | "index" | "deep-research";
type Mode = "idle" | "preparing" | "ready";

interface AttachmentBase {
  error?: string;
}

interface TickerAttachment extends AttachmentBase {
  symbol: string;
  name: string;
}

interface ManualThemeData {
  title: string;
  thesis: string;
  subThemes: Array<{ id: string; title: string; thesis: string }>;
}

interface GeneratedThemeData {
  sketchId: string;
  sketchName: string;
  sketchDescription: string;
  selectedSubThemes: string[];
}

interface ThemeAttachment extends AttachmentBase {
  name: string;
  subThemeCount: number;
  source: "manual" | "generated";
  manualData?: ManualThemeData;
  generatedData?: GeneratedThemeData;
}

interface ExpertAttachment extends AttachmentBase {
  name: string;
  topic: string;
  topics: string[];
  quote: string;
  bio: string;
  expertView: string;
  authorityScore: number;
  influenceScore: number;
  overallScore: number;
  authorityRank?: number;
  influenceRank?: number;
  overallRank?: number;
}

interface IndexAttachment extends AttachmentBase {
  name: string;
  publisher: string;
  category: "thematic" | "sector" | "strategy" | "geographic";
  isUserCreated?: boolean;
  description: string;
  ytdPerformance: number;
  sectorComposition: { sector: string; weight: number }[];
  externalUrl?: string;
  inceptionDate: string;
  creator: string;
}

interface DeepResearchAttachment extends AttachmentBase {
  isCustom: boolean;
}

interface AttachmentState {
  tickers: TickerAttachment[];
  themes: ThemeAttachment[];
  experts: ExpertAttachment[];
  indices: IndexAttachment[];
  deepResearch: DeepResearchAttachment | null;
}

interface Message {
  id: string;
  text: string;
  attachments: AttachmentState;
  timestamp: Date;
}

// =============================================================================
// STARTER TEXT CONFIG
// =============================================================================

const STARTER_TEXT_CONFIG: Record<
  AttachmentType,
  {
    singular: { text: string; placeholder: string };
    plural: { text: string; placeholder: string };
  }
> = {
  ticker: {
    singular: {
      text: "Add this ticker",
      placeholder: "Ask about this ticker...",
    },
    plural: {
      text: "Add these tickers",
      placeholder: "Ask about these tickers...",
    },
  },
  theme: {
    singular: {
      text: "Use this theme",
      placeholder: "Ask about this theme...",
    },
    plural: {
      text: "Use these themes",
      placeholder: "Ask about these themes...",
    },
  },
  expert: {
    singular: {
      text: "Use this expert",
      placeholder: "Ask with this perspective...",
    },
    plural: {
      text: "Use these experts",
      placeholder: "Ask with these perspectives...",
    },
  },
  index: {
    singular: {
      text: "Use this index",
      placeholder: "Ask about this index...",
    },
    plural: {
      text: "Use these indices",
      placeholder: "Ask about these indices...",
    },
  },
  "deep-research": {
    singular: {
      text: "Start a deep research run",
      placeholder: "What should we research?",
    },
    plural: {
      text: "Start a deep research run",
      placeholder: "What should we research?",
    },
  },
};

const getStarterText = (type: AttachmentType, count: number) => {
  const config = STARTER_TEXT_CONFIG[type];
  return count === 1 ? config.singular : config.plural;
};

const MIXED_PLACEHOLDER = "Add context to your message...";

const ALL_STARTER_TEXTS = Object.values(STARTER_TEXT_CONFIG).flatMap(
  (config) => [config.singular.text + " ", config.plural.text + " "]
);

// =============================================================================
// MENU ITEMS CONFIG
// =============================================================================

const MENU_ITEMS: Array<{
  id: AttachmentType;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    id: "ticker",
    label: "Tickers",
    description: "Add stocks for analysis",
    icon: <Search className="size-4" />,
  },
  {
    id: "theme",
    label: "Theme",
    description: "Define an investment thesis",
    icon: <Layers className="size-4" />,
  },
  {
    id: "expert",
    label: "Expert",
    description: "Get a specific perspective",
    icon: <User className="size-4" />,
  },
  {
    id: "index",
    label: "Index",
    description: "Reference a marketplace index",
    icon: <BarChart3 className="size-4" />,
  },
  {
    id: "deep-research",
    label: "Deep Research",
    description: "Run comprehensive analysis",
    icon: <Microscope className="size-4" />,
  },
];

// =============================================================================
// MOCK DATA
// =============================================================================

const THEME_SUGGESTIONS = [
  "AI Infrastructure",
  "Clean Energy Transition",
  "Cybersecurity Leaders",
  "Digital Payments",
  "Semiconductor Supply Chain",
];

const MOCK_TICKERS: TickerAttachment[] = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "TSLA", name: "Tesla, Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "GOOGL", name: "Alphabet Inc." },
];

const MOCK_EXPERTS: ExpertAttachment[] = [
  {
    name: "Warren Buffett",
    topic: "Value Investing",
    topics: ["Value Investing", "Capital Allocation", "Insurance"],
    quote: "Price is what you pay. Value is what you get.",
    bio: "Chairman and CEO of Berkshire Hathaway. Widely considered the most successful investor of the 20th century.",
    expertView: "Long-term compounders with durable moats",
    authorityScore: 98.5,
    influenceScore: 99.2,
    overallScore: 98.9,
    authorityRank: 1,
    influenceRank: 1,
    overallRank: 1,
  },
  {
    name: "Charlie Munger",
    topic: "Value Investing",
    topics: ["Value Investing", "Mental Models", "Psychology"],
    quote:
      "The big money is not in the buying and selling, but in the waiting.",
    bio: "Vice Chairman of Berkshire Hathaway. Known for his multidisciplinary approach to investing.",
    expertView: "Multidisciplinary thinking and patience",
    authorityScore: 94.2,
    influenceScore: 87.5,
    overallScore: 91.3,
    authorityRank: 3,
    influenceRank: 8,
    overallRank: 4,
  },
  {
    name: "Seth Klarman",
    topic: "Value Investing",
    topics: ["Value Investing", "Risk Management", "Contrarian Investing"],
    quote:
      "Value investing is at its core the marriage of a contrarian streak and a calculator.",
    bio: "Founder of Baupost Group. Author of 'Margin of Safety', a cult classic in value investing.",
    expertView: "Margin of safety and contrarian bets",
    authorityScore: 89.7,
    influenceScore: 72.3,
    overallScore: 82.1,
    authorityRank: 7,
    influenceRank: 15,
    overallRank: 9,
  },
  {
    name: "Cathie Wood",
    topic: "Disruptive Innovation",
    topics: ["Disruptive Innovation", "Growth Investing", "Technology"],
    quote: "Innovation solves problems. Big problems mean big opportunities.",
    bio: "Founder and CEO of ARK Invest. Pioneer in thematic ETF investing focused on disruptive innovation.",
    expertView: "Exponential tech and innovation platforms",
    authorityScore: 76.4,
    influenceScore: 91.8,
    overallScore: 83.2,
    authorityRank: 12,
    influenceRank: 4,
    overallRank: 8,
  },
  {
    name: "Peter Thiel",
    topic: "Disruptive Innovation",
    topics: ["Disruptive Innovation", "Venture Capital", "Technology"],
    quote: "Competition is for losers. Build a monopoly.",
    bio: "Co-founder of PayPal and Palantir. Founding investor in Facebook and numerous tech startups.",
    expertView: "Zero-to-one monopoly builders",
    authorityScore: 82.1,
    influenceScore: 88.9,
    overallScore: 85.2,
    authorityRank: 9,
    influenceRank: 6,
    overallRank: 7,
  },
  {
    name: "Ray Dalio",
    topic: "Macro Economics",
    topics: ["Macro Economics", "Risk Parity", "Economic Cycles"],
    quote: "He who lives by the crystal ball will eat shattered glass.",
    bio: "Founder of Bridgewater Associates, the world's largest hedge fund. Creator of the 'All Weather' portfolio.",
    expertView: "Economic cycles and risk parity allocation",
    authorityScore: 95.8,
    influenceScore: 94.1,
    overallScore: 95.0,
    authorityRank: 2,
    influenceRank: 2,
    overallRank: 2,
  },
  {
    name: "Howard Marks",
    topic: "Macro Economics",
    topics: ["Macro Economics", "Credit Markets", "Risk Assessment"],
    quote: "You can't predict. You can prepare.",
    bio: "Co-founder of Oaktree Capital. Known for his insightful memos on market cycles and risk.",
    expertView: "Second-level thinking and market cycles",
    authorityScore: 91.3,
    influenceScore: 82.7,
    overallScore: 87.4,
    authorityRank: 5,
    influenceRank: 9,
    overallRank: 6,
  },
  {
    name: "Philip Fisher",
    topic: "Growth Investing",
    topics: ["Growth Investing", "Qualitative Analysis", "Long-term Investing"],
    quote:
      "The stock market is filled with individuals who know the price of everything, but the value of nothing.",
    bio: "Pioneer of growth investing. Author of 'Common Stocks and Uncommon Profits'.",
    expertView: "Scuttlebutt research and quality growth",
    authorityScore: 92.6,
    influenceScore: 78.4,
    overallScore: 86.1,
    authorityRank: 4,
    influenceRank: 12,
    overallRank: 5,
  },
  {
    name: "Peter Lynch",
    topic: "Growth Investing",
    topics: ["Growth Investing", "Retail Investing", "Stock Picking"],
    quote: "Know what you own, and know why you own it.",
    bio: "Former manager of the Magellan Fund at Fidelity. Achieved 29% average annual returns over 13 years.",
    expertView: "Everyday observations and tenbaggers",
    authorityScore: 90.1,
    influenceScore: 93.2,
    overallScore: 91.5,
    authorityRank: 6,
    influenceRank: 3,
    overallRank: 3,
  },
];

const EXPERT_TOPICS = [...new Set(MOCK_EXPERTS.map((e) => e.topic))];

const CURRENT_USER_ORG = "Acme Capital";

const MOCK_INDICES: Omit<IndexAttachment, "error">[] = [
  {
    name: "AI Infrastructure Leaders",
    publisher: "Tilt",
    category: "thematic",
    isUserCreated: true,
    description:
      "Companies building the foundational infrastructure for artificial intelligence, including cloud providers, chip manufacturers, and data center operators.",
    ytdPerformance: 34.2,
    sectorComposition: [
      { sector: "Technology", weight: 65 },
      { sector: "Industrials", weight: 20 },
      { sector: "Utilities", weight: 15 },
    ],
    inceptionDate: "2024-03-15",
    creator: CURRENT_USER_ORG,
  },
  {
    name: "Electric Vehicle Ecosystem",
    publisher: "Tilt",
    category: "thematic",
    isUserCreated: true,
    description:
      "Full EV value chain including manufacturers, battery producers, charging infrastructure, and raw material suppliers.",
    ytdPerformance: 12.8,
    sectorComposition: [
      { sector: "Consumer Discretionary", weight: 45 },
      { sector: "Materials", weight: 30 },
      { sector: "Industrials", weight: 25 },
    ],
    inceptionDate: "2023-11-01",
    creator: CURRENT_USER_ORG,
  },
  {
    name: "Fintech Innovators",
    publisher: "Tilt",
    category: "thematic",
    isUserCreated: true,
    description:
      "Disruptive financial technology companies transforming payments, lending, and banking infrastructure.",
    ytdPerformance: 18.5,
    sectorComposition: [
      { sector: "Financials", weight: 55 },
      { sector: "Technology", weight: 40 },
      { sector: "Other", weight: 5 },
    ],
    inceptionDate: "2024-01-20",
    creator: CURRENT_USER_ORG,
  },
  {
    name: "Global Tech Giants",
    publisher: "Tilt",
    category: "thematic",
    isUserCreated: true,
    description:
      "The world's largest technology companies by market capitalization with dominant market positions.",
    ytdPerformance: 28.7,
    sectorComposition: [
      { sector: "Technology", weight: 80 },
      { sector: "Communication Services", weight: 15 },
      { sector: "Consumer Discretionary", weight: 5 },
    ],
    inceptionDate: "2023-06-10",
    creator: CURRENT_USER_ORG,
  },
  {
    name: "Metaverse Index",
    publisher: "Roundhill",
    category: "thematic",
    description:
      "Companies building the metaverse including VR/AR hardware, gaming platforms, and virtual world infrastructure.",
    ytdPerformance: 22.1,
    sectorComposition: [
      { sector: "Technology", weight: 50 },
      { sector: "Communication Services", weight: 35 },
      { sector: "Consumer Discretionary", weight: 15 },
    ],
    externalUrl: "https://roundhill.com/metaverse",
    inceptionDate: "2021-06-30",
    creator: "Roundhill Investments",
  },
  {
    name: "Cybersecurity Leaders",
    publisher: "First Trust",
    category: "thematic",
    description:
      "Leading cybersecurity companies protecting enterprise and consumer digital assets.",
    ytdPerformance: 15.3,
    sectorComposition: [
      { sector: "Technology", weight: 95 },
      { sector: "Other", weight: 5 },
    ],
    externalUrl: "https://firsttrust.com/cyber",
    inceptionDate: "2015-07-07",
    creator: "First Trust Advisors",
  },
  {
    name: "Robotics & Automation",
    publisher: "ROBO Global",
    category: "thematic",
    description:
      "Robotics, automation, and artificial intelligence companies transforming manufacturing and services.",
    ytdPerformance: 19.8,
    sectorComposition: [
      { sector: "Industrials", weight: 45 },
      { sector: "Technology", weight: 40 },
      { sector: "Healthcare", weight: 15 },
    ],
    externalUrl: "https://roboglobal.com",
    inceptionDate: "2013-10-22",
    creator: "ROBO Global LLC",
  },
  {
    name: "Semiconductor Index",
    publisher: "VanEck",
    category: "sector",
    description:
      "Companies involved in semiconductor production, equipment, and design.",
    ytdPerformance: 41.2,
    sectorComposition: [{ sector: "Technology", weight: 100 }],
    externalUrl: "https://vaneck.com/smh",
    inceptionDate: "2011-12-20",
    creator: "VanEck Associates",
  },
  {
    name: "Cloud Computing Index",
    publisher: "WisdomTree",
    category: "sector",
    description:
      "Pure-play cloud computing companies providing infrastructure, platforms, and software as a service.",
    ytdPerformance: 25.6,
    sectorComposition: [
      { sector: "Technology", weight: 90 },
      { sector: "Communication Services", weight: 10 },
    ],
    externalUrl: "https://wisdomtree.com/cloud",
    inceptionDate: "2019-09-06",
    creator: "WisdomTree Asset Management",
  },
  {
    name: "Biotech Breakthrough",
    publisher: "iShares",
    category: "sector",
    description:
      "Biotechnology companies focused on drug discovery, genomics, and medical innovation.",
    ytdPerformance: 8.4,
    sectorComposition: [{ sector: "Healthcare", weight: 100 }],
    externalUrl: "https://ishares.com/biotech",
    inceptionDate: "2001-02-05",
    creator: "BlackRock",
  },
  {
    name: "5G Infrastructure",
    publisher: "Defiance",
    category: "sector",
    description:
      "Companies building and deploying 5G wireless infrastructure and related technologies.",
    ytdPerformance: 11.2,
    sectorComposition: [
      { sector: "Technology", weight: 55 },
      { sector: "Communication Services", weight: 45 },
    ],
    externalUrl: "https://defiance.com/5g",
    inceptionDate: "2019-03-04",
    creator: "Defiance ETFs",
  },
  {
    name: "Dividend Aristocrats",
    publisher: "State Street",
    category: "strategy",
    description:
      "S&P 500 companies that have increased dividends for 25+ consecutive years.",
    ytdPerformance: 9.7,
    sectorComposition: [
      { sector: "Industrials", weight: 25 },
      { sector: "Consumer Staples", weight: 20 },
      { sector: "Materials", weight: 15 },
      { sector: "Financials", weight: 15 },
      { sector: "Healthcare", weight: 15 },
      { sector: "Other", weight: 10 },
    ],
    externalUrl: "https://ssga.com/nobl",
    inceptionDate: "2013-10-09",
    creator: "State Street Global Advisors",
  },
  {
    name: "Quality Factor",
    publisher: "iShares",
    category: "strategy",
    description:
      "Companies with strong profitability, stable earnings, and low debt levels.",
    ytdPerformance: 16.3,
    sectorComposition: [
      { sector: "Technology", weight: 35 },
      { sector: "Healthcare", weight: 20 },
      { sector: "Financials", weight: 15 },
      { sector: "Consumer Staples", weight: 15 },
      { sector: "Other", weight: 15 },
    ],
    externalUrl: "https://ishares.com/qual",
    inceptionDate: "2013-07-16",
    creator: "BlackRock",
  },
  {
    name: "Momentum Leaders",
    publisher: "Invesco",
    category: "strategy",
    description:
      "Stocks exhibiting strong recent price momentum and relative strength.",
    ytdPerformance: 31.4,
    sectorComposition: [
      { sector: "Technology", weight: 45 },
      { sector: "Consumer Discretionary", weight: 20 },
      { sector: "Industrials", weight: 15 },
      { sector: "Other", weight: 20 },
    ],
    externalUrl: "https://invesco.com/mtum",
    inceptionDate: "2013-04-16",
    creator: "Invesco Ltd",
  },
  {
    name: "Emerging Markets Growth",
    publisher: "Vanguard",
    category: "geographic",
    description:
      "Large and mid-cap equities from emerging market countries with growth characteristics.",
    ytdPerformance: 7.2,
    sectorComposition: [
      { sector: "Technology", weight: 30 },
      { sector: "Financials", weight: 25 },
      { sector: "Consumer Discretionary", weight: 20 },
      { sector: "Other", weight: 25 },
    ],
    externalUrl: "https://vanguard.com/vwo",
    inceptionDate: "2005-03-04",
    creator: "Vanguard Group",
  },
  {
    name: "Europe Leaders",
    publisher: "iShares",
    category: "geographic",
    description:
      "Large-cap European equities from developed markets across the continent.",
    ytdPerformance: 12.1,
    sectorComposition: [
      { sector: "Financials", weight: 20 },
      { sector: "Healthcare", weight: 18 },
      { sector: "Industrials", weight: 17 },
      { sector: "Consumer Staples", weight: 15 },
      { sector: "Other", weight: 30 },
    ],
    externalUrl: "https://ishares.com/ieur",
    inceptionDate: "2014-06-10",
    creator: "BlackRock",
  },
  {
    name: "Japan Innovation",
    publisher: "WisdomTree",
    category: "geographic",
    description:
      "Japanese companies at the forefront of technology and innovation.",
    ytdPerformance: 14.8,
    sectorComposition: [
      { sector: "Technology", weight: 35 },
      { sector: "Industrials", weight: 25 },
      { sector: "Consumer Discretionary", weight: 20 },
      { sector: "Other", weight: 20 },
    ],
    externalUrl: "https://wisdomtree.com/dxj",
    inceptionDate: "2006-06-16",
    creator: "WisdomTree Asset Management",
  },
];

// =============================================================================
// UTILITIES
// =============================================================================

function getTickerColor(symbol: string) {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
  ];
  const index = symbol.charCodeAt(0) % colors.length;
  return colors[index];
}

// Simple dotted divider replacing tilt's Divider component
function DottedDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex items-center justify-center py-1", className)}
    >
      <div className="h-px w-full border-t border-dotted border-muted-foreground/50" />
    </div>
  );
}

// =============================================================================
// SHARED SHELL COMPONENT
// =============================================================================

function PreparingShell({
  title,
  icon,
  onClose,
  onDone,
  hideActions = false,
  doneDisabled = false,
  customActions,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  onDone?: () => void;
  hideActions?: boolean;
  doneDisabled?: boolean;
  customActions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const showActionBar = !hideActions && (onDone || customActions);

  return (
    <div className="rounded-xl border border-border bg-card p-2">
      <div className="flex flex-col rounded-lg border border-border bg-background">
        {/* Title bar */}
        <div className="flex items-center justify-between border-border border-b px-3 py-2">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            {icon}
            <span className="font-mono text-xs uppercase tracking-wider">
              {title}
            </span>
          </div>
          <button
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content area */}
        <div className="p-3">{children}</div>

        {/* Action bar */}
        {showActionBar && (
          <div className="flex items-center justify-between px-3 pb-3">
            {customActions || (
              <>
                <div />
                <Button
                  className="disabled:cursor-not-allowed disabled:opacity-25"
                  disabled={doneDisabled}
                  onClick={onDone}
                  size="sm"
                  variant="secondary"
                >
                  Ready
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          className="flex animate-pulse items-center gap-3 px-2.5 py-2"
          key={i}
        >
          <div className="size-5 rounded bg-muted" />
          <div className="h-4 flex-1 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// PREPARING MODE COMPONENTS
// =============================================================================

function TickerPreparing({
  selected,
  onSelect,
  onClose,
  simulateLoading,
  loadingDelayMs = 0,
}: {
  selected: TickerAttachment[];
  onSelect: (ticker: TickerAttachment) => void;
  onClose: () => void;
  simulateLoading?: boolean;
  loadingDelayMs?: number;
}) {
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedSymbols = new Set(selected.map((t) => t.symbol));
  const filtered = MOCK_TICKERS.filter(
    (t) =>
      !selectedSymbols.has(t.symbol) &&
      (t.symbol.toLowerCase().includes(search.toLowerCase()) ||
        t.name.toLowerCase().includes(search.toLowerCase()))
  );

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (simulateLoading && search) {
      setIsLoading(true);
      const timer = setTimeout(
        () => setIsLoading(false),
        loadingDelayMs || 800
      );
      return () => clearTimeout(timer);
    }
    setIsLoading(false);
  }, [search, simulateLoading, loadingDelayMs]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filtered.length]);

  const handleSelect = (ticker: TickerAttachment) => {
    onSelect(ticker);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filtered.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filtered.length - 1
      );
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      const ticker = filtered[highlightedIndex];
      if (ticker) handleSelect(ticker);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <PreparingShell
      icon={<Search className="size-4" />}
      onClose={onClose}
      title="Add Tickers"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded border border-border bg-card px-2 py-1.5">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tickers..."
            ref={inputRef}
            type="text"
            value={search}
          />
        </div>

        <div className="max-h-48 divide-y divide-border overflow-y-auto rounded border border-border">
          {isLoading ? (
            <LoadingSkeleton rows={3} />
          ) : search && filtered.length === 0 ? (
            <div className="p-3 text-center text-muted-foreground text-sm">
              No results found
            </div>
          ) : (
            filtered.map((ticker, index) => (
              <button
                className={cn(
                  "flex w-full items-center gap-2 px-2.5 py-2 text-left",
                  highlightedIndex === index ? "bg-muted" : "hover:bg-muted/50"
                )}
                key={ticker.symbol}
                onClick={() => handleSelect(ticker)}
              >
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded font-medium text-white text-xs",
                    getTickerColor(ticker.symbol)
                  )}
                >
                  {ticker.symbol[0]}
                </span>
                <span className="font-mono text-muted-foreground text-xs">
                  {ticker.symbol}
                </span>
                <span className="flex-1 truncate text-sm">{ticker.name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </PreparingShell>
  );
}

function ThemePreparing({
  onClose,
  onDone,
  onRemove,
  editingTheme,
}: {
  onClose: () => void;
  onDone: (theme: ThemeAttachment) => void;
  onRemove?: () => void;
  editingTheme?: ThemeAttachment;
}) {
  const isEditing = !!editingTheme;
  type Step = "define" | "select" | "manual" | "edit";

  const getInitialStep = (): Step => {
    if (!editingTheme) return "define";
    return "edit";
  };

  const [step, setStep] = useState<Step>(getInitialStep);
  const [themeName, setThemeName] = useState(
    editingTheme?.generatedData?.sketchName || ""
  );
  const [sketchBatch, setSketchBatch] = useState(0);
  const [sketchesLoading, setSketchesLoading] = useState(false);
  const [selectedSketchId, setSelectedSketchId] = useState<string | null>(
    editingTheme?.generatedData?.sketchId || null
  );
  const [selectedSubThemes, setSelectedSubThemes] = useState<Set<string>>(
    () => {
      if (editingTheme?.generatedData) {
        return new Set(
          editingTheme.generatedData.selectedSubThemes.map(
            (st) => `${editingTheme.generatedData!.sketchId}:${st}`
          )
        );
      }
      return new Set();
    }
  );

  const getInitialManualSubThemes = (): Array<{
    id: string;
    title: string;
    thesis: string;
  }> => {
    if (editingTheme?.manualData?.subThemes) {
      return editingTheme.manualData.subThemes;
    }
    if (editingTheme?.generatedData?.selectedSubThemes) {
      return editingTheme.generatedData.selectedSubThemes.map((st, i) => ({
        id: `gen-${i}`,
        title: st,
        thesis: "",
      }));
    }
    return [];
  };

  const [manualTitle, setManualTitle] = useState(
    editingTheme?.manualData?.title ||
      editingTheme?.generatedData?.sketchName ||
      editingTheme?.name ||
      ""
  );
  const [manualThesis, setManualThesis] = useState(
    editingTheme?.manualData?.thesis ||
      editingTheme?.generatedData?.sketchDescription ||
      ""
  );
  const [manualSubThemes, setManualSubThemes] = useState<
    Array<{ id: string; title: string; thesis: string }>
  >(getInitialManualSubThemes);
  const [editingSubThemeId, setEditingSubThemeId] = useState<string | null>(
    null
  );

  const addManualSubTheme = () => {
    const newId = `sub-${Date.now()}`;
    setManualSubThemes((prev) => [
      ...prev,
      { id: newId, title: "", thesis: "" },
    ]);
    setEditingSubThemeId(newId);
  };

  const updateManualSubTheme = (
    id: string,
    field: "title" | "thesis",
    value: string
  ) => {
    setManualSubThemes((prev) =>
      prev.map((st) => (st.id === id ? { ...st, [field]: value } : st))
    );
  };

  const removeManualSubTheme = (id: string) => {
    setManualSubThemes((prev) => prev.filter((st) => st.id !== id));
    if (editingSubThemeId === id) setEditingSubThemeId(null);
  };

  const isManualValid = manualTitle.trim() && manualThesis.trim();

  const allSketches = [
    {
      id: "cloud",
      name: "Cloud Infrastructure",
      description: "Hyperscale providers and enterprise cloud platforms",
      subThemes: [
        "Hyperscaler Dominance",
        "Enterprise Cloud Migration",
        "Hybrid Cloud Adopters",
      ],
    },
    {
      id: "chips",
      name: "AI Semiconductors",
      description: "Companies designing and manufacturing AI training hardware",
      subThemes: [
        "GPU Market Leaders",
        "AI Accelerator Startups",
        "Memory Bandwidth Play",
      ],
    },
    {
      id: "data",
      name: "Data Center REITs",
      description: "Real estate and infrastructure for compute capacity",
      subThemes: [
        "Hyperscale Landlords",
        "Edge Facility Operators",
        "Colocation Consolidators",
      ],
    },
    {
      id: "network",
      name: "AI Networking",
      description: "High-bandwidth connectivity for distributed training",
      subThemes: [
        "Optical Interconnects",
        "Network Switch Makers",
        "Fiber Capacity Owners",
      ],
    },
    {
      id: "energy",
      name: "Power Infrastructure",
      description: "Energy solutions for AI compute demand growth",
      subThemes: [
        "Grid Modernization",
        "Nuclear Renaissance",
        "Cooling Innovation",
      ],
    },
  ];

  const visibleSketches = allSketches.slice(
    sketchBatch * 3,
    sketchBatch * 3 + 3
  );
  const hasMoreBatches = (sketchBatch + 1) * 3 < allSketches.length;

  const startSketchLoading = (nextBatch?: number) => {
    setSketchesLoading(true);
    if (nextBatch !== undefined) {
      setSketchBatch(nextBatch);
    }
    setTimeout(() => setSketchesLoading(false), 1500);
  };

  const regenerateSketches = () => {
    setSelectedSketchId(null);
    setSelectedSubThemes(new Set());
    const nextBatch = hasMoreBatches ? sketchBatch + 1 : 0;
    startSketchLoading(nextBatch);
  };

  const toggleSubTheme = (sketchId: string, subTheme: string) => {
    const key = `${sketchId}:${subTheme}`;
    setSelectedSubThemes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleSketchCard = (sketchId: string, subThemes: string[]) => {
    if (selectedSketchId === sketchId) {
      setSelectedSketchId(null);
      setSelectedSubThemes(new Set());
    } else {
      setSelectedSketchId(sketchId);
      const limitedSubThemes = subThemes.slice(0, 3);
      const keys = limitedSubThemes.map((s) => `${sketchId}:${s}`);
      setSelectedSubThemes(new Set(keys));
    }
  };

  const totalSelectedSubThemes = selectedSubThemes.size;

  const goBack = () => setStep("define");

  const stepTitles: Record<Step, string> = {
    define: "Define Theme",
    select: "Select Sketch",
    manual: "Create Theme",
    edit: "Edit Theme",
  };

  const stepNumber = step === "define" ? 1 : step === "select" ? 2 : null;

  const buildManualTheme = (): ThemeAttachment => ({
    name: manualTitle,
    subThemeCount: manualSubThemes.length,
    source: "manual",
    manualData: {
      title: manualTitle,
      thesis: manualThesis,
      subThemes: manualSubThemes,
    },
  });

  const buildGeneratedTheme = (): ThemeAttachment => {
    const sketch = allSketches.find((s) => s.id === selectedSketchId);
    const subThemeNames = [...selectedSubThemes]
      .filter((k) => k.startsWith(`${selectedSketchId}:`))
      .map((k) => k.split(":")[1]);
    return {
      name: sketch?.name || themeName || "AI Infrastructure",
      subThemeCount: totalSelectedSubThemes || 3,
      source: "generated",
      generatedData: {
        sketchId: selectedSketchId || "",
        sketchName: sketch?.name || "",
        sketchDescription: sketch?.description || "",
        selectedSubThemes: subThemeNames,
      },
    };
  };

  // Shared manual/edit form
  const ManualEditForm = () => (
    <div>
      <div className="divide-y divide-border">
        <input
          className="w-full rounded-t border-x border-t border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          onChange={(e) => setManualTitle(e.target.value)}
          placeholder="Theme title*"
          type="text"
          value={manualTitle}
        />
        <textarea
          className="w-full resize-none rounded-b border-x border-b border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          onChange={(e) => setManualThesis(e.target.value)}
          placeholder="Investment thesis*"
          rows={3}
          value={manualThesis}
        />
      </div>
      <div className="pt-2">
        <div className="mb-1 flex items-center justify-between px-1">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Sub-themes{" "}
            <Badge variant="outline">
              {manualSubThemes.length}
            </Badge>
          </span>
        </div>

        {manualSubThemes.map((subTheme) => (
          <div className="relative rounded" key={subTheme.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 divide-y divide-border">
                <input
                  className="w-full rounded-t border-x border-t border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  onChange={(e) =>
                    updateManualSubTheme(
                      subTheme.id,
                      "title",
                      e.target.value
                    )
                  }
                  placeholder="What is the title of this sub-theme?"
                  type="text"
                  value={subTheme.title}
                />
                <textarea
                  className="w-full resize-none rounded-b border-x border-b border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  onChange={(e) =>
                    updateManualSubTheme(
                      subTheme.id,
                      "thesis",
                      e.target.value
                    )
                  }
                  placeholder="What is the thesis for this sub-theme?"
                  rows={2}
                  value={subTheme.thesis}
                />
              </div>
              <button
                className="absolute top-px right-0 px-3 py-1 text-muted-foreground hover:text-primary"
                onClick={() => removeManualSubTheme(subTheme.id)}
              >
                <span className="font-mono text-xs">Remove</span>
              </button>
            </div>
          </div>
        ))}

        <div className="px-1">
          {manualSubThemes.length === 0 && (
            <DottedDivider className="my-2" />
          )}

          <button
            className="flex items-center gap-1.5 text-muted-foreground text-sm hover:text-primary"
            onClick={addManualSubTheme}
          >
            <Plus className="size-3" />
            Add sub-theme
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <PreparingShell
      customActions={
        <>
          {stepNumber !== null && (
            <span className="px-1 text-muted-foreground text-sm">
              Step {stepNumber} of 2
            </span>
          )}
          {step === "define" && (
            <div className="flex items-center gap-2">
              <Button
                className="bg-transparent text-muted-foreground hover:text-primary"
                onClick={() => setStep("manual")}
                size="sm"
                variant="secondary"
              >
                <Pencil className="size-3" />
                Create Manually
              </Button>
              <Button
                className="disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!themeName.trim()}
                onClick={() => {
                  startSketchLoading();
                  setStep("select");
                }}
                size="sm"
                variant="secondary"
              >
                Generate Sketches
              </Button>
            </div>
          )}
          {step === "select" && (
            <Button
              className="disabled:cursor-not-allowed disabled:opacity-50"
              disabled={selectedSketchId === null}
              onClick={() => onDone(buildGeneratedTheme())}
              size="sm"
              variant="secondary"
            >
              Select
            </Button>
          )}
          {step === "manual" && (
            <Button
              className="disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!isManualValid}
              onClick={() => onDone(buildManualTheme())}
              size="sm"
              variant="secondary"
            >
              Done
            </Button>
          )}
          {step === "edit" && (
            <div className="flex flex-1 items-center justify-end gap-2">
              {onRemove && (
                <Button
                  className="bg-transparent text-muted-foreground hover:text-primary"
                  onClick={onRemove}
                  size="sm"
                  variant="secondary"
                >
                  Remove
                </Button>
              )}
              <Button
                className="disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!isManualValid}
                onClick={() => onDone(buildManualTheme())}
                size="sm"
                variant="secondary"
              >
                Update
              </Button>
            </div>
          )}
        </>
      }
      icon={
        step === "select" || step === "manual" ? (
          <button
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
            onClick={goBack}
          >
            <ArrowLeft className="size-4" />
          </button>
        ) : (
          <Layers className="size-4" />
        )
      }
      onClose={onClose}
      title={stepTitles[step]}
    >
      <div className="space-y-3">
        {step === "define" && (
          <>
            <input
              className="w-full rounded border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              onChange={(e) => setThemeName(e.target.value)}
              placeholder="What theme would you like to sketch?"
              type="text"
              value={themeName}
            />
            <div className="space-y-1.5">
              <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1">
                {THEME_SUGGESTIONS.map((suggestion) => (
                  <button
                    className="shrink-0 rounded-full border border-border bg-muted px-2.5 py-1 text-muted-foreground text-sm transition-colors hover:bg-secondary hover:text-foreground"
                    key={suggestion}
                    onClick={() => {
                      setThemeName(suggestion);
                      startSketchLoading();
                      setStep("select");
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        {step === "select" && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                Which theme sketch is the best fit?
              </p>
              <button
                className="flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground disabled:text-muted-foreground/50"
                disabled={sketchesLoading}
                onClick={regenerateSketches}
              >
                <RefreshCw className={cn("size-4", sketchesLoading && "animate-spin")} />
                Re-generate
              </button>
            </div>
            <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
              {sketchesLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div
                      className="flex min-h-48 w-72 shrink-0 animate-pulse flex-col justify-between space-y-4 rounded-lg border border-border bg-card p-4"
                      key={i}
                    >
                      <div className="space-y-2">
                        <div className="h-5 w-3/4 rounded bg-muted" />
                        <div className="h-4 w-full rounded bg-muted" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="h-5 w-4/5 rounded bg-muted" />
                        <div className="h-5 w-3/5 rounded bg-muted" />
                        <div className="h-5 w-2/3 rounded bg-muted" />
                      </div>
                    </div>
                  ))
                : visibleSketches.map((sketch) => {
                    const isCardSelected = selectedSketchId === sketch.id;

                    return (
                      <button
                        className={cn(
                          "flex min-h-48 max-w-72 shrink-0 flex-col justify-between space-y-2 rounded-lg border px-3 pt-3 pb-3 text-left transition-colors",
                          isCardSelected
                            ? "border-primary"
                            : "border-border bg-card hover:border-primary/30 hover:bg-primary/5"
                        )}
                        key={sketch.id}
                        onClick={() =>
                          toggleSketchCard(sketch.id, sketch.subThemes)
                        }
                      >
                        <div className="mb-1 flex items-start justify-between gap-6 px-1">
                          <div className="flex-1">
                            <span className="font-bold text-sm">
                              {sketch.name}
                            </span>
                            <p className="text-muted-foreground text-sm">
                              {sketch.description}
                            </p>
                          </div>
                          <div className={cn("flex flex-col", isCardSelected ? "opacity-100" : "opacity-0")}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className="flex size-6 p-1 text-muted-foreground hover:text-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startSketchLoading();
                                  }}
                                >
                                  <Plus className="size-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-48 p-3">
                                <span className="font-medium">
                                  Increase consensus
                                </span>
                                <p className="text-muted-foreground">
                                  Regenerate with more widely-held views
                                </p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className="flex size-6 p-1 text-muted-foreground hover:text-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startSketchLoading();
                                  }}
                                >
                                  <Minus className="size-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-48 p-3">
                                <span className="font-medium">
                                  Decrease consensus
                                </span>
                                <p className="text-muted-foreground">
                                  Regenerate with more contrarian views
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                        <DottedDivider className="px-1" />
                        <ul
                          className={cn(
                            isCardSelected
                              ? "list-none"
                              : "list-inside list-disc"
                          )}
                        >
                          {sketch.subThemes.slice(0, 3).map((subTheme) => {
                            const isSelected = selectedSubThemes.has(
                              `${sketch.id}:${subTheme}`
                            );
                            return (
                              <li
                                className={cn(
                                  "flex items-center gap-2 rounded px-1.5 py-1 text-left text-sm transition-colors",
                                  isCardSelected
                                    ? isSelected
                                      ? "cursor-pointer text-foreground"
                                      : "cursor-pointer text-muted-foreground line-through hover:text-foreground hover:no-underline"
                                    : "text-muted-foreground"
                                )}
                                key={subTheme}
                                onClick={(e) => {
                                  if (isCardSelected) {
                                    e.stopPropagation();
                                    toggleSubTheme(sketch.id, subTheme);
                                  }
                                }}
                              >
                                {isSelected && (
                                  <Check className="size-3.5" />
                                )}
                                {subTheme}
                              </li>
                            );
                          })}
                        </ul>
                      </button>
                    );
                  })}
            </div>
          </>
        )}
        {(step === "manual" || step === "edit") && <ManualEditForm />}
      </div>
    </PreparingShell>
  );
}

function ExpertPreparing({
  selected,
  onSelect,
  onClose,
}: {
  selected: ExpertAttachment[];
  onSelect: (expert: ExpertAttachment) => void;
  onClose: () => void;
}) {
  type View = "browse" | "topic-detail" | "expert-detail";
  const [view, setView] = useState<View>("browse");
  const [search, setSearch] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [previewExpert, setPreviewExpert] = useState<ExpertAttachment | null>(
    null
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (view === "browse" || view === "topic-detail") {
      const timer = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
  }, [view]);

  const selectedNames = new Set(selected.map((s) => s.name));
  const query = search.toLowerCase();

  const availableExperts = MOCK_EXPERTS.filter(
    (e) => !selectedNames.has(e.name)
  );

  const getExpertsForTopic = (topic: string) =>
    availableExperts.filter((e) => e.topics.includes(topic));

  const searchResults = query
    ? {
        topics: EXPERT_TOPICS.filter((t) => t.toLowerCase().includes(query)),
        experts: availableExperts.filter(
          (e) =>
            e.name.toLowerCase().includes(query) ||
            e.topics.some((t) => t.toLowerCase().includes(query))
        ),
      }
    : null;

  const goToTopic = (topic: string) => {
    setSelectedTopic(topic);
    setSearch("");
    setView("topic-detail");
  };

  const goToBrowse = () => {
    setSelectedTopic(null);
    setSearch("");
    setView("browse");
  };

  const goToExpert = (expert: ExpertAttachment) => {
    setPreviewExpert(expert);
    setView("expert-detail");
  };

  const handleSelectExpert = (expert: ExpertAttachment) => {
    onSelect(expert);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (view === "topic-detail") {
        goToBrowse();
      } else if (search) {
        setSearch("");
      } else {
        onClose();
      }
    }
  };

  const AuthorityPill = ({ score }: { score: number }) => (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 font-medium text-[10px]",
        score >= 90
          ? "bg-green-500/20 text-green-600"
          : score >= 75
            ? "bg-blue-500/20 text-blue-600"
            : "bg-muted text-muted-foreground"
      )}
    >
      {score.toFixed(0)}
    </span>
  );

  const Breadcrumb = ({
    expertCount,
    isSearching,
    searchTopicCount,
    searchExpertCount,
  }: {
    expertCount?: number;
    isSearching?: boolean;
    searchTopicCount?: number;
    searchExpertCount?: number;
  }) => (
    <div className="flex items-center gap-1 pt-1 font-mono text-muted-foreground text-xs tracking-wider">
      {isSearching ? (
        <span>
          Returned {searchExpertCount ?? 0} expert
          {searchExpertCount === 1 ? "" : "s"} and {searchTopicCount ?? 0} topic
          {searchTopicCount === 1 ? "" : "s"}
        </span>
      ) : selectedTopic ? (
        <>
          <button
            className="flex items-center gap-1 hover:text-foreground"
            onClick={goToBrowse}
          >
            <ArrowLeft className="size-3" />
            <span>Topics</span>
          </button>
          <span>/</span>
          <span>{selectedTopic}</span>
          {expertCount !== undefined && (
            <span className="ml-1">({expertCount})</span>
          )}
        </>
      ) : (
        <span>Browse Topics</span>
      )}
    </div>
  );

  const ExpertRow = ({ expert }: { expert: ExpertAttachment }) => (
    <button
      className="flex w-full items-center gap-3 px-3 py-2.5 text-left last:border-b-0 hover:bg-muted/50"
      onClick={() => goToExpert(expert)}
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-muted">
        <User className="size-5 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{expert.name}</span>
          <AuthorityPill score={expert.authorityScore} />
        </div>
        <div className="text-muted-foreground text-xs">{expert.expertView}</div>
      </div>
    </button>
  );

  // VIEW: Expert Detail
  if (view === "expert-detail" && previewExpert) {
    return (
      <PreparingShell
        hideActions
        icon={
          <button
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => setView(selectedTopic ? "topic-detail" : "browse")}
          >
            <ArrowLeft className="size-4" />
          </button>
        }
        onClose={onClose}
        title="Back"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <User className="size-7 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg">
                  {previewExpert.name}
                </span>
                <a
                  className="text-muted-foreground hover:text-primary"
                  href={`/expert/${encodeURIComponent(previewExpert.name)}`}
                  rel="noopener noreferrer"
                  target="_blank"
                  title="View full profile"
                >
                  <ExternalLink className="size-4" />
                </a>
              </div>
              <div className="flex flex-col gap-1 border-t pt-2 text-muted-foreground text-sm">
                <span>{previewExpert.bio}</span>
                <span className="italic">&ldquo;{previewExpert.quote}&rdquo;</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border">
            <div className="space-y-2 p-3">
              <div className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Authority
              </div>
              <div className="flex items-baseline justify-between font-light font-mono text-xl tabular-nums">
                <span>#{previewExpert.authorityRank}</span>
                <span className="text-muted-foreground">
                  {previewExpert.authorityScore.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="space-y-2 p-3">
              <div className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Influence
              </div>
              <div className="flex items-baseline justify-between font-light font-mono text-xl tabular-nums">
                <span>#{previewExpert.influenceRank}</span>
                <span className="text-muted-foreground">
                  {previewExpert.influenceScore.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="space-y-2 p-3">
              <div className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Overall
              </div>
              <div className="flex items-baseline justify-between font-light font-mono text-xl tabular-nums">
                <span>#{previewExpert.overallRank}</span>
                <span className="text-muted-foreground">
                  {previewExpert.overallScore.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap gap-1.5">
              {previewExpert.topics.map((topic) => (
                <button
                  className="rounded-full border px-2.5 py-1 text-sm hover:bg-muted"
                  key={topic}
                  onClick={() => {
                    setSelectedTopic(topic);
                    setView("topic-detail");
                  }}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => handleSelectExpert(previewExpert)}
              variant="secondary"
            >
              Select Expert
            </Button>
          </div>
        </div>
      </PreparingShell>
    );
  }

  // Shared search input
  const SearchInput = () => (
    <div className="flex items-center gap-2 rounded border border-border bg-card px-2 py-1.5">
      <Search className="size-3.5 text-muted-foreground" />
      <input
        className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search experts and topics..."
        ref={inputRef}
        type="text"
        value={search}
      />
      {search && (
        <button
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setSearch("")}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );

  // Shared search results rendering
  const SearchResultsList = () => (
    <>
      {searchResults!.topics.length > 0 && (
        <div>
          <div className="bg-muted/50 px-3 py-1.5 font-medium text-muted-foreground text-xs uppercase">
            Topics
          </div>
          {searchResults!.topics.map((topic) => (
            <button
              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/50"
              key={topic}
              onClick={() => goToTopic(topic)}
            >
              <span className="text-sm">{topic}</span>
              <span className="text-muted-foreground text-xs">
                {getExpertsForTopic(topic).length}
              </span>
            </button>
          ))}
        </div>
      )}
      {searchResults!.experts.length > 0 && (
        <div>
          <div className="bg-muted/50 px-3 py-1.5 font-medium text-muted-foreground text-xs uppercase">
            Experts
          </div>
          {searchResults!.experts.map((expert) => (
            <ExpertRow expert={expert} key={expert.name} />
          ))}
        </div>
      )}
      {searchResults!.topics.length === 0 &&
        searchResults!.experts.length === 0 && (
          <div className="p-3 text-center text-muted-foreground text-sm">
            No results found
          </div>
        )}
    </>
  );

  // VIEW: Topic Detail
  if (view === "topic-detail" && selectedTopic) {
    const topicExperts = getExpertsForTopic(selectedTopic);

    return (
      <PreparingShell
        icon={<User className="size-4" />}
        onClose={onClose}
        title="Add Expert"
      >
        <div className="space-y-3">
          <SearchInput />
          <Breadcrumb
            expertCount={topicExperts.length}
            isSearching={!!searchResults}
            searchExpertCount={searchResults?.experts.length}
            searchTopicCount={searchResults?.topics.length}
          />
          <div className="max-h-64 divide-y divide-border overflow-y-auto rounded border border-border">
            {searchResults ? (
              <SearchResultsList />
            ) : topicExperts.length === 0 ? (
              <div className="p-3 text-center text-muted-foreground text-sm">
                No experts available
              </div>
            ) : (
              topicExperts.map((expert) => (
                <ExpertRow expert={expert} key={expert.name} />
              ))
            )}
          </div>
        </div>
      </PreparingShell>
    );
  }

  // VIEW: Browse (default)
  const topicsWithExperts = EXPERT_TOPICS.filter(
    (topic) => getExpertsForTopic(topic).length > 0
  );

  return (
    <PreparingShell
      icon={<User className="size-4" />}
      onClose={onClose}
      title="Add Expert"
    >
      <div className="space-y-3">
        <SearchInput />
        <Breadcrumb
          isSearching={!!searchResults}
          searchExpertCount={searchResults?.experts.length}
          searchTopicCount={searchResults?.topics.length}
        />
        <div className="max-h-72 divide-y divide-border overflow-y-auto rounded border border-border">
          {searchResults ? (
            <SearchResultsList />
          ) : topicsWithExperts.length === 0 ? (
            <div className="p-3 text-center text-muted-foreground text-sm">
              No topics available
            </div>
          ) : (
            topicsWithExperts.map((topic) => {
              const count = getExpertsForTopic(topic).length;
              return (
                <button
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left last:border-b-0 hover:bg-muted/50"
                  key={topic}
                  onClick={() => goToTopic(topic)}
                >
                  <span className="flex-1 font-medium text-sm">{topic}</span>
                  <span className="mr-2 text-muted-foreground text-xs">
                    {count}
                  </span>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </PreparingShell>
  );
}

// Filter presets for Index
type IndexFilter =
  | { id: string; label: string }
  | { id: string; label: string; isUserCreated: true }
  | {
      id: string;
      label: string;
      category: IndexAttachment["category"];
    };

const INDEX_FILTER_PRESETS: IndexFilter[] = [
  { id: "all", label: "All" },
  { id: "my-indices", label: "My Indices", isUserCreated: true },
  { id: "thematic", label: "Thematic", category: "thematic" },
  { id: "sector", label: "Sector", category: "sector" },
  { id: "strategy", label: "Strategy", category: "strategy" },
  { id: "geographic", label: "Geographic", category: "geographic" },
];

function IndexPreparing({
  selected,
  onSelect,
  onClose,
  simulateLoading,
  loadingDelayMs = 0,
}: {
  selected: IndexAttachment[];
  onSelect: (index: IndexAttachment) => void;
  onClose: () => void;
  simulateLoading?: boolean;
  loadingDelayMs?: number;
}) {
  type View = "list" | "detail";
  const [view, setView] = useState<View>("list");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<Omit<
    IndexAttachment,
    "error"
  > | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (view === "list") {
      const timer = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
  }, [view]);

  useEffect(() => {
    if (simulateLoading && (search || activeFilter !== "all")) {
      setIsLoading(true);
      const timer = setTimeout(
        () => setIsLoading(false),
        loadingDelayMs || 800
      );
      return () => clearTimeout(timer);
    }
    setIsLoading(false);
  }, [search, activeFilter, simulateLoading, loadingDelayMs]);

  const selectedNames = new Set(selected.map((i) => i.name));
  const query = search.toLowerCase();

  const filterPreset = INDEX_FILTER_PRESETS.find((f) => f.id === activeFilter);

  const filtered = MOCK_INDICES.filter((i) => {
    if (selectedNames.has(i.name)) return false;

    if (filterPreset && filterPreset.id !== "all") {
      if ("isUserCreated" in filterPreset) {
        if (!i.isUserCreated) return false;
      } else if ("category" in filterPreset) {
        if (i.category !== filterPreset.category) return false;
      }
    }

    if (query) {
      return (
        i.name.toLowerCase().includes(query) ||
        i.publisher.toLowerCase().includes(query) ||
        i.category.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const suggestions = filtered.slice(0, 10);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const goToDetail = (index: Omit<IndexAttachment, "error">) => {
    setPreviewIndex(index);
    setView("detail");
  };

  const goToList = () => {
    setPreviewIndex(null);
    setView("list");
  };

  const handleSelectIndex = (index: Omit<IndexAttachment, "error">) => {
    onSelect(index as IndexAttachment);
    onClose();
  };

  // VIEW: Index Detail
  if (view === "detail" && previewIndex) {
    return (
      <PreparingShell
        hideActions
        icon={
          <button
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
            onClick={goToList}
          >
            <ArrowLeft className="size-4" />
          </button>
        }
        onClose={onClose}
        title="Back"
      >
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xl">
                {previewIndex.name}{" "}
                <ExternalLink className="inline-flex size-4 text-muted-foreground hover:text-foreground" />
              </h3>
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-12 text-muted-foreground"
                  viewBox="0 0 48 16"
                >
                  <polyline
                    className={
                      previewIndex.ytdPerformance >= 0
                        ? "stroke-green-500"
                        : "stroke-red-500"
                    }
                    fill="none"
                    points="0,12 8,10 16,14 24,8 32,6 40,4 48,2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                </svg>
                <span
                  className={cn(
                    "font-mono text-xl tabular-nums",
                    previewIndex.ytdPerformance >= 0
                      ? "text-green-500"
                      : "text-red-500"
                  )}
                >
                  {previewIndex.ytdPerformance >= 0 ? "+" : ""}
                  {previewIndex.ytdPerformance.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              {previewIndex.description}
            </p>
            <div className="flex items-start justify-between gap-1 border-t pt-2">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <span>{previewIndex.publisher}</span>
                <span>|</span>
                <span className="capitalize">{previewIndex.category}</span>
                {previewIndex.externalUrl && (
                  <a
                    className="ml-auto text-muted-foreground hover:text-primary"
                    href={previewIndex.externalUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                    title={`View on ${previewIndex.publisher}`}
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <span>
                  {new Date(previewIndex.inceptionDate).toLocaleDateString(
                    "en-US",
                    { month: "short", year: "numeric" }
                  )}
                </span>
                <span>|</span>
                <span className="flex items-center gap-1.5">
                  {previewIndex.creator}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={() => handleSelectIndex(previewIndex)}
              size="sm"
              variant="secondary"
            >
              Select Index
            </Button>
          </div>
        </div>
      </PreparingShell>
    );
  }

  // VIEW: Index List (default)
  return (
    <PreparingShell
      icon={<BarChart3 className="size-4" />}
      onClose={onClose}
      title="Add Indices"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded border border-border bg-card px-2 py-1.5">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search indices..."
            ref={inputRef}
            type="text"
            value={search}
          />
          {search && (
            <button
              className="font-mono text-muted-foreground text-xs hover:text-foreground"
              onClick={() => setSearch("")}
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {INDEX_FILTER_PRESETS.map((preset) => (
              <button
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs transition-colors",
                  activeFilter === preset.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
                key={preset.id}
                onClick={() => setActiveFilter(preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <span className="text-muted-foreground text-xs">
            {filtered.length} {filtered.length === 1 ? "index" : "indices"}
          </span>
        </div>

        <div className="max-h-72 divide-y divide-border overflow-y-auto rounded border border-border">
          {isLoading ? (
            <LoadingSkeleton rows={5} />
          ) : suggestions.length === 0 ? (
            <div className="p-3 text-center text-muted-foreground text-sm">
              {search || activeFilter !== "all"
                ? "No indices match your filters"
                : "No more indices available"}
            </div>
          ) : (
            suggestions.map((index) => (
              <div
                className="flex items-center hover:bg-muted/50"
                key={index.name}
              >
                <button
                  className="flex flex-1 items-center justify-between px-3 py-2.5 text-left"
                  onClick={() => goToDetail(index)}
                >
                  <div className="flex flex-1 items-center gap-2">
                    {index.isUserCreated && (
                      <span
                        className="inline-block size-1.5 rounded-full bg-primary"
                        title="Your organization"
                      />
                    )}
                    <span className="font-medium text-sm">{index.name}</span>

                    <span
                      className={cn(
                        "font-mono text-xs tabular-nums",
                        index.ytdPerformance >= 0
                          ? "text-green-500"
                          : "text-red-500"
                      )}
                    >
                      {index.ytdPerformance >= 0 ? "+" : ""}
                      {index.ytdPerformance.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {index.publisher}
                    </span>
                  </div>
                </button>
                <button
                  className="px-2 py-2.5 text-muted-foreground hover:text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(index as IndexAttachment);
                    onClose();
                  }}
                  title="Add index"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </PreparingShell>
  );
}

function DeepResearchPreparing({
  onClose,
  onDone,
  onOpenConfig,
}: {
  onClose: () => void;
  onDone: () => void;
  onOpenConfig: () => void;
}) {
  return (
    <PreparingShell
      icon={<Microscope className="size-4" />}
      onClose={onClose}
      onDone={onDone}
      title="Deep Research Run"
    >
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Begin research and analysis to generate a new portfolio with expanded
          sources and evidence.
          <br />
        </p>
        <div className="rounded border border-border p-3">
          <ul className="ml-0.5 list-inside list-disc space-y-0.5 font-mono text-foreground text-xs">
            <li>Use existing themes</li>
            <li>Replace existing portfolio</li>
            <li>US equities only</li>
            <li>Use all available data sources as of Jan 5, 2026</li>
          </ul>
        </div>
        <div className="flex items-center justify-between">
          <Button
            onClick={onOpenConfig}
            size="sm"
            variant="secondary"
          >
            <Settings className="mr-1 size-3" />
            Configure
          </Button>
          <span className="text-muted-foreground text-sm">
            Deep Research runs may take up to 10 minutes to complete.
          </span>
        </div>
      </div>
    </PreparingShell>
  );
}

// =============================================================================
// REUSABLE ATTACHMENT CHIP
// =============================================================================

function AttachmentChip({
  icon,
  primary,
  secondary,
  tooltip,
  error,
  loading,
  onRemove,
  onClick,
  extraAction,
}: {
  icon: React.ReactNode;
  primary: string;
  secondary?: string;
  tooltip?: string;
  error?: string;
  loading?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  extraAction?: React.ReactNode;
}) {
  const displayTooltip = error || tooltip;

  const chip = (
    <span
      className={cn(
        "inline-flex max-w-[280px] items-center gap-1.5 rounded-full border px-2 py-1 text-sm",
        error
          ? "border-destructive/50 bg-destructive/10"
          : "border-border bg-card",
        onClick && "cursor-pointer hover:bg-muted/50",
        loading && "animate-pulse"
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      {error ? (
        <AlertTriangle className="size-3 flex-shrink-0 text-destructive" />
      ) : (
        <span className="flex-shrink-0">{icon}</span>
      )}
      <span
        className={cn(
          "line-clamp-1 select-none font-medium",
          error && "text-destructive"
        )}
      >
        {primary}
      </span>
      {secondary && (
        <span
          className={cn(
            "line-clamp-1 select-none",
            error ? "text-destructive/70" : "text-muted-foreground"
          )}
        >
          {secondary}
        </span>
      )}
      {extraAction}
      {onRemove && (
        <button
          className={cn(
            "flex-shrink-0 rounded-full text-muted-foreground hover:text-primary",
            error && "text-destructive"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );

  if (displayTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{chip}</TooltipTrigger>
        <TooltipContent
          className={cn(
            "max-w-64 p-2 text-sm",
            error ? "text-destructive" : "text-foreground"
          )}
        >
          {displayTooltip}
        </TooltipContent>
      </Tooltip>
    );
  }

  return chip;
}

// =============================================================================
// READY MODE COMPACT DISPLAYS
// =============================================================================

function TickerChips({
  tickers,
  onRemove,
}: {
  tickers: TickerAttachment[];
  onRemove: (symbol: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tickers.map((t) => (
        <AttachmentChip
          error={t.error}
          icon={
            <span
              className={cn(
                "flex size-4 items-center justify-center rounded-full font-medium text-white text-xs",
                t.error ? "bg-destructive" : getTickerColor(t.symbol)
              )}
            >
              {t.symbol[0]}
            </span>
          }
          key={t.symbol}
          onRemove={() => onRemove(t.symbol)}
          primary={t.symbol}
          tooltip={t.error ? undefined : t.name}
        />
      ))}
    </div>
  );
}

function ThemeChips({
  themes,
  onClick,
}: {
  themes: ThemeAttachment[];
  onClick: (theme: ThemeAttachment) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {themes.map((theme, i) => (
        <AttachmentChip
          error={theme.error}
          icon={<Layers className="size-3 text-muted-foreground" />}
          key={i}
          onClick={() => onClick(theme)}
          primary={theme.name}
          secondary={`${theme.subThemeCount} sub-theme${theme.subThemeCount === 1 ? "" : "s"}`}
        />
      ))}
    </div>
  );
}

function ExpertChips({
  experts,
  onRemove,
}: {
  experts: ExpertAttachment[];
  onRemove: (name: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {experts.map((expert) => (
        <AttachmentChip
          error={expert.error}
          icon={<User className="size-3 text-muted-foreground" />}
          key={expert.name}
          onRemove={() => onRemove(expert.name)}
          primary={expert.name}
          secondary={expert.topic}
        />
      ))}
    </div>
  );
}

function IndexChips({
  indices,
  onRemove,
}: {
  indices: IndexAttachment[];
  onRemove: (name: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {indices.map((index) => (
        <AttachmentChip
          error={index.error}
          icon={<BarChart3 className="size-3 text-muted-foreground" />}
          key={index.name}
          onRemove={() => onRemove(index.name)}
          primary={index.name}
          secondary={index.publisher}
        />
      ))}
    </div>
  );
}

// =============================================================================
// ATTACHMENT MENU
// =============================================================================

function AttachmentMenu({
  onSelect,
}: {
  onSelect: (type: AttachmentType) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => setIsOpen(!isOpen)}
            size="icon"
            variant="ghost"
          >
            <Plus className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-64 space-y-2 p-3" side="top">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Attachments
          </p>
          <DottedDivider />
          <p className="text-foreground">
            Add context with tickers, themes, experts, or existing indices to
            guide the AI&apos;s changes.
          </p>
        </TooltipContent>
      </Tooltip>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-lg border border-border bg-card shadow-lg">
            <div className="border-b px-3 py-2 font-medium text-muted-foreground text-sm">
              Add Context
            </div>
            <div className="space-y-px p-1">
              {MENU_ITEMS.map((item) => (
                <button
                  className="flex w-full items-start gap-3 rounded-md p-2 text-left hover:bg-muted"
                  key={item.id}
                  onClick={() => {
                    onSelect(item.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="mt-0.5 text-muted-foreground">
                    {item.icon}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-muted-foreground text-sm">
                      {item.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// MESSAGE DISPLAY
// =============================================================================

function MessageDisplay({ message }: { message: Message }) {
  const { text, attachments } = message;
  const hasAttachments =
    attachments.tickers.length > 0 ||
    attachments.themes.length > 0 ||
    attachments.experts.length > 0 ||
    attachments.indices.length > 0 ||
    attachments.deepResearch;

  return (
    <div className="flex w-full items-end justify-end gap-2 pt-2 pb-4">
      <div className="flex max-w-[80%] flex-col gap-3 rounded-3xl bg-muted px-4 py-3 text-sm">
        {text && <div>{text}</div>}

        {hasAttachments && (
          <div className="flex flex-wrap gap-1.5">
            {attachments.tickers.map((t) => (
              <AttachmentChip
                icon={
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full font-medium text-white text-xs",
                      getTickerColor(t.symbol)
                    )}
                  >
                    {t.symbol[0]}
                  </span>
                }
                key={t.symbol}
                primary={t.symbol}
                tooltip={t.name}
              />
            ))}
            {attachments.themes.map((theme, i) => (
              <AttachmentChip
                icon={<Layers className="size-3 text-muted-foreground" />}
                key={i}
                primary={theme.name}
                secondary={`${theme.subThemeCount} sub-theme${theme.subThemeCount === 1 ? "" : "s"}`}
              />
            ))}
            {attachments.experts.map((expert) => (
              <AttachmentChip
                icon={<User className="size-3 text-muted-foreground" />}
                key={expert.name}
                primary={expert.name}
                secondary={expert.topic}
              />
            ))}
            {attachments.indices.map((index) => (
              <AttachmentChip
                icon={<BarChart3 className="size-3 text-muted-foreground" />}
                key={index.name}
                primary={index.name}
                secondary={index.publisher}
              />
            ))}
            {attachments.deepResearch && (
              <AttachmentChip
                icon={<Microscope className="size-3 text-muted-foreground" />}
                primary="Deep Research"
                secondary={
                  attachments.deepResearch.isCustom ? "custom" : "default"
                }
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// DEBUG SIDEBAR (inline replacement for tilt's Sidebar component)
// =============================================================================

function DebugSidebar({
  mode,
  preparingType,
  messages,
  onClearMessages,
  attachments,
  hasReadyAttachments,
  simulation,
  onSimulationChange,
  onToggleError,
}: {
  mode: Mode;
  preparingType: AttachmentType | null;
  messages: Message[];
  onClearMessages: () => void;
  attachments: AttachmentState;
  hasReadyAttachments: boolean;
  simulation: { searchLoading: boolean; searchDelayMs: number };
  onSimulationChange: (sim: { searchLoading: boolean; searchDelayMs: number }) => void;
  onToggleError: (type: string, id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Toggle button */}
      <button
        className="fixed top-4 right-4 z-50 rounded border bg-background px-2 py-1 font-mono text-xs hover:bg-muted"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? "close" : "debug"}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed top-0 right-0 z-40 h-full w-72 border-l bg-background overflow-y-auto">
          <div className="border-b p-4 pt-12">
            <div className="font-mono text-xs">prototype/chat-attachments</div>
          </div>

          {/* State */}
          <div className="border-b p-4 font-mono text-xs">
            <div className="mb-2 uppercase tracking-wide">State</div>
            <div className="space-y-1">
              <div>
                mode: {mode}
                {preparingType && mode === "preparing" && ` (${preparingType})`}
              </div>
              <div>messages: {messages.length}</div>
            </div>
            {messages.length > 0 && (
              <button
                className="mt-2 border px-2 py-0.5 hover:bg-muted"
                onClick={onClearMessages}
              >
                clear
              </button>
            )}
          </div>

          {/* Behaviors */}
          <div className="border-b p-4 font-mono text-xs">
            <div className="mb-2 uppercase tracking-wide">Behaviors</div>
            <div className="space-y-1">
              <div>ticker/expert/index: [x] to remove, [+] to edit</div>
              <div>theme: click card to edit</div>
              <div>deep-research: toggle beside send</div>
            </div>
          </div>

          {/* Simulation */}
          <div className="p-4 font-mono text-xs">
            <div className="mb-2 uppercase tracking-wide">Simulation</div>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  checked={simulation.searchLoading}
                  onChange={(e) =>
                    onSimulationChange({
                      ...simulation,
                      searchLoading: e.target.checked,
                    })
                  }
                  type="checkbox"
                />
                <span>loading</span>
                {simulation.searchLoading && (
                  <>
                    <input
                      className="w-12 border border-border bg-transparent px-1"
                      onChange={(e) =>
                        onSimulationChange({
                          ...simulation,
                          searchDelayMs: Number.parseInt(e.target.value) || 0,
                        })
                      }
                      type="number"
                      value={simulation.searchDelayMs}
                    />
                    <span>ms</span>
                  </>
                )}
              </label>

              {hasReadyAttachments && (
                <div className="space-y-1">
                  <div>toggle errors:</div>
                  <div className="flex flex-wrap gap-1">
                    {attachments.tickers.map((t) => (
                      <button
                        className={cn(
                          "border px-1",
                          t.error && "border-foreground"
                        )}
                        key={t.symbol}
                        onClick={() => onToggleError("ticker", t.symbol)}
                      >
                        {t.symbol}
                      </button>
                    ))}
                    {attachments.experts.map((e) => (
                      <button
                        className={cn(
                          "border px-1",
                          e.error && "border-foreground"
                        )}
                        key={e.name}
                        onClick={() => onToggleError("expert", e.name)}
                      >
                        {e.name}
                      </button>
                    ))}
                    {attachments.indices.map((i) => (
                      <button
                        className={cn(
                          "border px-1",
                          i.error && "border-foreground"
                        )}
                        key={i.name}
                        onClick={() => onToggleError("index", i.name)}
                      >
                        {i.name}
                      </button>
                    ))}
                    {attachments.themes.map((t, idx) => (
                      <button
                        className={cn(
                          "border px-1",
                          t.error && "border-foreground"
                        )}
                        key={idx}
                        onClick={() => onToggleError("theme", String(idx))}
                      >
                        {t.name}
                      </button>
                    ))}
                    {attachments.deepResearch && (
                      <button
                        className={cn(
                          "border px-1",
                          attachments.deepResearch.error && "border-foreground"
                        )}
                        onClick={() => onToggleError("deep-research", "")}
                      >
                        research
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// =============================================================================
// MAIN PROTOTYPE COMPONENT
// =============================================================================

export default function ChatAttachmentsPrototype() {
  const [mode, setMode] = useState<Mode>("idle");
  const [preparingType, setPreparingType] = useState<AttachmentType | null>(
    null
  );
  const [editingTheme, setEditingTheme] = useState<ThemeAttachment | null>(
    null
  );

  const [attachments, setAttachments] = useState<AttachmentState>({
    tickers: [],
    themes: [],
    experts: [],
    indices: [],
    deepResearch: null,
  });

  const [inputValue, setInputValue] = useState("");

  const [simulation, setSimulation] = useState({
    searchLoading: false,
    searchDelayMs: 0,
  });

  const [messages, setMessages] = useState<Message[]>([]);

  const hasReadyAttachments =
    attachments.tickers.length > 0 ||
    attachments.themes.length > 0 ||
    attachments.experts.length > 0 ||
    attachments.indices.length > 0;

  const getStarterConfig = () => {
    const typesWithCounts: Array<{ type: AttachmentType; count: number }> = [];
    if (attachments.tickers.length > 0)
      typesWithCounts.push({
        type: "ticker",
        count: attachments.tickers.length,
      });
    if (attachments.themes.length > 0)
      typesWithCounts.push({ type: "theme", count: attachments.themes.length });
    if (attachments.experts.length > 0)
      typesWithCounts.push({
        type: "expert",
        count: attachments.experts.length,
      });
    if (attachments.indices.length > 0)
      typesWithCounts.push({
        type: "index",
        count: attachments.indices.length,
      });
    if (attachments.deepResearch)
      typesWithCounts.push({ type: "deep-research", count: 1 });

    if (typesWithCounts.length === 0)
      return { text: "", placeholder: "Describe your index..." };
    if (typesWithCounts.length === 1) {
      const { type, count } = typesWithCounts[0];
      return getStarterText(type, count);
    }
    return { text: "", placeholder: MIXED_PLACEHOLDER };
  };

  const starterConfig = getStarterConfig();

  const prevAttachmentsRef = useRef(attachments);
  useEffect(() => {
    const prev = prevAttachmentsRef.current;
    const curr = attachments;

    const hasChanged =
      prev.tickers.length !== curr.tickers.length ||
      prev.themes.length !== curr.themes.length ||
      prev.experts.length !== curr.experts.length ||
      prev.indices.length !== curr.indices.length ||
      prev.deepResearch !== curr.deepResearch;

    if (hasChanged) {
      prevAttachmentsRef.current = curr;

      setInputValue((currentInput) => {
        const userHasEdited =
          currentInput !== "" && !ALL_STARTER_TEXTS.includes(currentInput);

        if (userHasEdited) {
          return currentInput;
        }

        const newConfig = getStarterConfig();
        if (newConfig.text) {
          return newConfig.text + " ";
        }
        return "";
      });
    }
  }, [attachments]);

  const handleMenuSelect = (type: AttachmentType) => {
    setMode("preparing");
    setPreparingType(type);
  };

  const handleClosePreparingMode = () => {
    setMode(hasReadyAttachments ? "ready" : "idle");
    setPreparingType(null);
  };

  const handleDone = () => {
    setMode("ready");
    setPreparingType(null);
  };

  const handleSubmit = () => {
    const newMessage: Message = {
      id: crypto.randomUUID(),
      text: inputValue,
      attachments: { ...attachments },
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);

    setInputValue("");
    setAttachments({
      tickers: [],
      themes: [],
      experts: [],
      indices: [],
      deepResearch: null,
    });
    setMode("idle");
  };

  const handleToggleError = (type: string, id: string) => {
    setAttachments((s) => {
      switch (type) {
        case "ticker":
          return {
            ...s,
            tickers: s.tickers.map((t) =>
              t.symbol === id
                ? { ...t, error: t.error ? undefined : "Ticker delisted" }
                : t
            ),
          };
        case "expert":
          return {
            ...s,
            experts: s.experts.map((e) =>
              e.name === id
                ? { ...e, error: e.error ? undefined : "Expert unavailable" }
                : e
            ),
          };
        case "index":
          return {
            ...s,
            indices: s.indices.map((i) =>
              i.name === id
                ? { ...i, error: i.error ? undefined : "Index suspended" }
                : i
            ),
          };
        case "theme":
          return {
            ...s,
            themes: s.themes.map((t, i) =>
              i === Number(id)
                ? { ...t, error: t.error ? undefined : "Theme generation failed" }
                : t
            ),
          };
        case "deep-research":
          return {
            ...s,
            deepResearch: s.deepResearch
              ? {
                  ...s.deepResearch,
                  error: s.deepResearch.error
                    ? undefined
                    : "Research config invalid",
                }
              : null,
          };
        default:
          return s;
      }
    });
  };

  const renderPreparingContent = () => {
    switch (preparingType) {
      case "ticker":
        return (
          <TickerPreparing
            loadingDelayMs={simulation.searchDelayMs}
            onClose={handleClosePreparingMode}
            onSelect={(t) =>
              setAttachments((s) => ({ ...s, tickers: [...s.tickers, t] }))
            }
            selected={attachments.tickers}
            simulateLoading={simulation.searchLoading}
          />
        );
      case "theme":
        return (
          <ThemePreparing
            editingTheme={editingTheme || undefined}
            onClose={() => {
              setEditingTheme(null);
              handleClosePreparingMode();
            }}
            onDone={(theme) => {
              if (editingTheme) {
                setAttachments((s) => ({
                  ...s,
                  themes: s.themes.map((t) =>
                    t.name === editingTheme.name ? theme : t
                  ),
                }));
              } else {
                setAttachments((s) => ({ ...s, themes: [...s.themes, theme] }));
              }
              setEditingTheme(null);
              handleDone();
            }}
            onRemove={
              editingTheme
                ? () => {
                    setAttachments((s) => ({
                      ...s,
                      themes: s.themes.filter(
                        (t) => t.name !== editingTheme.name
                      ),
                    }));
                    setEditingTheme(null);
                    handleDone();
                  }
                : undefined
            }
          />
        );
      case "expert":
        return (
          <ExpertPreparing
            onClose={handleClosePreparingMode}
            onSelect={(e) =>
              setAttachments((s) => ({ ...s, experts: [...s.experts, e] }))
            }
            selected={attachments.experts}
          />
        );
      case "index":
        return (
          <IndexPreparing
            loadingDelayMs={simulation.searchDelayMs}
            onClose={handleClosePreparingMode}
            onSelect={(i) =>
              setAttachments((s) => ({ ...s, indices: [...s.indices, i] }))
            }
            selected={attachments.indices}
            simulateLoading={simulation.searchLoading}
          />
        );
      case "deep-research":
        return (
          <DeepResearchPreparing
            onClose={handleClosePreparingMode}
            onDone={() => {
              setAttachments((s) => ({
                ...s,
                deepResearch: { isCustom: false },
              }));
              handleDone();
            }}
            onOpenConfig={() => {
              setAttachments((s) => ({
                ...s,
                deepResearch: { isCustom: true },
              }));
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <TooltipProvider>
      <div className="flex min-h-screen w-full">
        {/* Main content area */}
        <main className="flex flex-1 flex-col items-center p-8">
          <div className="flex w-full max-w-2xl flex-1 flex-col">
            {/* Message history */}
            <div className="flex-1 space-y-3 overflow-y-auto pb-4">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center font-mono text-muted-foreground text-sm">
                  no messages yet
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageDisplay key={msg.id} message={msg} />
                ))
              )}
            </div>

            {/* Input cluster */}
            {mode === "preparing" ? (
              renderPreparingContent()
            ) : (
              <div className="rounded-xl border border-border bg-card">
                {/* Textarea */}
                <div className="p-4">
                  <textarea
                    className="min-h-[60px] w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={starterConfig.placeholder}
                    rows={3}
                    value={inputValue}
                  />
                </div>

                {/* Ready mode compact displays */}
                {hasReadyAttachments && (
                  <div className="flex flex-wrap gap-1.5 border-border border-b px-3 pb-3">
                    {attachments.tickers.length > 0 && (
                      <TickerChips
                        onRemove={(symbol) =>
                          setAttachments((s) => ({
                            ...s,
                            tickers: s.tickers.filter(
                              (t) => t.symbol !== symbol
                            ),
                          }))
                        }
                        tickers={attachments.tickers}
                      />
                    )}
                    {attachments.themes.length > 0 && (
                      <ThemeChips
                        onClick={(theme) => {
                          setEditingTheme(theme);
                          setMode("preparing");
                          setPreparingType("theme");
                        }}
                        themes={attachments.themes}
                      />
                    )}
                    {attachments.experts.length > 0 && (
                      <ExpertChips
                        experts={attachments.experts}
                        onRemove={(name) =>
                          setAttachments((s) => ({
                            ...s,
                            experts: s.experts.filter((e) => e.name !== name),
                          }))
                        }
                      />
                    )}
                    {attachments.indices.length > 0 && (
                      <IndexChips
                        indices={attachments.indices}
                        onRemove={(name) =>
                          setAttachments((s) => ({
                            ...s,
                            indices: s.indices.filter(
                              (idx) => idx.name !== name
                            ),
                          }))
                        }
                      />
                    )}
                  </div>
                )}

                {/* Toolbar */}
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <AttachmentMenu onSelect={handleMenuSelect} />
                  </div>
                  <div className="flex items-center gap-2">
                    {attachments.deepResearch ? (
                      <div className="flex h-9 items-center gap-2 rounded-md border pr-2 pl-3 text-sm">
                        <button
                          className="flex items-center gap-2 py-0.5 pr-1 text-muted-foreground hover:text-primary"
                          onClick={() => {
                            setMode("preparing");
                            setPreparingType("deep-research");
                          }}
                          title="Click to configure"
                        >
                          <Microscope className="size-3.5" />
                          <span className="font-medium">Deep Research</span>
                        </button>
                        <button
                          className="text-muted-foreground hover:text-primary"
                          onClick={() =>
                            setAttachments((s) => ({
                              ...s,
                              deepResearch: null,
                            }))
                          }
                          title="Remove"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ) : null}
                    <Button
                      className="bg-foreground text-background"
                      disabled={
                        !(
                          inputValue.trim() ||
                          hasReadyAttachments ||
                          attachments.deepResearch
                        )
                      }
                      onClick={handleSubmit}
                      size="icon"
                      variant="secondary"
                    >
                      <Send className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Debug Sidebar */}
        <DebugSidebar
          mode={mode}
          preparingType={preparingType}
          messages={messages}
          onClearMessages={() => setMessages([])}
          attachments={attachments}
          hasReadyAttachments={hasReadyAttachments}
          simulation={simulation}
          onSimulationChange={setSimulation}
          onToggleError={handleToggleError}
        />
      </div>
    </TooltipProvider>
  );
}
