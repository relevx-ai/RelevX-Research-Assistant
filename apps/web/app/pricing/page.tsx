"use client";

import React, { useState, Suspense, useEffect } from "react";
import { usePlans } from "@/hooks/use-plans";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { signInWithGoogle } from "@/lib/auth";
import { PlanInfo } from "core/models/plans";
import { ActivateFreeTrialRequest, BillingPaymentLinkResponse } from "core/models/billing";
import { useSearchParams, useRouter } from "next/navigation";

import { relevx_api } from "@/lib/client";

function PricingContent() {
  const { plans, loading, error } = usePlans();
  const { user, userProfile, loading: userLoading, reloadUser } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<PlanInfo | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

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
    const plan = plans.find(p => p.id === planId);
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

      <div className="container py-8 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Pricing Plans</h1>
          <p className="text-muted-foreground">
            Choose the plan that best fits your research needs.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl capitalize">{plan.infoName}</CardTitle>
                <CardDescription>
                  {plan.infoDescription}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-4">
                  <div className="flex items-baseline justify-start pb-4">
                    <span className="text-xl font-medium text-muted-foreground mr-1 self-start">US</span>
                    <span className="text-5xl font-bold">
                      ${plan.infoPrice ?? "0"}
                    </span>
                  </div>

                  {userProfile && userProfile.planId == plan.id ? (
                    <Button className="rounded-lg px-6 bg-gradient-to-r from-white-500 to-green-700 text-white w-full" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      className={`rounded-lg px-6 text-white shadow-md transition-all duration-300 w-full ${plan.infoPrice === 0 && userProfile?.freeTrailRedeemed
                        ? "bg-gradient-to-r from-white-500 to-blue-600 cursor-not-allowed opacity-90 shadow-none"
                        : "bg-gradient-to-r from-white-500 to-red-600 hover:shadow-lg hover:from-white-500 hover:to-green-700 hover:scale-105"
                        }`}
                      onClick={() => {
                        if (plan.infoPrice === 0 && userProfile?.freeTrailRedeemed) return;
                        handleSelectPlanStart(plan.id);
                      }}
                      disabled={plan.infoPrice === 0 && userProfile?.freeTrailRedeemed}
                    >
                      {plan.infoPrice === 0 && userProfile?.freeTrailRedeemed ? "Trial Redeemed" : "Select Plan"}
                    </Button>
                  )}
                </div>

                <div className="mt-6">
                  <p className="font-semibold text-sm mb-3">{plan.infoPerksHeader}</p>
                  <ul className="space-y-3 text-sm">
                    {plan.infoPerks?.map((perk, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Plan Selection / Payment Dialog */}
        <Dialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
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
        <Dialog open={showStatusDialog} onOpenChange={(open) => !open && handleCloseStatusDialog()}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{isSuccess ? "Subscription Successful" : "Subscription Failed"}</DialogTitle>
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
      </div>
    </>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]">Loading...</div>}>
      <PricingContent />
    </Suspense>
  );
}
