import { MetadataRoute } from 'next';
 
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://mog-web.pages.dev',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    // Add dynamic routes here in the future if we check specific event pages
    // e.g. /events/${id}
  ];
}
