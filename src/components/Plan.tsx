import React from "react";
import { Check, Star, Zap, Shield, Sparkles } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface PlanFeature {
  title: string;
  description: string;
  icon: React.ReactNode;
  status: "available" | "coming-soon" | "pro";
}

const planFeatures: PlanFeature[] = [
  {
    title: "Dual-Path Execution",
    description: "Detects browser vs executor automatically. Only delivers code to valid environments.",
    icon: <Zap className="w-5 h-5 text-blue-500" />,
    status: "available"
  },
  {
    title: "AI Script Generation",
    description: "Describe what you want and Gemini 3.1 Pro will build it for you in seconds.",
    icon: <Sparkles className="w-5 h-5 text-purple-500" />,
    status: "available"
  },
  {
    title: "AES Obfuscation",
    description: "Military-grade encryption for your script's logic and constants.",
    icon: <Shield className="w-4 h-4 text-green-500" />,
    status: "available"
  },
  {
    title: "Advanced Analytics",
    description: "See exactly which executors are running your scripts and where.",
    icon: <Star className="w-4 h-4 text-amber-500" />,
    status: "pro"
  },
  {
    title: "Custom Domains",
    description: "Deliver scripts from your own white-labeled domain (e.g. scripts.yourbrand.com).",
    icon: <Zap className="w-5 h-5 text-red-500" />,
    status: "coming-soon"
  },
  {
    title: "API Access",
    description: "Programmatically generate and manage obfuscated links via our REST API.",
    icon: <Zap className="w-5 h-5 text-indigo-500" />,
    status: "pro"
  }
];

export function Plan() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {planFeatures.map((feature, i) => (
          <div 
            key={i}
            className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-start gap-4"
          >
            <div className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700">
              {feature.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-sm">{feature.title}</h4>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase",
                  feature.status === "available" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                  feature.status === "pro" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                  feature.status === "coming-soon" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                )}>
                  {feature.status === "available" ? "Live" : feature.status.replace("-", " ")}
                </span>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
