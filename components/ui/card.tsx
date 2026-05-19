import type { PropsWithChildren, ReactNode } from "react";

type CardDescriptorDescriptor = PropsWithChildren<
  Readonly<{
    title?: ReactNode;
    actions?: ReactNode;
  }>
>;

export function Card(props: CardDescriptorDescriptor) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-neutral-900">{props.title}</div>
        {props.actions ? <div className="flex gap-2">{props.actions}</div> : null}
      </header>
      <div className="text-sm text-neutral-700">{props.children}</div>
    </section>
  );
}
