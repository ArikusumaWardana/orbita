import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Orbita",
    short_name: "Orbita",
    description: "Task, agenda, dan catatan keuangan pribadi dalam satu ruang kerja.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    background_color: "#0e0f11",
    theme_color: "#111214",
    orientation: "portrait-primary",
    lang: "id",
    categories: ["productivity", "finance"],
    icons: [
      {
        src: "/pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
