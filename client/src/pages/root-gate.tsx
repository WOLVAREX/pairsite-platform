import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import type { Site } from "@shared/schema";

interface TenantResponse {
  context: "platform" | "tenant";
  site: Site | null;
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
  if (data?.context === "tenant" && data.site) {
    if (data.site.expiresAt && new Date(data.site.expiresAt) <= new Date()) {
      return <div className="min-h-screen bg-black text-white flex items-center justify-center p-6"><div className="text-center"><h1 className="text-2xl font-bold">This Link Has Expired</h1><p className="mt-2 text-gray-500">The owner needs to renew this pair site.</p></div></div>;
    }
    return <Home site={data.site} />;
  }
  return <Landing />;
}
