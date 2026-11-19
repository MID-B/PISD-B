'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, Camera, CameraOff, CheckCircle2, LoaderCircle } from 'lucide-react';
import { RESET_CONFIRM_PASSWORD_KEY, RESET_EMAIL_KEY, RESET_NEW_PASSWORD_KEY } from '../../resetFlow';

type ChallengeId = 'left' | 'right' | 'up' | 'down' | 'blink';
type ScanState = 'idle' | 'loading' | 'scanning' | 'submitting' | 'success' | 'failed' | 'error';
type FaceResult = {
  face: Array<{
    faceScore?: number;
    boxScore?: number;
    live?: number;
    embedding?: number[];
    rotation?: { angle: { yaw: number; pitch: number } } | null;
  }>;
  gesture: Array<{ gesture: string }>;
};
type ModalState = 'success' | 'failed' | null;
type HumanModel = {
  load: () => Promise<void>;
  warmup?: () => Promise<unknown>;
  detect: (video: HTMLVideoElement) => Promise<FaceResult>;
};

const REQUIRED_CHALLENGES = 3;
const CHALLENGE_HOLD_DURATION_MS = 450;
const BLINK_CONFIRMATION_FRAMES = 2;
const degreesToRadians = (degrees: number) => degrees * (Math.PI / 180);
const TURN_YAW_THRESHOLD = degreesToRadians(12);
const TILT_PITCH_THRESHOLD = degreesToRadians(10);

const challengeDetails: Record<ChallengeId, { label: string; helper: string }> = {
  left: { label: 'Hadap kiri', helper: 'Putar wajah sedikit ke kiri.' },
  right: { label: 'Hadap kanan', helper: 'Putar wajah sedikit ke kanan.' },
  up: { label: 'Lihat atas', helper: 'Angkat kepala sedikit ke atas.' },
  down: { label: 'Lihat bawah', helper: 'Turunkan kepala sedikit ke bawah.' },
  blink: { label: 'Kedip', helper: 'Kedipkan salah satu mata satu kali.' },
};

function shuffleChallenges(): ChallengeId[] {
  const values: ChallengeId[] = ['left', 'right', 'up', 'down', 'blink'];
  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [values[index], values[target]] = [values[target], values[index]];
  }
  return values.slice(0, REQUIRED_CHALLENGES);
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value)
    && value.length > 0
    && value.every((item) => typeof item === 'number' && Number.isFinite(item));
}

