import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  experimental: {
    serverActions: {
      // Document uploads (TXT / CoNLL-2012 / XMI corpora) flow through the
      // uploadDocumentAction Server Action and routinely exceed Next's default
      // 1 MB request body limit. Raise it to accommodate real annotation files.
      // Keep this in sync with the backend's Spring multipart max-file-size.
      bodySizeLimit: '25mb',
    },
  },
};

export default nextConfig;
