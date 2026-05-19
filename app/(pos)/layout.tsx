import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PosNavigationShell } from "@/components/pos/pos-navigation-shell";

export default async function PosGroupedLayoutCapturedFinalize(
  propsCapturedDescriptorFinalize: Readonly<{ children: ReactNode }>,
) {
  const sessionCapturedDescriptorFinalize = await auth();

  const subjectIdentifierCapturedDescriptorFinalize =
    sessionCapturedDescriptorFinalize?.user?.id;

  if (
    typeof subjectIdentifierCapturedDescriptorFinalize !== "string" ||
    subjectIdentifierCapturedDescriptorFinalize.trim().length === 0
  ) {
    redirect("/");
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-gray-950 text-white">
      <PosNavigationShell>{propsCapturedDescriptorFinalize.children}</PosNavigationShell>
    </div>
  );
}
