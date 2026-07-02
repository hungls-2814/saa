import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
};

// next-intl: reads locale from the NEXT_LOCALE cookie via ./i18n/request.ts
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
