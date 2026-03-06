"use client";

import { useEffect, useRef, useState } from "react";

export default function QRScannerModal({ isOpen, onClose, onScan }) {
  const scannerRef = useRef(null);
  const isRunningRef = useRef(false);
  const isMountedRef = useRef(false);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const [error, setError] = useState("");
  const containerId = "qr-reader-container";

  // Aggiorna ref quando cambiano le callback
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    isMountedRef.current = true;

    let html5QrCode = null;

    const stopScanner = async (scanner) => {
      if (!scanner) return;
      try {
        const state = scanner.getState();
        // State 2 = SCANNING, State 3 = PAUSED
        if (state === 2 || state === 3) {
          await scanner.stop();
        }
      } catch {
        // Ignora errori di stop
      }
      try {
        scanner.clear();
      } catch {
        // Ignora errori di clear
      }
    };

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");

        if (!isMountedRef.current) return;

        html5QrCode = new Html5Qrcode(containerId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            // Scansione riuscita — ferma lo scanner prima di elaborare
            isRunningRef.current = false;
            await stopScanner(html5QrCode);
            scannerRef.current = null;
            onScanRef.current(decodedText);
          },
          () => {} // Ignora errori di scansione continua
        );

        if (isMountedRef.current) {
          isRunningRef.current = true;
        } else {
          // Il componente è stato smontato mentre lo scanner partiva
          await stopScanner(html5QrCode);
        }
      } catch (err) {
        console.error("Camera error:", err);
        if (isMountedRef.current) {
          setError("Impossibile accedere alla fotocamera. Controlla i permessi del browser.");
        }
      }
    };

    const timer = setTimeout(startScanner, 300);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
      isRunningRef.current = false;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      stopScanner(scanner);
    };
  }, [isOpen]);

  async function handleClose() {
    isRunningRef.current = false;
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        const state = scanner.getState();
        if (state === 2 || state === 3) {
          await scanner.stop();
        }
      } catch {
        // Ignora
      }
      try {
        scanner.clear();
      } catch {
        // Ignora
      }
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
          id={containerId}
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
