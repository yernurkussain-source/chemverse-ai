import QRCode from "qrcode";

type QrCodeProps = {
  value: string;
  label: string;
  size?: number;
  className?: string;
};

/**
 * QR кодты SVG ретінде сызады (сурет файлы керек емес, кез келген өлшемде анық).
 * Серверде де, браузерде де жұмыс істейді.
 */
export function QrCode({ value, label, size = 176, className }: QrCodeProps) {
  const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
  const count = modules.size;

  // Әр қара шаршыны бір SVG жолына жинаймыз
  let path = "";
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (modules.data[row * count + col]) path += `M${col} ${row}h1v1h-1z`;
    }
  }

  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`0 0 ${count} ${count}`}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={count} height={count} fill="#ffffff" />
      <path d={path} fill="#070b1a" />
    </svg>
  );
}
