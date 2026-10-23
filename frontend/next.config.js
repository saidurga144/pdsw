/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/signup',
        destination: '/login',
        permanent: false,
      },
      {
        source: '/signup/:path*',
        destination: '/login',
        permanent: false,
      },
      {
        source: '/register',
        destination: '/login',
        permanent: false,
      },
      {
        source: '/register/:path*',
        destination: '/login',
        permanent: false,
      },
      {
        source: '/create-account',
        destination: '/login',
        permanent: false,
      },
      {
        source: '/create-account/:path*',
        destination: '/login',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
