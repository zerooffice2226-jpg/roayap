/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // 💡 السماح لرابط جيت هوب الحالي بعبور جدار الحماية وحفظ الفواتير والأصناف بدون 500
      allowedOrigins: [
        'localhost:3000',
        'improved-dollop-vpj59xq445jhvq9-3000.app.github.dev'
      ]
    }
  }
};

module.exports = nextConfig;
