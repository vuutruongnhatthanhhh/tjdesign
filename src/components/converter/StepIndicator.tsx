"use client";

import { Check } from "lucide-react";
import { STEP_DEFS, type StepId } from "./types";

interface Props {
  step: StepId;
  onChange: (step: StepId) => void;
  hasPages: boolean;
}

export default function StepIndicator({ step, onChange, hasPages }: Props) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {STEP_DEFS.map((s, idx) => {
        const enabled = hasPages;
        const isActive = step === s.id;
        const isDone = s.id < step;

        return (
          <div key={s.id} className="flex items-center">
            {idx > 0 && (
              <div
                className={`h-px w-3 flex-shrink-0 ${
                  s.id <= step ? "bg-gradient-to-r from-indigo-500 to-sky-400" : "bg-white/10"
                }`}
              />
            )}
            <button
              disabled={!enabled}
              onClick={() => enabled && onChange(s.id)}
              title={s.label}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all
                ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_4px_12px_-2px_rgba(99,102,241,0.5)]"
                    : enabled
                    ? "text-zinc-300 hover:bg-white/8"
                    : "text-zinc-600 cursor-not-allowed"
                }`}
            >
              <span
                className={`flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-semibold flex-shrink-0 transition-colors
                  ${
                    isActive
                      ? "bg-white text-indigo-600"
                      : isDone
                      ? "bg-emerald-500 text-white"
                      : "bg-white/10 text-zinc-400"
                  }`}
              >
                {isDone ? <Check size={12} /> : s.id}
              </span>
              <span className="hidden md:inline">{s.label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
