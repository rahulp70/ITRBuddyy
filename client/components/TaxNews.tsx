import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";

interface SourceItems {
  source: string;
  items: string[];
}

export default function TaxNews() {
  const [data, setData] = useState<{
    updatedAt: string;
    sources: SourceItems[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function tryEndpoints() {
      const endpoints = [
        "/api/news",
        `${window.location.origin}/api/news`,
        `//${window.location.host}/api/news`,
        `/.netlify/functions/api/news`,
        `/news-fallback.json`,
      ];

      for (const url of endpoints) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 7000);
          const res = await fetch(url, {
            signal: controller.signal,
            credentials: "same-origin",
          });
          clearTimeout(timeout);
          if (res && res.ok) {
            const j = await res.json();
            return j;
          }
        } catch (err: any) {
          if (err && err.name === "AbortError")
            console.debug("fetch aborted", url);
          else console.debug("fetch error", url, err?.message || err);
          // continue to next
        }
      }
      return null;
    }

    (async () => {
      try {
        setLoading(true);
        const j = await tryEndpoints();
        if (!mounted) return;
        if (j) setData(j);
        else
          setError(
            "Unable to load latest notifications. Please try again later.",
          );
      } catch (err) {
        console.error("Unexpected TaxNews error", err);
        if (mounted)
          setError(
            "Unable to load latest notifications. Please try again later.",
          );
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Important Dates & Notifications</CardTitle>
        <CardDescription>
          Live snippets from the Income Tax India portal
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center text-gray-600">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading latest
            updates…
          </div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : !data || !data.sources?.length ? (
          <div className="text-sm text-gray-600">
            No updates available right now.
          </div>
        ) : (
          <div className="space-y-4">
            {data.sources.map((s) => (
              <div key={s.source}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-800">
                    Source
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <a href={s.source} target="_blank" rel="noreferrer">
                      Open source <ExternalLink className="w-4 h-4 ml-1" />
                    </a>
                  </Button>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                  {s.items.slice(0, 12).map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="text-xs text-gray-500">
              Last updated: {new Date(data.updatedAt).toLocaleString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
