import "server-only";
import QRCode from "qrcode";

/**
 * QR code em SVG, gerado no servidor (a biblioteca não vai para o navegador).
 * O conteúdo é sempre um endereço montado pela aplicação, e o SVG sai da
 * biblioteca — nada vindo de quem usa entra no desenho.
 */
export async function qrEmSvg(texto: string): Promise<string> {
  return QRCode.toString(texto, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
    color: { dark: "#0b2a4a", light: "#ffffff00" },
  });
}
