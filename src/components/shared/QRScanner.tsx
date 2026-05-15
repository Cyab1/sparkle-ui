import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";

export function QRScanner({ onScan }: { onScan: (data: string) => void }) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startedRef = useRef(false);
  // ✅ Keep a stable ref to onScan so the closure inside startScanner never
  //    captures a stale copy — important when the parent re-renders mid-scan.
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let mounted = true;

    const startScanner = async () => {
      if (startedRef.current) return;
      startedRef.current = true;

      // Android/WebView warm-up
      await new Promise((r) => setTimeout(r, 300));

      const scanner = new Html5Qrcode("reader");
      scannerRef.current = scanner;

      // ✅ Single success callback — do NOT stop the scanner here.
      //    Stopping inside onScan races with React's unmount cleanup and causes
      //    the "camera shuts down immediately" bug. The parent sets
      //    showQRScanner=false which unmounts this component; the cleanup below
      //    then stops the scanner cleanly.
      const onSuccess = (decodedText: string) => {
        if (!mounted) return;
        onScanRef.current(decodedText);
        // Don't call scanner.stop() here — let the unmount cleanup do it.
      };

      const onError = () => {
        // Suppress per-frame decode failures (expected noise)
      };

      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      try {
        await scanner.start(
          { facingMode: "environment" },
          config,
          onSuccess,
          onError,
        );
      } catch {
        // Back camera failed — try any camera
        try {
          await scanner.start(
            undefined,
            { fps: 10, qrbox: { width: 250, height: 250 } },
            onSuccess,
            onError,
          );
        } catch (err: any) {
          console.error("QR Scanner Error:", err);
          if (mounted) {
            setError(
              err?.message ||
                "Unable to start camera. Please allow camera access.",
            );
          }
        }
      }

      if (mounted) setStarting(false);
    };

    startScanner();

    return () => {
      mounted = false;
      // ✅ Cleanup runs when showQRScanner flips to false (component unmounts).
      //    This is the ONE place we stop the scanner — avoids the race condition
      //    where stopping inside onScan conflicts with this cleanup.
      const cleanup = async () => {
        try {
          if (scannerRef.current?.isScanning) {
            await scannerRef.current.stop();
          }
          await scannerRef.current?.clear();
        } catch {
          // Ignore errors during cleanup — scanner may already be stopped
        }
        scannerRef.current = null;
        startedRef.current = false;
      };
      cleanup();
    };
  }, []); // ✅ Empty deps — scanner lifecycle is self-contained via refs

  return (
    <div className="w-full">
      {starting && !error && (
        <div
          className="flex items-center justify-center rounded-xl mb-2"
          style={{
            height: 300,
            background: "hsl(var(--secondary))",
            border: "1px solid hsl(var(--border))",
            color: "hsl(var(--muted-foreground))",
            fontSize: 13,
          }}
        >
          📷 Starting camera…
        </div>
      )}

      {error && (
        <div
          className="mb-3 rounded-xl px-4 py-3 text-xs"
          style={{
            background: "hsl(0 84% 51% / 0.08)",
            border: "1px solid hsl(0 84% 51% / 0.2)",
            color: "hsl(0 84% 51%)",
          }}
        >
          ⚠ {error}
        </div>
      )}

      <div
        id="reader"
        className="overflow-hidden rounded-xl"
        style={{ width: "100%", minHeight: 300 }}
      />
    </div>
  );
}

// import { Html5Qrcode } from "html5-qrcode";
// import { useEffect, useRef, useState } from "react";

// export function QRScanner({
//   onScan,
// }: {
//   onScan: (data: string) => void;
// }) {
//   const scannerRef = useRef<Html5Qrcode | null>(null);
//   const startedRef = useRef(false);

//   const [error, setError] = useState<string | null>(null);
//   const [starting, setStarting] = useState(true);

//   useEffect(() => {
//     let mounted = true;

//     const startScanner = async () => {
//       try {
//         if (startedRef.current) return;

//         startedRef.current = true;

//         // Android/WebView warm-up
//         await new Promise((r) => setTimeout(r, 300));

//         const scanner = new Html5Qrcode("reader");

//         scannerRef.current = scanner;

//         try {
//           // BACK CAMERA FIRST
//           await scanner.start(
//             {
//               facingMode: "environment",
//             },
//             {
//               fps: 10,
//               qrbox: {
//                 width: 250,
//                 height: 250,
//               },
//               aspectRatio: 1,
//             },

//             async (decodedText) => {
//               if (!mounted) return;

//               onScan(decodedText);

//               try {
//                 await scanner.stop();
//                 await scanner.clear();
//               } catch {}
//             },

//             () => {},
//           );
//         } catch {
//           // FALLBACK CAMERA
//           await scanner.start(
//             undefined,
//             {
//               fps: 10,
//               qrbox: {
//                 width: 250,
//                 height: 250,
//               },
//             },

//             async (decodedText) => {
//               if (!mounted) return;

//               onScan(decodedText);

//               try {
//                 await scanner.stop();
//                 await scanner.clear();
//               } catch {}
//             },

//             () => {},
//           );
//         }

//         if (mounted) {
//           setStarting(false);
//         }
//       } catch (err: any) {
//         console.error("QR Scanner Error:", err);

//         setError(
//           err?.message ||
//             "Unable to start camera. Please allow camera access.",
//         );

//         setStarting(false);
//       }
//     };

//     startScanner();

//     return () => {
//       mounted = false;

//       const cleanup = async () => {
//         try {
//           if (scannerRef.current?.isScanning) {
//             await scannerRef.current.stop();
//           }

//           await scannerRef.current?.clear();
//         } catch {}

//         scannerRef.current = null;
//         startedRef.current = false;
//       };

//       cleanup();
//     };
//   }, [onScan]);

//   return (
//     <div className="w-full">
//       {starting && !error && (
//         <div
//           className="flex items-center justify-center rounded-xl mb-2"
//           style={{
//             height: 300,
//             background: "hsl(var(--secondary))",
//             border: "1px solid hsl(var(--border))",
//             color: "hsl(var(--muted-foreground))",
//             fontSize: 13,
//           }}
//         >
//           📷 Starting camera…
//         </div>
//       )}

//       {error && (
//         <div
//           className="mb-3 rounded-xl px-4 py-3 text-xs"
//           style={{
//             background: "hsl(0 84% 51% / 0.08)",
//             border: "1px solid hsl(0 84% 51% / 0.2)",
//             color: "hsl(0 84% 51%)",
//           }}
//         >
//           ⚠ {error}
//         </div>
//       )}

//       <div
//         id="reader"
//         className="overflow-hidden rounded-xl"
//         style={{
//           width: "100%",
//           minHeight: 300,
//         }}
//       />
//     </div>
//   );
// }
