import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Roamboard — trips worth taking",
    short_name: "Roamboard",
    description: "Save travel spots, plan with friends, and turn them into a route.",
    start_url: "/trips",
    display: "standalone",
    background_color: "#fff7e8",
    theme_color: "#ff5b35",
    icons: [{ src: "/roamboard-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
