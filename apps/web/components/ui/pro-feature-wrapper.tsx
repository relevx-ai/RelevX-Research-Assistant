import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Lock } from "lucide-react";

// React 19 JSX vs Radix `FC` (return type includes Promise<ReactNode>).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TipProvider = TooltipProvider as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Tip = Tooltip as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TipTrigger = TooltipTrigger as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TipContent = TooltipContent as any;

interface ProFeatureWrapperProps {
  children: React.ReactNode;
  isPro: boolean;
  featureName: string;
}

export function ProFeatureWrapper({
  children,
  isPro,
  featureName,
}: ProFeatureWrapperProps) {
  if (isPro) {
    return <>{children}</>;
  }

  return (
    <TipProvider delayDuration={0}>
      <Tip>
        <TipTrigger asChild>
          <div className="relative cursor-not-allowed">
            <div className="opacity-50 pointer-events-none">{children}</div>
            <div className="absolute top-2 right-2 pointer-events-none">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>
        </TipTrigger>
        <TipContent side="top" className="max-w-[200px] z-[100]">
          <p className="text-xs">
            {featureName} is a Pro feature.{" "}
            <span className="font-semibold">Upgrade to unlock.</span>
          </p>
        </TipContent>
      </Tip>
    </TipProvider>
  );
}
