"use client";

import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeSvgProps {
  value: string;
  width?: number;
  height?: number;
}

export const BarcodeSvg = ({ value, width = 1.2, height = 40 }: BarcodeSvgProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width: width,
          height: height,
          displayValue: false,
          background: "transparent",
          margin: 0,
        });
      } catch (error) {
        console.error("JsBarcode error:", error);
      }
    }
  }, [value, width, height]);

  if (!value) {
    return (
      <div className="flex items-center justify-center bg-gray-50 border border-dashed border-gray-200 text-[8px] text-gray-400" style={{ height }}>
        INVALID SKU
      </div>
    );
  }

  return <svg ref={svgRef} className="w-full h-full" />;
};