export default function FaceVerificationPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const humanRef = useRef<HumanModel | null>(null);
  const frameRef = useRef<number | null>(null);
  const latestEmbeddingRef = useRef<number[] | null>(null);
  const detectingRef = useRef(false);
  const challengeOrderRef = useRef<ChallengeId[]>([]);
  const completedRef = useRef<ChallengeId[]>([]);
  const challengeStartedAtRef = useRef<number | null>(null);
  const challengeFramesRef = useRef(0);
  const horizontalCalibrationRef = useRef<{ challenge: 'left' | 'right'; direction: 'positive' | 'negative' } | null>(null);
  const mountedRef = useRef(true);

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [challengeOrder, setChallengeOrder] = useState<ChallengeId[]>([]);
  const [completedChallenges, setCompletedChallenges] = useState<ChallengeId[]>([]);
  const [prompt, setPrompt] = useState('Tekan Scanning untuk mengaktifkan kamera.');
  const [errorMessage, setErrorMessage] = useState('');
  const [faceStatus, setFaceStatus] = useState('Kamera belum aktif');
  const [modalState, setModalState] = useState<ModalState>(null);
  const [modalMessage, setModalMessage] = useState('');

  const stopCamera = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    detectingRef.current = false;
  }, []);

  const completePasswordReset = useCallback(async (embedding: number[]) => {
    stopCamera();
    setScanState('submitting');
    setFaceStatus('Wajah terdeteksi. Memeriksa kecocokan…');
    setErrorMessage('');
    latestEmbeddingRef.current = null;
    const email = window.localStorage.getItem(RESET_EMAIL_KEY);
    const password = window.sessionStorage.getItem(RESET_NEW_PASSWORD_KEY);
    if (!email || !password) {
      setScanState('failed');
      setModalMessage('Reset session expired. Please enter your email and new password again.');
      setModalState('failed');
      return;
    }

    try {
      const response = await fetch('/api/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', email, password, embedding }),
      });
      const result = await response.json() as { error?: string; code?: string };
      if (!response.ok) {
        setScanState('failed');
        setModalMessage(result.error ?? 'Your face could not be verified. Please scan again.');
        setModalState('failed');
        return;
      }

      // The server has already updated b2_register and its password trigger
      // before the success dialog is shown.
      window.localStorage.removeItem(RESET_EMAIL_KEY);
      window.sessionStorage.removeItem(RESET_NEW_PASSWORD_KEY);
      window.sessionStorage.removeItem(RESET_CONFIRM_PASSWORD_KEY);
      setScanState('success');
      setFaceStatus('Password berhasil diperbarui.');
      setModalMessage('Your password has been successfully updated, please return to the login menu.');
      setModalState('success');
    } catch {
      setScanState('failed');
      setModalMessage('The reset service could not be reached. Please check your connection and try again.');
      setModalState('failed');
    }
  }, [stopCamera]);

  const checkFrame = useCallback((result: FaceResult) => {
    const face = result.face[0];
    const gestures = result.gesture.map((entry) => String(entry.gesture));
    if (result.face.length !== 1 || !face) {
      setFaceStatus(result.face.length > 1 ? 'Hanya satu wajah boleh terlihat.' : 'Posisikan satu wajah ke dalam bingkai kamera.');
      challengeStartedAtRef.current = null;
      challengeFramesRef.current = 0;
      return;
    }

    const confidence = Math.round((face.faceScore ?? face.boxScore ?? 0) * 100);
    if (confidence < 60) {
      setFaceStatus('Pencahayaan atau fokus kamera belum cukup jelas.');
      challengeStartedAtRef.current = null;
      challengeFramesRef.current = 0;
      return;
    }
    if ((face.live ?? 0) < 0.6) {
      setFaceStatus('Tunggu kamera membaca wajah dengan jelas.');
      challengeStartedAtRef.current = null;
      challengeFramesRef.current = 0;
      return;
    }

    if (!isNumberArray(face.embedding)) {
      setFaceStatus('Model belum menghasilkan data wajah. Pastikan kamera dan model selesai dimuat.');
      challengeStartedAtRef.current = null;
      challengeFramesRef.current = 0;
      return;
    }

    latestEmbeddingRef.current = face.embedding;
    setFaceStatus('Wajah terlihat. Ikuti instruksi di kamera.');
    const target = challengeOrderRef.current.find((challenge) => !completedRef.current.includes(challenge));
    if (!target) return;

    const yaw = face.rotation?.angle.yaw ?? 0;
    const pitch = face.rotation?.angle.pitch ?? 0;
    const horizontalDirection = yaw >= TURN_YAW_THRESHOLD
      ? 'positive'
      : yaw <= -TURN_YAW_THRESHOLD ? 'negative' : null;
    let detected = false;

    if (target === 'blink') {
      detected = gestures.some((gesture) => gesture.startsWith('blink'));
    } else if (target === 'left' || target === 'right') {
      if (horizontalDirection) {
        const calibration = horizontalCalibrationRef.current;
        if (!calibration) detected = true;
        else {
          const expected = target === calibration.challenge
            ? calibration.direction
            : calibration.direction === 'positive' ? 'negative' : 'positive';
          detected = horizontalDirection === expected;
        }
      }
    } else if (target === 'up') {
      detected = gestures.includes('head up') || pitch <= -TILT_PITCH_THRESHOLD;
    } else {
      detected = gestures.includes('head down') || pitch >= TILT_PITCH_THRESHOLD;
    }

    let confirmed = false;
    if (!detected) {
      challengeStartedAtRef.current = null;
      challengeFramesRef.current = 0;
    } else if (target === 'blink') {
      challengeFramesRef.current += 1;
      confirmed = challengeFramesRef.current >= BLINK_CONFIRMATION_FRAMES;
    } else {
      challengeStartedAtRef.current ??= Date.now();
      confirmed = Date.now() - challengeStartedAtRef.current >= CHALLENGE_HOLD_DURATION_MS;
    }

    if (confirmed && !completedRef.current.includes(target)) {
      if ((target === 'left' || target === 'right') && horizontalDirection && !horizontalCalibrationRef.current) {
        horizontalCalibrationRef.current = { challenge: target, direction: horizontalDirection };
      }
      const nextCompleted = [...completedRef.current, target];
      completedRef.current = nextCompleted;
      setCompletedChallenges(nextCompleted);
      challengeStartedAtRef.current = null;
      challengeFramesRef.current = 0;
      const nextTarget = challengeOrderRef.current.find((challenge) => !nextCompleted.includes(challenge));
      if (nextTarget) setPrompt(`${challengeDetails[nextTarget].label}: ${challengeDetails[nextTarget].helper}`);
      else {
        const embedding = latestEmbeddingRef.current;
        if (embedding) void completePasswordReset(embedding);
        else {
          stopCamera();
          setScanState('failed');
          setModalMessage('The camera could not read your face. Please rescan.');
          setModalState('failed');
        }
      }
    }
  }, [completePasswordReset, stopCamera]);

  const startDetection = useCallback(() => {
    const loop = async () => {
      const video = videoRef.current;
      if (!video || !humanRef.current || !streamRef.current || !mountedRef.current) return;
      if (!detectingRef.current && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        detectingRef.current = true;
        try {
          checkFrame(await humanRef.current.detect(video));
        } catch {
          setErrorMessage('Model wajah gagal memproses kamera. Coba mulai lagi.');
        } finally {
          detectingRef.current = false;
        }
      }
      if (streamRef.current && mountedRef.current) frameRef.current = window.requestAnimationFrame(loop);
    };
    frameRef.current = window.requestAnimationFrame(loop);
  }, [checkFrame]);

  const startScan = useCallback(async () => {
    stopCamera();
    setModalState(null);
    setModalMessage('');
    setErrorMessage('');
    latestEmbeddingRef.current = null;
    setCompletedChallenges([]);
    completedRef.current = [];
    challengeStartedAtRef.current = null;
    challengeFramesRef.current = 0;
    horizontalCalibrationRef.current = null;
    const order = shuffleChallenges();
    challengeOrderRef.current = order;
    setChallengeOrder(order);
    setPrompt(`${challengeDetails[order[0]].label}: ${challengeDetails[order[0]].helper}`);

    if (!navigator.mediaDevices?.getUserMedia) {
      setScanState('error');
      setErrorMessage('Browser ini tidak mendukung akses kamera.');
      return;
    }

    try {
      setScanState('loading');
      setFaceStatus('Menyiapkan kamera dan model wajah…');
      const [humanModule, stream] = await Promise.all([
        // Load the browser ESM file directly. The package root resolves to its
        // Node build in Turbopack SSR, while this package has a broken subpath
        // export map for importing the browser file by its package name.
        import('../../../../node_modules/@vladmandic/human/dist/human.esm.js'),
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        }),
      ]);
      // The browser bundle exports Human as default, but its declaration file
      // only re-exports named types, so give the runtime default export its
      // constructor type here.
      const Human = (humanModule as unknown as {
        default: new (userConfig: never) => HumanModel;
      }).default;
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const config = {
        backend: 'webgl',
        debug: false,
        cacheModels: true,
        modelBasePath: 'https://vladmandic.github.io/human-models/models',
        filter: { enabled: true, equalization: true },
        face: {
          enabled: true,
          detector: { enabled: true, rotation: true, maxDetected: 1, minConfidence: 0.6 },
          mesh: { enabled: true },
          iris: { enabled: true },
          description: { enabled: false },
          insightface: {
            enabled: true,
            modelPath: 'https://vladmandic.github.io/insightface/models/insightface-mobilenet-swish.json',
            skipFrames: 1,
            skipTime: 0,
          },
          antispoof: { enabled: false },
          liveness: { enabled: true },
        },
        gesture: { enabled: true },
        body: { enabled: false },
        hand: { enabled: false },
        object: { enabled: false },
        segmentation: { enabled: false },
      };

      const human = new Human(config as never);
      humanRef.current = human;
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      await Promise.all([human.load(), Promise.resolve(human.warmup?.())]);
      if (!mountedRef.current) return;
      setScanState('scanning');
      setFaceStatus('Kamera aktif. Ikuti instruksi yang muncul.');
      startDetection();
    } catch (error) {
      stopCamera();
      setScanState('error');
      const message = error instanceof Error ? error.message : String(error);
      console.error('Face verification could not start:', error);
      const errorName = error instanceof DOMException ? error.name : '';
      if (errorName === 'NotAllowedError' || /permission|notallowed/i.test(message)) {
        setErrorMessage('Izin kamera belum diberikan. Izinkan akses kamera di browser lalu coba lagi.');
      } else if (errorName === 'NotFoundError' || /no camera|device not found/i.test(message)) {
        setErrorMessage('Kamera tidak ditemukan. Sambungkan atau pilih kamera yang tersedia lalu coba lagi.');
      } else if (errorName === 'NotReadableError' || /could not start video source/i.test(message)) {
        setErrorMessage('Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.');
      } else {
        setErrorMessage(`Model wajah gagal dimuat: ${message || 'Periksa koneksi internet dan dukungan WebGL browser.'}`);
      }
    }
  }, [startDetection, stopCamera]);

  useEffect(() => {
    mountedRef.current = true;
    if (!window.localStorage.getItem(RESET_EMAIL_KEY)
      || !window.sessionStorage.getItem(RESET_NEW_PASSWORD_KEY)) {
      router.replace('/forgot-password/update-password');
    }
    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, [router, stopCamera]);

  const activeChallenge = challengeOrder.find((challenge) => !completedChallenges.includes(challenge));

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-[#172033] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <section className="rounded-2xl border border-[#9bb4ff] bg-white p-5 shadow-[0_4px_18px_rgba(27,53,102,0.04)] sm:p-7">
          <p className="mb-2 text-base font-medium text-[#1769ff]">Secure identity scan</p>
          <h1 className="text-xl font-bold tracking-[-0.35px] text-black sm:text-2xl">Facial verification and liveness action</h1>
          <p className="mt-2 text-sm leading-6 text-[#202124]">Please complete the facial verification to finish the password reset process</p>
        </section>

        <section className="mx-auto mt-12 w-full max-w-3xl overflow-hidden rounded-2xl border border-[#91aaff] bg-white shadow-[0_4px_18px_rgba(27,53,102,0.06)]">
          <div className="flex h-11 items-center justify-between bg-[#e9edfb] px-5">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-[#3778ff]">Live identity input</p>
              <p className="text-xs font-bold text-[#1b3767]">Camera verification</p>
            </div>
            <span className="rounded-full border border-[#d5def2] bg-white px-3 py-0.5 text-[10px] font-medium uppercase text-[#1b3767]">
              {scanState === 'loading' || scanState === 'submitting' ? 'Memeriksa' : scanState === 'scanning' ? 'Memindai' : scanState === 'success' ? 'Terverifikasi' : scanState === 'failed' || scanState === 'error' ? 'Gagal' : 'Siap'}
            </span>
          </div>

          <div className="flex min-h-[500px] flex-col items-center justify-between px-5 py-8 sm:min-h-[560px] sm:py-12">
            <div className="relative grid size-[min(76vw,360px)] shrink-0 place-items-center rounded-full border-[12px] border-[#dce7ff] bg-[#101e36] shadow-[0_0_0_2px_#a8c2ff,0_0_42px_rgba(61,113,255,0.3)] sm:size-[360px]">
              <video
                ref={videoRef}
                muted
                playsInline
                className={`absolute inset-0 h-full w-full rounded-full object-cover ${scanState === 'scanning' ? 'scale-x-[-1] opacity-100' : 'opacity-0'}`}
              />
              {scanState !== 'scanning' && (
                <div className="relative z-10 max-w-[245px] px-5 text-center text-white">
                  {scanState === 'success' ? <CheckCircle2 className="mx-auto" size={28} /> : scanState === 'failed' ? <Ban className="mx-auto" size={28} /> : scanState === 'loading' || scanState === 'submitting' ? <LoaderCircle className="mx-auto animate-spin" size={28} /> : <Camera className="mx-auto" size={28} />}
                  <p className="mt-3 text-sm font-bold">{scanState === 'success' ? 'Password updated' : scanState === 'failed' ? 'Face verification failed' : scanState === 'loading' ? 'Menyiapkan kamera' : scanState === 'submitting' ? 'Memeriksa kecocokan wajah' : 'Camera not yet active'}</p>
                  <p className="mt-1 text-xs font-semibold text-[#c5cede]">{scanState === 'success' ? 'Password berhasil diperbarui.' : scanState === 'failed' ? 'Silakan periksa email atau pindai wajah kembali.' : scanState === 'loading' ? 'Memuat kamera dan model wajah…' : scanState === 'submitting' ? 'Tunggu sebentar…' : 'Click Scanning to grant camera access and load the model'}</p>
                </div>
              )}
              {scanState === 'scanning' && (
                <>
                  <div className="pointer-events-none absolute inset-[9%] rounded-full border-2 border-[#9dc7ff] shadow-[0_0_22px_rgba(71,166,255,0.7)]" />
                  {activeChallenge && (
                    <div className="absolute inset-x-5 top-8 rounded-xl border border-white/20 bg-[#061326]/85 p-3 text-center text-white shadow-lg">
                      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#9ed1ff]">Liveness {completedChallenges.length + 1}/{challengeOrder.length}</p>
                      <p className="mt-1 text-sm font-bold">{challengeDetails[activeChallenge].label}</p>
                      <p className="mt-0.5 text-[11px] text-[#dcefff]">{challengeDetails[activeChallenge].helper}</p>
                    </div>
                  )}
                  <p className="pointer-events-none absolute inset-x-5 bottom-7 rounded-xl bg-[#061326]/85 px-3 py-2 text-center text-[11px] font-semibold text-white">{faceStatus}</p>
                </>
              )}
            </div>

            <div className="mt-8 min-h-5 text-center text-xs font-medium text-[#52617d]" role="status" aria-live="polite">
              {scanState === 'scanning' ? prompt : scanState === 'submitting' ? faceStatus : ''}
            </div>
            {errorMessage && <p className="mt-1 text-center text-xs font-semibold text-red-600">{errorMessage}</p>}

            <div className="mt-5 flex w-full flex-wrap justify-center gap-4">
              <button
                type="button"
                onClick={() => { stopCamera(); router.push('/forgot-password/update-password'); }}
                className="inline-flex min-w-[190px] items-center justify-center gap-3 rounded-lg bg-[#dc3048] px-5 py-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c3263d]"
              >
                <Ban size={24} /> Cancel
              </button>
              {scanState === 'success' ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex min-w-[190px] items-center justify-center gap-3 rounded-lg bg-[#1762f5] px-5 py-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0e53dc]"
                >
                  <CheckCircle2 size={24} /> Verified
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void startScan()}
                  disabled={scanState === 'loading' || scanState === 'scanning' || scanState === 'submitting'}
                  className="inline-flex min-w-[190px] items-center justify-center gap-3 rounded-lg bg-[#1762f5] px-5 py-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0e53dc] disabled:cursor-wait disabled:opacity-75"
                >
                  {scanState === 'loading' || scanState === 'submitting' ? <LoaderCircle className="animate-spin" size={24} /> : scanState === 'scanning' ? <CameraOff size={24} /> : <Camera size={24} />}
                  {scanState === 'loading' ? 'Preparing' : scanState === 'submitting' ? 'Checking…' : scanState === 'scanning' ? 'Scanning…' : scanState === 'error' || scanState === 'failed' ? 'Try again' : 'Scanning'}
                </button>
              )}
            </div>
          </div>
        </section>
      </div>

      {modalState && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-white/55 px-4 backdrop-blur-md" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="face-result-title"
            aria-describedby="face-result-description"
            className="flex min-h-[420px] w-full max-w-3xl flex-col items-center justify-center rounded-2xl border border-[#cbd5e1] bg-white px-6 py-12 text-center shadow-[0_12px_50px_rgba(15,35,66,0.12)] sm:min-h-[480px] sm:px-12"
          >
            <div className={`grid size-14 place-items-center rounded-full ${modalState === 'success' ? 'bg-[#d1fae5] text-[#059669]' : 'bg-[#ff4b55] text-white'}`}>
              {modalState === 'success' ? <CheckCircle2 size={27} /> : <Ban size={27} />}
            </div>
            <h2 id="face-result-title" className="mt-8 text-3xl font-bold tracking-tight text-black sm:text-4xl">
              {modalState === 'success' ? 'Face Verification Success' : 'Face Verification Failed'}
            </h2>
            <p id="face-result-description" className="mt-4 max-w-2xl text-sm leading-6 text-[#202124]">
              {modalMessage}
            </p>
            <button
              type="button"
              onClick={() => {
                if (modalState === 'success') {
                  window.localStorage.removeItem(RESET_EMAIL_KEY);
                  window.sessionStorage.removeItem(RESET_NEW_PASSWORD_KEY);
                  window.sessionStorage.removeItem(RESET_CONFIRM_PASSWORD_KEY);
                  router.replace('/login');
                } else {
                  setModalState(null);
                  setScanState('idle');
                  setErrorMessage('');
                  setCompletedChallenges([]);
                  completedRef.current = [];
                  setPrompt('Tekan Scanning untuk mencoba verifikasi wajah lagi.');
                }
              }}
              className="mt-16 w-full max-w-[264px] rounded-xl bg-[#3B6FF5] px-8 py-5 text-sm font-extrabold tracking-wider text-white shadow-[0_8px_25px_rgba(59,111,245,0.4)] transition hover:bg-[#2B5CE5] active:scale-[0.99]"
            >
              OKE
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
