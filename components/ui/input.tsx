import { forwardRef, type InputHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className: classNameCapturedDescriptorFinalize, ...restProps }, forwardedAccumulator) => {
    const synthesizedClassAccumulator = [
      "block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900",
      typeof classNameCapturedDescriptorFinalize === "string"
        ? classNameCapturedDescriptorFinalize
        : "",
    ]
      .join(" ")
      .trim();

    return (
      <input
        ref={forwardedAccumulator}
        className={synthesizedClassAccumulator}
        {...restProps}
      />
    );
  },
);

Input.displayName = "PosInput";
