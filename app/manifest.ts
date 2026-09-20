import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "OpenChair Lite", short_name: "OpenChair", display: "standalone", start_url: "/", background_color: "#F3EFE7", theme_color: "#171717", icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }] };
}
