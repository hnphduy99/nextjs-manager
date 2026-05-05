import { ArrowLeft, ShieldX } from "lucide-react";
import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="bg-destructive/10 flex size-24 items-center justify-center rounded-full">
              <ShieldX className="text-destructive size-12" />
            </div>
            {/* Glow ring */}
            <div className="border-destructive/20 absolute inset-0 animate-ping rounded-full border-2 opacity-30" />
          </div>
        </div>

        {/* Status code */}
        <p className="text-muted-foreground/60 mb-2 font-mono text-sm font-medium tracking-widest uppercase">
          Error 403
        </p>

        {/* Heading */}
        <h1 className="mb-3 text-3xl font-bold tracking-tight">Access Denied</h1>

        {/* Description */}
        <p className="text-muted-foreground mb-8 leading-relaxed">
          You don&apos;t have the required permissions to view this page
        </p>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="size-4" />
            Go Back
          </Link>
        </div>
      </div>
    </div>
  );
}
