import { Camera, Keyboard, Link as LinkIcon, ScanBarcode } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ScannerSession } from "../lib/types";
import { loadScannerSession, sendScannerBarcode } from "../modules/scanner/services/scanner-service";

type BarcodeDetectorWithDetect = {
  detect(source: ImageBitmapSource): Promise<Array<{ rawValue?: string }>>;
};

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorWithDetect;

function getBarcodeDetector(): BarcodeDetectorCtor | null {
  return "BarcodeDetector" in window ? (window.BarcodeDetector as BarcodeDetectorCtor) : null;
}

export function ScannerPage() {
  const [searchParams] = useSearchParams();
  const initialSession = searchParams.get("session") ?? "";
  const [sessionId, setSessionId] = useState(initialSession);
  const [session, setSession] = useState<ScannerSession | null>(null);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState("Conecte-se a uma sessão ativa para usar este dispositivo como leitor remoto.");
  const [manualBarcode, setManualBarcode] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [scanFlash, setScanFlash] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLockRef = useRef(false);

  useEffect(() => {
    async function validateSession() {
      if (!sessionId) {
        setConnected(false);
        return;
      }

      try {
        const session = await loadScannerSession(sessionId);
        setSession(session);

        if (session.status !== "open" || new Date(session.expiresAt).getTime() <= Date.now()) {
          setMessage("Esta sessão não está mais ativa.");
          setConnected(false);
          return;
        }

        setConnected(true);
        setMessage(`Sessão ${session.pairingCode} conectada. Posicione a câmera sobre o código de barras.`);
      } catch {
        setConnected(false);
        setMessage("Sessão não encontrada. Confira o código de conexão.");
      }
    }

    void validateSession();
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const timer = window.setInterval(async () => {
      try {
        const nextSession = await loadScannerSession(sessionId);
        setSession(nextSession);
        if (nextSession.status !== "open" || new Date(nextSession.expiresAt).getTime() <= Date.now()) {
          setConnected(false);
          setMessage("A sessão expirou ou foi encerrada no caixa.");
        }
      } catch {
        setConnected(false);
      }
    }, 4000);

    return () => window.clearInterval(timer);
  }, [sessionId]);

  useEffect(() => {
    async function startCamera() {
      if (!connected || !videoRef.current) {
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" }
          },
          audio: false
        });

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      } catch {
        setMessage("Não foi possível abrir a câmera. Você ainda pode registrar o código manualmente.");
      }
    }

    void startCamera();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraReady(false);
    };
  }, [connected]);

  useEffect(() => {
    const BarcodeDetectorImpl = getBarcodeDetector();
    if (!connected || !cameraReady || !videoRef.current || !BarcodeDetectorImpl) {
      return;
    }

    const detector = new BarcodeDetectorImpl({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"]
    });

    const timer = window.setInterval(async () => {
      if (!videoRef.current || scanLockRef.current) {
        return;
      }

      try {
        const codes = await detector.detect(videoRef.current);
        const barcode = codes[0]?.rawValue?.trim();
        if (!barcode) {
          return;
        }

        scanLockRef.current = true;
        await sendScannerBarcode(sessionId, barcode);
        setMessage(`Código ${barcode} enviado com sucesso para o caixa.`);
        setScanFlash(true);
        if ("vibrate" in navigator) {
          navigator.vibrate(120);
        }
        try {
          const audioContext = new AudioContext();
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();
          oscillator.type = "sine";
          oscillator.frequency.value = 880;
          oscillator.connect(gain);
          gain.connect(audioContext.destination);
          gain.gain.value = 0.05;
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.08);
          window.setTimeout(() => {
            void audioContext.close();
          }, 120);
        } catch {
          // Silent fallback when Web Audio is unavailable.
        }
        window.setTimeout(() => setScanFlash(false), 250);
        window.setTimeout(() => {
          scanLockRef.current = false;
        }, 1800);
      } catch {
        // Keep scanner running quietly between frames.
      }
    }, 900);

    return () => {
      window.clearInterval(timer);
    };
  }, [cameraReady, connected, sessionId]);

  async function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sessionId || !manualBarcode.trim()) {
      return;
    }

    try {
      await sendScannerBarcode(sessionId, manualBarcode.trim());
      setMessage(`Código ${manualBarcode.trim()} enviado com sucesso para o caixa.`);
      setScanFlash(true);
      if ("vibrate" in navigator) {
        navigator.vibrate(120);
      }
      window.setTimeout(() => setScanFlash(false), 250);
      setManualBarcode("");
    } catch {
      setMessage("Não foi possível enviar o código agora.");
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 py-8 text-ink">
      <div className="mx-auto grid max-w-3xl gap-6">
        <header className="rounded-[28px] border border-brand-100 bg-white/90 p-6 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-700">Scanner remoto</p>
          <h1 className="mt-2 text-3xl font-bold text-brand-900">Usar este dispositivo como leitor de código de barras</h1>
          <p className="mt-2 text-sm text-slate-600">
            Abra esta tela no dispositivo móvel, conecte-se à sessão do caixa e envie leituras em tempo real para a venda em aberto.
          </p>
        </header>

        <section className="rounded-[28px] border border-brand-100 bg-white/90 p-6 shadow-soft">
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Código ou identificador da sessão
              <input
                className="rounded-2xl border border-brand-100 bg-canvas px-4 py-3"
                value={sessionId}
                onChange={(event) => setSessionId(event.target.value)}
                placeholder="Cole aqui o identificador da sessão"
              />
            </label>
            {session ? (
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-canvas px-3 py-2 font-medium text-brand-900">
                  Sessão: {session.pairingCode}
                </span>
                <span className="rounded-full bg-canvas px-3 py-2 font-medium text-brand-900">
                  Expira: {new Date(session.expiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ) : null}
            <div className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">{message}</div>
          </div>
        </section>

        <section className="rounded-[28px] border border-brand-100 bg-white/90 p-6 shadow-soft">
          <div className="mb-4 flex items-center gap-2 text-brand-900">
            <Camera className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Leitura por câmera</h2>
          </div>
          <div className={scanFlash ? "overflow-hidden rounded-[28px] bg-emerald-500 ring-4 ring-emerald-300" : "overflow-hidden rounded-[28px] bg-brand-900"}>
            <video ref={videoRef} className="aspect-[3/4] w-full object-cover" muted playsInline />
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Em navegadores compatíveis com `BarcodeDetector`, a leitura acontece automaticamente com feedback tátil e visual.
          </p>
        </section>

        <section className="rounded-[28px] border border-brand-100 bg-white/90 p-6 shadow-soft">
          <div className="mb-4 flex items-center gap-2 text-brand-900">
            <Keyboard className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Registro manual</h2>
          </div>
          <form className="grid gap-3" onSubmit={handleManualSubmit}>
            <input
              className="rounded-2xl border border-brand-100 bg-canvas px-4 py-3"
              value={manualBarcode}
              onChange={(event) => setManualBarcode(event.target.value)}
              placeholder="Digite o código de barras"
            />
            <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 font-medium text-white" type="submit">
              <ScanBarcode className="h-4 w-4" />
              Enviar leitura
            </button>
          </form>
        </section>

        <section className="rounded-[28px] border border-brand-100 bg-white/90 p-6 shadow-soft text-sm text-slate-600">
          <div className="mb-3 flex items-center gap-2 text-brand-900">
            <LinkIcon className="h-4 w-4" />
            <strong>Como usar</strong>
          </div>
          <p>1. No caixa, inicie uma sessão de leitor remoto.</p>
          <p>2. No dispositivo móvel, acesse este mesmo app e abra `/scanner`.</p>
          <p>3. Cole o identificador da sessão ou use o link gerado no caixa.</p>
          <p>4. Leia o código de barras pela câmera ou registre o código manualmente.</p>
        </section>
      </div>
    </div>
  );
}
