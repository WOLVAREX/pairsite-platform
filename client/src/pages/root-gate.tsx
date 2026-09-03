import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Landing from "@/pages/landing";
import Home from "@/pages/home";

interface TenantResponse {
  context: "platform" | "tenant";
  site: unknown;
}

export default function RootGate() {
  const { data, isLoading } = useQuery<TenantResponse>({
    queryKey: ["/api/tenant/current"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
      </div>
    );
  }

  // On a developer's subdomain or verified custom domain, show their pair
  // site. Otherwise (the apex platform domain, or an unresolved host) show
  // the marketing landing page.
  if (data?.context === "tenant") {
    return <Home />;
  }
  return <Landing />;
}
