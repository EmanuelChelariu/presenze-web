/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Forza HTTPS per 1 anno
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Previeni clickjacking (no iframe)
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // Blocca sniffing del content type
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Controlla referrer inviato
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Blocca accesso a webcam, microfono, geolocalizzazione, ecc.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Protezione XSS del browser
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
