import type {NextConfig} from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  images: {
    // S3-Bilder (Virtual-Hosted-Style: <bucket>.s3.<region>.amazonaws.com)
    remotePatterns: [{protocol: "https", hostname: "**.amazonaws.com"}],
  },
};

// Bindet src/i18n/request.ts automatisch ein
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
