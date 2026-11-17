// Link-preview metadata for the Customer Web App (Open Graph + Twitter/X).
// Rendered into each page's static HTML at export time, so crawlers that do not run
// JavaScript (WhatsApp, Facebook) receive it in the initial response. Uses only known
// text and static images: no API request is made to build a preview.

export const SITE_URL = 'https://bstore-web.onrender.com';

// Existing Buy & Get Free department (also reachable through its original long URL:
// /department-categories?id=6afa01170b8dc1a73f68a832&name=Buy%20%26%20Get%20Free).
export const BUY_GET_FREE_DEPARTMENT = { id: '6afa01170b8dc1a73f68a832', name: 'Buy & Get Free' } as const;

export type SocialMetadata = {
  title: string;
  description: string;
  path: string;
  image: string;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
};

const pages: Record<string, SocialMetadata> = {
  '/': {
    title: 'BStore | Shop Online in Lebanon',
    description: 'Shop snacks, groceries, cleaning products and personal care essentials with BStore. Retail and Wholesale ordering available.',
    path: '/',
    image: '/og/bstore-home-social.png',
    imageAlt: 'BStore logo',
    imageWidth: 1200,
    imageHeight: 630,
  },
  '/buy-get-free': {
    title: 'BStore – Buy & Get Free 🎁',
    description: 'Buy your products and get a free gift with every offer',
    path: '/buy-get-free',
    image: '/og/buy-get-free-social.png',
    imageAlt: 'BStore Buy & Get Free offers',
    imageWidth: 1200,
    imageHeight: 630,
  },
};

// Query strings (e.g. ?v=1 cache-busting) never change the page's metadata or canonical URL.
export function socialMetadataFor(pathname: string | null | undefined): SocialMetadata | null {
  const path = (pathname || '/').split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return pages[path] ?? null;
}

export const absoluteUrl = (path: string) => SITE_URL + path;
