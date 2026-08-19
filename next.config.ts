import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // A importação de pacientes envia a planilha para a ação de servidor. O
    // padrão do Next é 1 MB; a tela recusa acima de 2 MB com mensagem própria,
    // e este limite precisa ser maior que o dela para a mensagem aparecer em
    // vez de o envio morrer antes de chegar.
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default nextConfig;
