"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QRCodeCard({ employeeId, employeeName, badgeId, companyName }) {
  const [qrDataUrl, setQrDataUrl] = useState(null);

  useEffect(() => {
    if (!employeeId) return;
    QRCode.toDataURL(employeeId, {
      width: 280,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "H",
    }).then(setQrDataUrl);
  }, [employeeId]);

  async function downloadQR() {
    if (!qrDataUrl) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const qrSize = 300;
    const padding = 40;
    const headerHeight = 65;
    const footerHeight = 40;
    canvas.width = qrSize + padding * 2;
    canvas.height = headerHeight + qrSize + footerHeight + padding * 2;

    // Sfondo bianco
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Bordo
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

    // Nome dipendente (header)
    ctx.fillStyle = "#111827";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(employeeName, canvas.width / 2, padding + 28);

    // Nome azienda
    if (companyName) {
      ctx.fillStyle = "#6b7280";
      ctx.font = "15px sans-serif";
      ctx.fillText(companyName, canvas.width / 2, padding + 50);
    }

    // QR code
    const img = new Image();
    img.src = qrDataUrl;
    await new Promise((resolve) => { img.onload = resolve; });
    ctx.drawImage(img, padding, padding + headerHeight, qrSize, qrSize);

    // Badge ID (footer)
    ctx.fillStyle = "#6b7280";
    ctx.font = "14px monospace";
    ctx.textAlign = "center";
    ctx.fillText(badgeId, canvas.width / 2, padding + headerHeight + qrSize + 28);

    // Download
    const link = document.createElement("a");
    link.download = `QR_${employeeName.replace(/\s+/g, "_")}_${badgeId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  if (!qrDataUrl) return null;

  return (
    <div className="bg-white rounded-xl shadow p-6 mt-4">
      <h2 className="font-semibold text-gray-700 mb-4">QR Code Dipendente</h2>
      <div className="flex flex-col items-center border border-gray-200 rounded-lg p-6 bg-gray-50">
        <p className="text-lg font-bold text-gray-900 mb-1">{employeeName}</p>
        {companyName && <p className="text-sm text-gray-500 mb-3">{companyName}</p>}
        <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
        <p className="text-xs font-mono text-gray-500 mt-3">{badgeId}</p>
      </div>
      <button
        onClick={downloadQR}
        className="mt-4 w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 transition text-sm"
      >
        Scarica QR Code
      </button>
    </div>
  );
}
