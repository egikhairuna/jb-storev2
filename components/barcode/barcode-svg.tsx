"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeSvgProps {
  value: string;
  width?: number;
  height?: number;
  className?: string;
}

export const BarcodeSvg = ({
  value,
  width = 1.2,
  height = 30,
  className,
}: BarcodeSvgProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width,
          height,
          displayValue: false,
          background: "transparent",
          margin: 0,
        });
      } catch {
        // Silently ignore invalid SKU — must not crash
      }
    }
  }, [value, width, height]);

  if (!value) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 border border-dashed border-gray-200 text-[8px] text-gray-400"
        style={{ height }}
      >
        NO SKU
      </div>
    );
  }

  return <svg ref={svgRef} className={className ?? "w-full h-full"} />;
};
