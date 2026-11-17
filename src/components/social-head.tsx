import Head from 'expo-router/head';
import { Platform } from 'react-native';
import { absoluteUrl, socialMetadataFor } from '../services/social-metadata';

// Page metadata for link previews. Rendered by the root layout (outside the startup screen),
// so static export writes it into the HTML of `/` and `/buy-get-free`. Web only.
export function SocialHead({ pathname }: { pathname: string }) {
  const meta = Platform.OS === 'web' ? socialMetadataFor(pathname) : null;
  if (!meta) return null;
  const url = absoluteUrl(meta.path), image = absoluteUrl(meta.image);
  return (
    <Head>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="BStore" />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:secure_url" content={image} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content={String(meta.imageWidth)} />
      <meta property="og:image:height" content={String(meta.imageHeight)} />
      <meta property="og:image:alt" content={meta.imageAlt} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={meta.imageAlt} />
    </Head>
  );
}
