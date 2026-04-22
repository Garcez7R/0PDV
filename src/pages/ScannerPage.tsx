import { Camera, Keyboard, Link as LinkIcon, QrCode, ScanBarcode } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ScannerSession } from "../lib/types";
import { loadScannerSession, sendScannerBarcode } from "../modules/scanner/services/scanner-service";
import { BrandWordmark } from "../shared/components/BrandWordmark";

type BarcodeDetectorResult = {
  rawValue?: string;
};

type BarcodeDetectorWithDetect = {
  detect(source: ImageBitmapSource): Promise<BarcodeDetectorResult[]>;
};

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorWithDetect;

type CameraMode = "pairing" | "barcode" | null;

function getBarcodeDetector(): BarcodeDetectorCtor | null {
  return "BarcodeDetector" in window ? (window.BarcodeDetector as BarcodeDetectorCtor) : null;
}

function extractSessionId(rawValue: string) {
  const normalized = rawValue.trim();
  if (!normalized) {
    return "";
  }

  try {
    const url = new URL(normalized);
    return url.searchParams.get("session") ?? normalized;
  } catch {
    return normalized;
  }
}

export function ScannerPage() {
  const [searchParams] = useSearchParams();
  const initialSession = searchParams.get("session") ?? "";
  const [sessionId, setSessionId] = useState(initialSession);
  const [session, setSession] = useState<ScannerSession | null>(null);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState("Conecte este dispositivo a um caixa ativo para iniciar o leitor remoto.");
  const [manualBarcode, setManualBarcode] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>(null);
  const [cameraError, setCameraError] = useState("");
  const [scanFlash, setScanFlash] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLockRef = useRef(false);
  const barcodeDetector = useMemo(() => getBarcodeDetector(), []);

  useEffect(() => {
    async function validateSession() {
      if (!sessionId) {
        setSession(null);
        setConnected(false);
        return;
      }

      try {
        const nextSession = await loadScannerSession(sessionId);
        setSession(nextSession);

        if (nextSession.status !== "open" || new Date(nextSession.expiresAt).getTime() <= Date.now()) {
          setMessage("Esta sessão não está mais ativa. Gere um novo pareamento no caixa.");
          setConnected(false);
          return;
        }

        setConnected(true);
        setMessage(`Caixa ${nextSession.pairingCode} conectado. Agora você pode ler códigos de barras em tempo real.`);
      } catch {
        setConnected(false);
        setSession(null);
        setMessage("Sessão não encontrada. Leia novamente o QR do caixa ou informe o código manualmente.");
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
          setCameraMode(null);
          setMessage("A sessão expirou ou foi encerrada no caixa.");
          stopCamera();
        }
      } catch {
        setConnected(false);
      }
    }, 4000);

    return () => window.clearInterval(timer);
  }, [sessionId]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (!barcodeDetector || !cameraReady || !videoRef.current || !cameraMode) {
      return;
    }

    const formats =
      cameraMode === "pairing"
        ? ["qr_code"]
        : ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"];
    const detector = new barcodeDetector({ formats });

    const timer = window.setInterval(async () => {
      if (!videoRef.current || scanLockRef.current) {
        return;
      }

      try {
        const codes = await detector.detect(videoRef.current);
        const rawValue = codes[0]?.rawValue?.trim();
        if (!rawValue) {
          return;
        }

        scanLockRef.current = true;

        if (cameraMode === "pairing") {
          const nextSessionId = extractSessionId(rawValue);
          if (!nextSessionId) {
            setMessage("QR Code lido, mas sem identificador de sessão válido.");
            releaseScanLock();
            return;
          }

          setSessionId(nextSessionId);
          setCameraMode(null);
          stopCamera();
          setMessage("Pareamento concluído. Validando sessão do caixa...");
          flashSuccess(false);
          releaseScanLock(1400);
          return;
        }

        await sendScannerBarcode(sessionId, rawValue);
        setMessage(`Código ${rawValue} enviado com sucesso para o caixa.`);
        flashSuccess(true);
        releaseScanLock(1800);
      } catch {
        // Keep scanner active between frames without surfacing noisy errors.
      }
    }, 900);

    return () => {
      window.clearInterval(timer);
    };
  }, [barcodeDetector, cameraMode, cameraReady, sessionId]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }

  function flashSuccess(withAudio: boolean) {
    setScanFlash(true);
    if ("vibrate" in navigator) {
      navigator.vibrate(120);
    }
    if (withAudio) {
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
    }
    window.setTimeout(() => setScanFlash(false), 250);
  }

  function releaseScanLock(delay = 1200) {
    window.setTimeout(() => {
      scanLockRef.current = false;
    }, delay);
  }

  async function startCamera(nextMode: Exclude<CameraMode, null>) {
    if (!videoRef.current) {
      return;
    }

    setCameraError("");

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      videoRef.current.setAttribute("playsinline", "true");
      await videoRef.current.play();
      setCameraMode(nextMode);
      setCameraReady(true);

      if (nextMode === "pairing") {
        setMessage("Aponte a câmera para o QR Code exibido no caixa ou tablet.");
      } else {
        setMessage("Câmera pronta. Posicione o código de barras no centro da imagem.");
      }
    } catch {
      setCameraError("Não foi possível acessar a câmera neste navegador. Você ainda pode informar os dados manualmente.");
      setMessage("A câmera não pôde ser iniciada. Verifique a permissão do navegador.");
      setCameraMode(null);
    }
  }

  async function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sessionId || !manualBarcode.trim()) {
      return;
    }

    try {
      await sendScannerBarcode(sessionId, manualBarcode.trim());
      setMessage(`Código ${manualBarcode.trim()} enviado com sucesso para o caixa.`);
      flashSuccess(false);
      setManualBarcode("");
    } catch {
      setMessage("Não foi possível enviar o código agora.");
    }
  }

  function handleSessionInputChange(value: string) {
    setSessionId(value);
    setConnected(false);
    setSession(null);
  }

  const canReadQr = Boolean(barcodeDetector);
  const canReadBarcode = Boolean(barcodeDetector);

  return (
    <div className="min-h-screen bg-canvas px-4 py-8 text-ink">
      <div className="mx-auto grid max-w-4xl gap-6">
        <header className="rounded-[28px] border border-brand-100 bg-white/90 p-6 shadow-soft">
          <BrandWordmark size="md" withTagline />
          <h1 className="mt-3 text-3xl font-bold text-brand-900">Pareamento e leitura no celular</h1>
          <p className="mt-2 text-sm text-slate-600">
            Use este dispositivo para parear com o caixa via QR Code e enviar leituras de código de barras em tempo real.
          </p>
        </header>

        <section className="rounded-[28px] border border-brand-100 bg-white/90 p-6 shadow-soft">
          <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
            <div className="grid gap-4">
              <div className="mb-1 flex items-center gap-2 text-brand-900">
                <QrCode className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Parear com o caixa</h2>
              </div>
              <p className="text-sm text-slate-600">
                No caixa ou tablet, abra a sessão do leitor remoto. Depois, aqui no celular, use o botão abaixo para ler o QR Code da sessão.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => void startCamera("pairing")}
                  disabled={!canReadQr}
                >
                  <Camera className="h-4 w-4" />
                  Ler QR do caixa
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-100 bg-white px-4 py-3 font-medium text-brand-900"
                  onClick={stopCamera}
                >
                  Parar câmera
                </button>
              </div>
              {!canReadQr ? (
                <p className="text-sm text-amber-700">
                  Este navegador não oferece leitura nativa de QR Code. Use o link gerado no caixa ou informe a sessão manualmente.
                </p>
              ) : null}
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Identificador da sessão
                <input
                  className="rounded-2xl border border-brand-100 bg-canvas px-4 py-3"
                  value={sessionId}
                  onChange={(event) => handleSessionInputChange(event.target.value)}
                  placeholder="Cole aqui o identificador ou a URL da sessão"
                />
              </label>
            </div>

            <div className="rounded-[24px] bg-canvas p-5">
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-white px-3 py-2 font-medium text-brand-900">
                  Conexão: {connected ? "Ativa" : "Aguardando pareamento"}
                </span>
                {session ? (
                  <>
                    <span className="rounded-full bg-white px-3 py-2 font-medium text-brand-900">
                      Sessão: {session.pairingCode}
                    </span>
                    <span className="rounded-full bg-white px-3 py-2 font-medium text-brand-900">
                      Expira: {new Date(session.expiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </>
                ) : null}
              </div>
              <div className="mt-4 rounded-2xl bg-white p-4 text-sm text-brand-900">{message}</div>
              {cameraError ? <p className="mt-3 text-sm text-red-600">{cameraError}</p> : null}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-brand-100 bg-white/90 p-6 shadow-soft">
          <div className="mb-4 flex items-center gap-2 text-brand-900">
            <Camera className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Câmera do dispositivo</h2>
          </div>
          <div className={scanFlash ? "overflow-hidden rounded-[28px] bg-emerald-500 ring-4 ring-emerald-300" : "overflow-hidden rounded-[28px] bg-brand-900"}>
            <video ref={videoRef} className="aspect-[3/4] w-full object-cover" muted playsInline />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void startCamera("barcode")}
              disabled={!connected || !canReadBarcode}
            >
              <ScanBarcode className="h-4 w-4" />
              Ler código de barras
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-100 bg-white px-4 py-3 font-medium text-brand-900"
              onClick={stopCamera}
            >
              Interromper leitura
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Primeiro pareie o dispositivo com o QR do caixa. Depois, ative a leitura de barras para enviar itens diretamente para a venda.
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
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={!connected}
            >
              <ScanBarcode className="h-4 w-4" />
              Enviar leitura
            </button>
          </form>
        </section>

        <section className="rounded-[28px] border border-brand-100 bg-white/90 p-6 shadow-soft text-sm text-slate-600">
          <div className="mb-3 flex items-center gap-2 text-brand-900">
            <LinkIcon className="h-4 w-4" />
            <strong>Como operar</strong>
          </div>
          <p>1. No PC ou tablet, abra o caixa e inicie uma sessão do leitor remoto.</p>
          <p>2. No celular, abra o 0PDV em `/scanner` e toque em "Ler QR do caixa".</p>
          <p>3. Aponte a câmera para o QR exibido na tela do caixa para parear os dispositivos.</p>
          <p>4. Depois do pareamento, toque em "Ler código de barras" e envie os itens para a venda.</p>
        </section>
      </div>
    </div>
  );
}
