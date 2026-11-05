import * as Flags from "country-flag-icons/react/3x2";
import { cn } from "@/lib/cn";

type FlagProps = {
  code: string;
  className?: string;
};

const countryNames = new Intl.DisplayNames(["es"], { type: "region" });

export function Flag({ code, className }: FlagProps) {
  const upperCode = code.toUpperCase();
  const FlagIcon = Flags[upperCode as keyof typeof Flags];

  if (!FlagIcon) {
    return null;
  }

  return (
    <FlagIcon
      role="img"
      aria-label={countryNames.of(upperCode)}
      className={cn("h-[15px] w-[22px] object-cover", className)}
    />
  );
}
