"use client";

import React from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { signInWithGoogle } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Sparkles,
  Clock,
  Mail,
  Search,
  Brain,
  Zap,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  const { loading, userProfile } = useAuth();
  const router = useRouter();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in failed:", error);
    }
  };

  const features = [
    {
      icon: Brain,
      title: "Custom Briefs per Topic",
      description:
        "Tailored research briefs for each project, focused on what matters most",
    },
    {
      icon: Clock,
      title: "Set and Forget",
      description:
        "Schedule recurring research updates - daily, weekly, or monthly",
    },
    {
      icon: Search,
      title: "Source-Quality Filtering",
      description:
        "Prioritize trusted sources and cut out noise before it hits your inbox",
    },
    {
      icon: Mail,
      title: "Delivered to You",
      description: "Get curated insights delivered straight to your inbox",
    },
    {
      icon: Zap,
      title: "Summaries + Citations",
      description:
        "Direct, readable summaries with links to original sources",
    },
    {
      icon: Sparkles,
      title: "Always Fresh",
      description: "Stay up-to-date with the latest information in your field",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container-wide py-20 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-200">
              AI-Powered Research Assistant
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6"
          >
            Stay Informed, <span className="gradient-text glow-text">Effortlessly</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
          >
            Set up recurring research projects and get AI-curated insights
            delivered straight to your inbox. Never miss important updates in
            your field again.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="text-sm text-muted-foreground/80 mb-10 max-w-xl mx-auto leading-relaxed"
          >
            Built for product teams, analysts, and marketers who want concise
            research briefs with cited sources, not a pile of links.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col items-center justify-center gap-8"
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {!userProfile && (
                <Button
                  onClick={handleSignIn}
                  size="lg"
                  className="gap-2 text-lg px-8 hover:scale-105 transition-all duration-300 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-glow-md hover:shadow-glow-lg active:scale-95 border-0"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </Button>
              )}
              <Button
                variant="outline"
                size="lg"
                className="gap-2 text-lg px-8 hover:scale-105 transition-all duration-300 glass-card hover:border-purple-500/40 active:scale-95"
                onClick={() => {
                  document.getElementById("features")?.scrollIntoView({
                    behavior: "smooth",
                  });
                }}
              >
                Learn More
              </Button>
            </div>
            <p className="text-sm text-muted-foreground/70 max-w-md leading-relaxed">
              Free to start. Set up your first brief in under 2 minutes.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="container-wide py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Powerful Features for <span className="gradient-text">Modern Researchers</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to stay on top of your research topics without
            the manual work.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="h-full glass-card group">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 shadow-glow-sm group-hover:shadow-glow-md transition-shadow duration-300">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl mb-2">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-base text-muted-foreground/80">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Why RelevX Section */}
      <section className="container-wide py-16">
        <Card className="glass-card p-8 gradient-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl md:text-3xl mb-2">
              Why RelevX vs <span className="gradient-text">Google Alerts</span>
            </CardTitle>
            <CardDescription className="text-base max-w-3xl mx-auto text-muted-foreground/80">
              Alerts send raw articles. RelevX sends concise, summarized
              research briefs so you get the insights without the extra reading.
            </CardDescription>
          </CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-4 text-center">
            <div className="rounded-xl glass-card p-5">
              <p className="text-sm text-purple-400 mb-2 font-medium">RelevX</p>
              <p className="font-semibold">
                Summarized insights with citations
              </p>
            </div>
            <div className="rounded-xl glass-card p-5">
              <p className="text-sm text-blue-400 mb-2 font-medium">Google Alerts</p>
              <p className="font-semibold">
                Raw links that still need reading
              </p>
            </div>
            <div className="rounded-xl glass-card p-5">
              <p className="text-sm text-purple-400 mb-2 font-medium">Your Time</p>
              <p className="font-semibold">Get answers in minutes, not hours</p>
            </div>
          </div>
        </Card>
      </section>

      {/* Trust Section */}
      <section className="container-wide py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-center">
          <Card className="glass-card p-6 group hover:shadow-glow-sm transition-all duration-300">
            <p className="text-3xl font-bold gradient-text glow-text mb-2">3-5 hrs</p>
            <p className="text-muted-foreground/80">
              Saved per week on manual research
            </p>
          </Card>
          <Card className="glass-card p-6 group hover:shadow-glow-blue-sm transition-all duration-300">
            <p className="text-3xl font-bold gradient-text glow-text mb-2">Weekly</p>
            <p className="text-muted-foreground/80">
              Briefs delivered on your schedule
            </p>
          </Card>
          <Card className="glass-card p-6 group hover:shadow-glow-sm transition-all duration-300">
            <p className="text-3xl font-bold gradient-text glow-text mb-2">Cited</p>
            <p className="text-muted-foreground/80">
              Every insight links back to sources
            </p>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container-wide py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How It <span className="gradient-text">Works</span></h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get started in minutes with our simple three-step process
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            {
              step: "01",
              title: "Create a Project",
              description:
                "Define what you want to research and how often you want updates",
            },
            {
              step: "02",
              title: "AI Does the Work",
              description:
                "Our AI searches, analyzes, and curates the most relevant information",
            },
            {
              step: "03",
              title: "Receive Insights",
              description:
                "Get beautifully formatted research reports delivered to your inbox",
            },
          ].map((step, index) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="text-center glass-card rounded-2xl p-8"
            >
              <div className="text-5xl font-bold gradient-text glow-text mb-4">
                {step.step}
              </div>
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-muted-foreground/80">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container-wide py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <Card className="glass-card gradient-border text-center p-12 relative overflow-hidden">
            {/* Subtle glow accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-1/2 bg-glow-purple opacity-30 blur-3xl pointer-events-none" />
            
            <CardHeader className="relative z-10">
              <CardTitle className="text-3xl md:text-4xl mb-4">
                Ready to Transform Your <span className="gradient-text">Research</span>?
              </CardTitle>
              <CardDescription className="text-lg mb-8 max-w-2xl mx-auto text-muted-foreground/80">
                Join researchers and professionals who save hours every week
                with automated research.
              </CardDescription>
              <div className="flex justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Button
                    onClick={() => {
                      if (!userProfile) {
                        handleSignIn();
                      } else {
                        router.push("/projects");
                      }
                    }}
                    size="lg"
                    className="gap-2 text-lg px-8 hover:scale-105 transition-all duration-300 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-glow-md hover:shadow-glow-lg active:scale-95 border-0"
                  >
                    Start Researching Now
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                  <p className="text-sm text-muted-foreground/70">
                    No credit card required. First project in minutes.
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 mt-20">
        <div className="container-wide text-center text-sm text-muted-foreground/60">
          <p>&copy; 2025 RelevX. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
