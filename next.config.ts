import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite o IP da sua rede local e localhost
  allowedDevOrigins: ["192.168.100.11", "localhost:3000", "127.0.0.1:3000"],
};

export default nextConfig;