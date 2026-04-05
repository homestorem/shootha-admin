import { useEffect, useMemo, useState } from "react";
import { Linking } from "react-native";
import { getOwnerFieldLinkFromConfig } from "../lib/ownerFieldLink";

function parseLinkFromUrl(url: string): string | null {
  try {
    const normalized =
      url.includes("://") && !url.startsWith("http") ? url.replace(/^[^:]+:\/\//, "https://app.link/") : url;
    const u = new URL(normalized);
    return u.searchParams.get("link") || u.searchParams.get("owner_field_link");
  } catch {
    return null;
  }
}

/**
 * أولوية الربط: رابط الفتح (دعوة) ← معامل التنقل ← إعدادات البناء.
 */
export function useResolvedOwnerFieldLink(routeLinkId?: string | null): string | null {
  const [fromUrl, setFromUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void Linking.getInitialURL().then((url) => {
      if (!alive || !url) return;
      const v = parseLinkFromUrl(url);
      if (v) setFromUrl(v);
    });
    const sub = Linking.addEventListener("url", ({ url }) => {
      const v = parseLinkFromUrl(url);
      if (v) setFromUrl(v);
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return useMemo(() => {
    const u = fromUrl?.trim() || null;
    const r = routeLinkId?.trim() || null;
    const c = getOwnerFieldLinkFromConfig();
    return u || r || c;
  }, [fromUrl, routeLinkId]);
}
