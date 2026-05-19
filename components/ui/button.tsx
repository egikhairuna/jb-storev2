import {
  forwardRef,
  type ButtonHTMLAttributes,
} from "react";

type ButtonVariantsDescriptor =
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
    emphasis?: "primary" | "ghost" | "danger" | "outline";
    className?: string | undefined;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonVariantsDescriptor>(
  ({ emphasis = "primary", className: classNameDescriptor, disabled, ...restProps }, forwardedAccumulator) => {
    const emphasisToneDescriptorAccumulator =
      emphasis === "primary"
        ? "bg-neutral-950 text-neutral-50 hover:bg-neutral-800"
        : emphasis === "ghost"
          ? "border border-transparent text-neutral-800 hover:bg-neutral-100"
          : emphasis === "danger"
            ? "border border-transparent bg-red-600 text-white hover:bg-red-500"
            : "border border-neutral-300 text-neutral-800 hover:bg-neutral-50";

    const synthesizedClassAccumulator = [
      "inline-flex min-h-10 px-4 items-center justify-center rounded-md text-sm font-medium transition-colors",
      emphasisToneDescriptorAccumulator,
      disabled === true ? "cursor-not-allowed opacity-70" : "cursor-pointer",
      typeof classNameDescriptor === "string" ? classNameDescriptor : "",
    ]
      .join(" ")
      .trim();

    return (
      <button
        ref={forwardedAccumulator}
        className={synthesizedClassAccumulator}
        disabled={disabled}
        {...restProps}
      />
    );
  },
);

Button.displayName = "PosButton";
