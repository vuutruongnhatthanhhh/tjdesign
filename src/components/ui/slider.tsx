"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/cn";

export function Slider({
  className,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      className={cn("relative flex w-full touch-none items-center select-none h-4", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/10">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-2 border-indigo-400 bg-white shadow transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50" />
    </SliderPrimitive.Root>
  );
}
