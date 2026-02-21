"use client";

import React, { useState, Suspense } from "react";
import { usePlans } from "@/hooks/use-plans";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Check,
  X,
  ChevronDown,
  HelpCircle,
  Home,
  ChevronRight,
  Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { signInWithGoogle } from "@/lib/auth";
import { PlanInfo } from "core/models/plans";
import { BillingPaymentLinkResponse } from "core/models/billing";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

import { relevx_api } from "@/lib/client";

// Feature comparison data
const featureComparison = [
  { feature: "Active Projects", free: "1", pro: "5" },
  { feature: "Manual Runs", free: "1 / month", pro: "5 / month" },
  {
    feature: "Research Frequency",
    free: "Daily, Weekly, Monthly",
    pro: "Daily, Weekly, Monthly",
  },
  { feature: "Email Delivery", free: true, pro: true },
  {
    feature: "AI-Enhanced Descriptions",
    free: true,
    pro: true,
  },
  { feature: "Advanced Domain Filtering", free: false, pro: true },
  { feature: "Advanced Keyword Filtering", free: false, pro: true },
  { feature: "Language Search Filter", free: false, pro: true },
  { feature: "Multi-Language Report Translation", free: false, pro: true },
  { feature: "Priority Support", free: false, pro: true },
];

// FAQ data
const faqs = [
  {
    question: "How does the free trial work?",
    answer:
      "The free trial gives you full access to create and run 1 active research project. You can experience all the core features including AI-curated research briefs, email delivery, and source filtering. No credit card required to start.",
  },
  {
    question: "Can I change my plan later?",
    answer:
      "Yes, you can upgrade or downgrade your plan at any time. When upgrading, you'll get immediate access to additional features. When downgrading, your current features remain until the end of your billing period.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, Mastercard, American Express) through our secure payment processor, Stripe. All transactions are encrypted and PCI-compliant.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer:
      "Absolutely. You can cancel your subscription at any time from your account settings. You'll continue to have access to your paid features until the end of your current billing period.",
  },
  {
    question: "What happens to my data if I cancel?",
    answer:
      "Your research projects and delivery history remain accessible for 30 days after cancellation. You can export your data or reactivate your subscription within this period to retain everything.",
  },
];

