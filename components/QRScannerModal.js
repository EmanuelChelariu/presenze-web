"use client";

import { useEffect, useRef, useState } from "react";

export default function QRScannerModal({ isOpen, onClose, onScan }) {
  const scannerRef = useRef(null);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const [error, setError] = useState("");
  const containerId = useRef("qr-reader-" + Math.random().toString(36).slice(2));

  // Aggiorna ref quando cambiano le callback
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setError("");

    let html5QrCode = null;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        html5QrCode = new Html5Qrcode(containerId.current);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            onScanRef.current(decodedText);
            html5QrCode.stop().catch(() => {});
          },
          () => {}
        );
      } catch (err) {
        console.error("Camera error:", err);
        setError("Impossibile accedere alla fotocamera. Controlla i permessi del browser.");
      }
    };

    const timer = setTimeout(startScanner, 150);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [isOpen]);

  function handleClose() {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    onCloseRef.current();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Scansiona QR Code</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div
          id={containerId.current}
          className="w-full rounded-lg overflow-hidden bg-gray-900"
          style={{ minHeight: 280 }}
        />

        {error && (
          <p className="text-red-500 text-sm mt-3">{error}</p>
        )}

        <p className="text-xs text-gray-400 mt-3 text-center">
          Inquadra il QR Code del dipendente
        </p>
      </div>
    </div>
  );
}
