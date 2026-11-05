import { Slot } from "radix-ui";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "ghost" | "dark";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant: ButtonVariant;
  asChild?: boolean;
};

const baseClasses =
  "inline-flex min-h-12 items-center justify-center gap-[.6em] font-cond font-extrabold uppercase tracking-[.12em] text-[14px] px-7 py-[15px] relative isolate overflow-hidden cursor-pointer transition-transform duration-200 ease-sb active:scale-[.97] disabled:opacity-50 disabled:pointer-events-none before:content-[''] before:pointer-events-none before:absolute before:inset-y-0 before:-inset-x-6 before:-skew-x-[20deg] before:-z-10 before:transition-transform before:duration-250 before:ease-sb";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white shadow-[0_10px_30px_-12px_rgba(255,18,38,.7)] before:bg-brand-press before:-translate-x-[110%] hover:before:translate-x-0 hover:-translate-y-0.5",
  ghost: "border border-white/45 text-white before:bg-white/10 before:-translate-x-[110%] hover:before:translate-x-0 hover:border-white",
  dark: "bg-black text-white hover:text-white before:bg-brand before:-translate-x-[110%] hover:before:translate-x-0",
};

export function Button({ variant, asChild, className, ...props }: ButtonProps) {
  const Component = asChild ? Slot.Root : "button";

  return <Component className={cn(baseClasses, variantClasses[variant], className)} {...props} />;
}
