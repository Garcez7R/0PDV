import { useEffect, useState } from "react";
import QRCode from "qrcode";

type QrCodeCardProps = {
  value: string;
  title: string;
  description: string;
};

export function QrCodeCard({ value, title, description }: QrCodeCardProps) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function generate() {
      if (!value) {
        setSrc("");
        return;
      }

      const nextSrc = await QRCode.toDataURL(value, {
        margin: 1,
        width: 220,
        color: {
          dark: "#0f2f2c",
          light: "#f5f3ea"
        }
      });

      if (!cancelled) {
        setSrc(nextSrc);
      }
    }

    void generate();

    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div className="rounded-[28px] border border-brand-100 bg-white p-4">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      <div className="mt-4 flex justify-center rounded-[24px] bg-canvas p-4">
        {src ? <img src={src} alt="QR Code para abrir o scanner no celular" className="h-56 w-56 rounded-2xl" /> : <div className="flex h-56 w-56 items-center justify-center text-sm text-slate-500">Gerando QR Code...</div>}
      </div>
    </div>
  );
}
