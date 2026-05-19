"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type SidebarCapturedDescriptorProps = Readonly<{
  skuCandidate: string;
  nameCandidate: string;
  priceCandidate: string;
  onSkuCapturedChange: (value: string) => void;
  onNameCapturedChange: (value: string) => void;
  onPriceCapturedChange: (value: string) => void;
}>;

export function BarcodeEditorSidebar(props: SidebarCapturedDescriptorProps) {
  return (
    <Card title="Label fields">
      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium text-neutral-700">
          Stock keeping unit / barcode digits
          <Input
            className="mt-1"
            value={props.skuCandidate}
            onChange={(incomingChangeEvent) =>
              props.onSkuCapturedChange(incomingChangeEvent.target.value)
            }
          />
        </label>
        <label className="text-xs font-medium text-neutral-700">
          Shelf talker title
          <Input
            className="mt-1"
            value={props.nameCandidate}
            onChange={(incomingChangeDescriptor) =>
              props.onNameCapturedChange(incomingChangeDescriptor.target.value)
            }
          />
        </label>
        <label className="text-xs font-medium text-neutral-700">
          Display price ledger
          <Input
            className="mt-1"
            value={props.priceCandidate}
            onChange={(incomingPriceChangeEvent) =>
              props.onPriceCapturedChange(incomingPriceChangeEvent.target.value)
            }
          />
        </label>
      </div>
    </Card>
  );
}
