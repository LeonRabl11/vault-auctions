import type {NextConfig} from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
};

// Bindet src/i18n/request.ts automatisch ein
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