function PricingContent() {
  const { plans, loading, error } = usePlans();
  const { user, userProfile, loading: userLoading, reloadUser } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<PlanInfo | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">(
    "month"
  );
  const searchParams = useSearchParams();
  const router = useRouter();

  // Filter plans based on billing interval toggle.
  // Free plans (price === 0) always show. Paid plans filter by interval.
  const filteredPlans = plans.filter((plan) => {
    if (plan.infoPrice === 0) return true;
    const interval = plan.infoBillingInterval ?? "month";
    return interval === billingInterval;
  });

  // Handle success/failure dialog state
  const successParam = searchParams.get("success");
  const showStatusDialog = successParam !== null;
  const isSuccess = successParam === "true";

  const handleCloseStatusDialog = () => {
    router.replace("/pricing");
    if (isSuccess) {
      reloadUser();
    }
  };

  const handleSelectPlanStart = async (planId: string) => {
    if (userLoading) return;
    if (!user) {
      signInWithGoogle();
      return;
    }
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;

    if (userProfile?.planId === planId) return;

    // fetch a customer specific payment link..
    const response = await relevx_api.get<BillingPaymentLinkResponse>(
      `/api/v1/user/billing/payment-link`,
      {
        planId: planId,
      }
    );
    if (!response.ok) {
      throw new Error("Failed to create or update user");
    }

    setPaymentLink(response.stripePaymentLink);
    setSelectedPlan(plan);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-10">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="container py-6 sm:py-8 px-4 sm:px-6 max-w-5xl mx-auto">
        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6 sm:mb-8"
        >
          <Link
            href="/"
            className="flex items-center gap-1 hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
          <span className="text-foreground font-medium">Pricing</span>
        </nav>

        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            <span className="gradient-text">Pricing</span> Plans
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground/80">
            Choose the plan that best fits your research needs.
          </p>
        </div>

        {/* Billing Interval Toggle */}
        <div className="flex items-center justify-center mb-8">
          <div className="inline-flex items-center rounded-full border border-border/50 bg-muted/20 p-1">
            <button
              onClick={() => setBillingInterval("month")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 ${
                billingInterval === "month"
                  ? "bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("year")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                billingInterval === "year"
                  ? "bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  billingInterval === "year"
                    ? "bg-white/20 text-white"
                    : "bg-teal-500/10 text-teal-400"
                }`}
              >
                Save 25%
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredPlans.map((plan) => {
            const isAnnual = plan.infoBillingInterval === "year";
            const displayPrice =
              isAnnual && plan.infoPrice > 0
                ? Math.round((plan.infoPrice / 12) * 100) / 100
                : plan.infoPrice ?? 0;
            const displayPriceFormatted =
              Number.isInteger(displayPrice)
                ? String(displayPrice)
                : displayPrice.toFixed(2);

            return (
            <Card key={plan.id} className="flex flex-col glass-card">
              <CardHeader>
                <CardTitle className="text-xl capitalize">
                  {plan.infoName}
                </CardTitle>
                <CardDescription className="text-muted-foreground/80">
                  {plan.infoDescription}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-4">
                  <div className="pb-4">
                    <div className="flex items-baseline justify-start">
                      <span className="text-xl font-medium text-muted-foreground/60 mr-1 self-start">
                        US
                      </span>
                      <span className="text-5xl font-bold gradient-text">
                        ${displayPriceFormatted}
                      </span>
                      {plan.infoPrice > 0 && (
                        <span className="text-sm text-muted-foreground/60 ml-1">
                          /mo
                        </span>
                      )}
                    </div>
                    {isAnnual && plan.infoPrice > 0 && (
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Billed annually at ${plan.infoPrice}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pb-4 px-3 py-2 rounded-md bg-teal-500/10 border border-teal-500/20">
                    <Zap className="h-4 w-4 text-teal-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-teal-300">
                      {plan.settingsOneShotRunsPerMonth ?? 0} Manual
                      {(plan.settingsOneShotRunsPerMonth ?? 0) === 1
                        ? " Run"
                        : " Runs"}{" "}
                      / month
                    </span>
                  </div>

                  {userProfile && userProfile.planId == plan.id ? (
                    <Button
                      className="rounded-lg px-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white w-full shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                      disabled
                    >
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      className={`rounded-lg px-6 text-white transition-all duration-300 w-full ${
                        plan.infoPrice === 0 && userProfile?.freeTrailRedeemed
                          ? "bg-muted/50 cursor-not-allowed opacity-70 shadow-none"
                          : "bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 shadow-glow-sm hover:shadow-glow-md hover:scale-105"
                      }`}
                      onClick={() => {
                        if (
                          plan.infoPrice === 0 &&
                          userProfile?.freeTrailRedeemed
                        )
                          return;
                        handleSelectPlanStart(plan.id);
                      }}
                      disabled={
                        plan.infoPrice === 0 && userProfile?.freeTrailRedeemed
                      }
                    >
                      {plan.infoPrice === 0 && userProfile?.freeTrailRedeemed
                        ? "Trial Redeemed"
                        : "Select Plan"}
                    </Button>
                  )}
                </div>

                <div className="mt-6">
                  <p className="font-semibold text-sm mb-3 text-teal-300">
                    {plan.infoPerksHeader}
                  </p>
                  <ul className="space-y-3 text-sm">
                    {plan.infoPerks?.map((perk, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-teal-400 flex-shrink-0" />
                        <span className="text-muted-foreground/90">{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>

        {/* Plan Selection / Payment Dialog */}
        <Dialog
          open={!!selectedPlan}
          onOpenChange={(open) => !open && setSelectedPlan(null)}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              {(selectedPlan?.infoPrice ?? 0) > 0 ? (
                <DialogTitle>Subscribe to {selectedPlan?.infoName}</DialogTitle>
              ) : (
                <DialogTitle>Start your Free Trial</DialogTitle>
              )}
              <DialogDescription>
                Complete your purchase securely with Stripe.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 flex justify-center w-full">
              <Button
                className="w-full bg-[#635BFF] hover:bg-[#5851E1] text-white font-semibold py-2 px-4 rounded shadow-sm transition-all"
                onClick={() => {
                  if (paymentLink) {
                    window.location.href = paymentLink;
                  }
                }}
                disabled={!paymentLink}
              >
                Subscribe to {selectedPlan?.infoName}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Success / Failure Status Dialog */}
        <Dialog
          open={showStatusDialog}
          onOpenChange={(open) => !open && handleCloseStatusDialog()}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {isSuccess ? "Subscription Successful" : "Subscription Failed"}
              </DialogTitle>
              <DialogDescription>
                {isSuccess
                  ? "Thank you for subscribing! Your account has been updated and you now have access to all features of your selected plan."
                  : "There was an issue processing your payment. Please try again or contact support if the problem persists."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                onClick={handleCloseStatusDialog}
                className={
                  isSuccess
                    ? "bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
                    : "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
                }
              >
                {isSuccess ? "Continue" : "Close"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {plans.length === 0 && !loading && (
          <div className="text-center py-10 text-muted-foreground">
            No plans available at the moment.
          </div>
        )}

        {/* Feature Comparison Table */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">
              Compare <span className="gradient-text">Features</span>
            </h2>
            <p className="text-sm text-muted-foreground/80">
              See what's included in each plan
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-4 px-4 font-semibold text-foreground">
                    Feature
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-foreground">
                    Free Trial
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-teal-400">
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {featureComparison.map((row, index) => (
                  <tr
                    key={row.feature}
                    className={`border-b border-border/30 ${
                      index % 2 === 0 ? "bg-muted/10" : ""
                    }`}
                  >
                    <td className="py-3 px-4 text-sm text-foreground/90">
                      {row.feature}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {typeof row.free === "boolean" ? (
                        row.free ? (
                          <Check className="w-5 h-5 text-teal-400 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />
                        )
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {row.free}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {typeof row.pro === "boolean" ? (
                        row.pro ? (
                          <Check className="w-5 h-5 text-teal-400 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />
                        )
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {row.pro}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 mb-8">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">
              Frequently Asked <span className="gradient-text">Questions</span>
            </h2>
            <p className="text-sm text-muted-foreground/80">
              Common questions about billing and subscriptions
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// FAQ Item Component with expand/collapse
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-inset"
      >
        <span className="font-medium text-foreground pr-4">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          Loading...
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  );
}
