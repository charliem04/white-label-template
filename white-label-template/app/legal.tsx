import Link from "next/link";
import type { ReactNode } from "react";
import { client } from "@/client.config";

/** Shared shell for legal pages. */
export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <Link href="/" className="text-sm font-medium text-brand">
        ← Back to {client.businessName}
      </Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">{title}</h1>
      <div className="prose-legal mt-8 space-y-5 leading-relaxed [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-bold">
        {children}
      </div>
    </div>
  );
}
