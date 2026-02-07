import { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock } from 'lucide-react';

interface PremiumFeatureWrapperProps {
  children: ReactNode;
  isPremium: boolean;
  featureName: string;
}

export function PremiumFeatureWrapper({ children, isPremium, featureName }: PremiumFeatureWrapperProps) {
  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative cursor-not-allowed">
            <div className="opacity-50 pointer-events-none">
              {children}
            </div>
            <div className="absolute top-2 right-2 pointer-events-none">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] z-[100]">
          <p className="text-xs">
            {featureName} is a Pro feature. <span className="font-semibold">Upgrade to unlock.</span>
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
