import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Clarita",
    short_name: "Clarita",
    description: "Scripture for the moment you're in.",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF7EF",
    theme_color: "#285E61",
    icons: [
      { src: "/clarita-mark.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
