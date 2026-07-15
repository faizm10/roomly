import { sampleProducts, type ProductMetadata, type Retailer } from "@/lib/roomly";

type RetailerAdapter = {
  match(url: URL): boolean;
  extract(url: URL): Promise<ProductMetadata>;
};

const retailerFromHost = (host: string): Retailer => {
  if (host.includes("amazon")) return "Amazon";
  if (host.includes("ikea")) return "IKEA";
  if (host.includes("wayfair")) return "Wayfair";
  if (host.includes("article")) return "Article";
  return "Manual";
};

const slugTitle = (url: URL) => {
  const lastSegment = url.pathname.split("/").filter(Boolean).at(-1) ?? "furniture";
  return lastSegment
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .slice(0, 48);
};

const mockExtract = async (url: URL): Promise<ProductMetadata> => {
  const host = url.hostname.replace(/^www\./, "");
  const matched = sampleProducts[Math.abs(url.href.length) % sampleProducts.length];
  return {
    ...matched,
    id: `mock-${Date.now()}`,
    name: slugTitle(url) === "Furniture" ? matched.name : slugTitle(url),
    retailer: retailerFromHost(host),
    productUrl: url.href,
    extractionStatus: "mock",
    note:
      "Live retailer extraction is unavailable in this local MVP, so Roomly used editable mock metadata.",
  };
};

const genericAdapter: RetailerAdapter = {
  match: () => true,
  extract: mockExtract,
};

const adapters: RetailerAdapter[] = [genericAdapter];

export const extractProductMetadata = async (rawUrl: string) => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Enter a full product URL, including https://");
  }

  const adapter = adapters.find((candidate) => candidate.match(url)) ?? genericAdapter;
  return adapter.extract(url);
};
