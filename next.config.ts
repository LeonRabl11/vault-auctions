import type {NextConfig} from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  images: {
    // S3-Bilder (Virtual-Hosted-Style: <bucket>.s3.<region>.amazonaws.com)
    remotePatterns: [{protocol: "https", hostname: "**.amazonaws.com"}],
  },
  // Alte /auctions-Pfade auf /marktplatz umleiten (Route umbenannt). Greift für
  // de (ohne Prefix) und en (/en). redirects() laufen vor der Middleware.
  async redirects() {
    return [
      {source: "/auctions", destination: "/marktplatz", permanent: false},
      {
        source: "/auctions/:path*",
        destination: "/marktplatz/:path*",
        permanent: false,
      },
      {source: "/en/auctions", destination: "/en/marktplatz", permanent: false},
      {
        source: "/en/auctions/:path*",
        destination: "/en/marktplatz/:path*",
        permanent: false,
      },
    ];
  },
};

// Bindet src/i18n/request.ts automatisch ein
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
