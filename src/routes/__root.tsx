import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <AuthProvider>
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="font-mono text-7xl font-medium text-champagne tabular-nums">404</h1>
          <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
          <p className="mt-2 text-sm text-soft">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-md bg-champagne px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
            >
              Go home
            </Link>
          </div>
        </div>
      </div>
    </AuthProvider>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Vesper_journal" },
      {
        name: "description",
        content:
          "Track trades, log psychology, and unlock smart insights. A premium trading journal built for traders who want to improve, not just record.",
      },
      { name: "author", content: "Aegis" },
      { property: "og:title", content: "Vesper_journal" },
      {
        property: "og:description",
        content: "Track trades, log psychology, and unlock smart insights.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Vesper_journal" },
      { name: "description", content: "First trading journal designed to build consistency, Improve execution, Fast and easy to ues" },
      { property: "og:description", content: "First trading journal designed to build consistency, Improve execution, Fast and easy to ues" },
      { name: "twitter:description", content: "First trading journal designed to build consistency, Improve execution, Fast and easy to ues" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5dd8447b-25db-46d3-a186-33b5e0703172/id-preview-1ff50515--f4fdb9b6-ff4e-483d-9e9a-f3d7300991ff.lovable.app-1777237903542.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5dd8447b-25db-46d3-a186-33b5e0703172/id-preview-1ff50515--f4fdb9b6-ff4e-483d-9e9a-f3d7300991ff.lovable.app-1777237903542.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster theme="dark" position="top-right" />
    </AuthProvider>
  );
}
