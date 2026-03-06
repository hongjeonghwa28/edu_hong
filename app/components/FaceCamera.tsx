"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ── Public Types ─────────────────────────────────────────────────────────────

export interface FaceResult {
  detected: boolean;
  count: number;
  score: number;          // 탐지 신뢰도 0~1
  descriptor?: Float32Array; // 128-dim 얼굴 임베딩 (첫 번째 얼굴)
}

interface Props {
  onResult?: (result: FaceResult) => void;
  active?: boolean; // false 면 감지 루프 정지
}

// ── 랜드마크 그룹 (68-point) ─────────────────────────────────────────────────
const LANDMARK_GROUPS = [
  { range: [0,  17], color: "#60A5FA", close: false }, // 턱선
  { range: [17, 22], color: "#818CF8", close: false }, // 왼쪽 눈썹
  { range: [22, 27], color: "#818CF8", close: false }, // 오른쪽 눈썹
  { range: [27, 31], color: "#34D399", close: false }, // 코 등
  { range: [31, 36], color: "#34D399", close: true  }, // 콧구멍
  { range: [36, 42], color: "#F472B6", close: true  }, // 왼쪽 눈
  { range: [42, 48], color: "#F472B6", close: true  }, // 오른쪽 눈
  { range: [48, 60], color: "#FBBF24", close: true  }, // 입 외곽
  { range: [60, 68], color: "#FDE68A", close: true  }, // 입술 내부
];

// ── Canvas 렌더링 ────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawDetections(ctx: CanvasRenderingContext2D, detections: any[]) {
  detections.forEach(({ detection, landmarks }) => {
    const { x, y, width: w, height: h } = detection.box;

    // 바운딩 박스
    ctx.save();
    ctx.strokeStyle = "#3B82F6";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "#3B82F6";
    ctx.shadowBlur = 14;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();

    // 모서리 강조
    const c = Math.min(w, h) * 0.14;
    ctx.save();
    ctx.strokeStyle = "#93C5FD";
    ctx.lineWidth = 3;
    [
      [x,     y,     x + c, y,     x,     y + c],
      [x+w-c, y,     x + w, y,     x + w, y + c],
      [x,     y+h-c, x,     y + h, x + c, y + h],
      [x+w-c, y+h,   x + w, y + h, x + w, y+h-c],
    ].forEach(([x1,y1,x2,y2,x3,y3]) => {
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.lineTo(x3,y3); ctx.stroke();
    });
    ctx.restore();

    // 신뢰도 뱃지
    const score = Math.round(detection.score * 100);
    ctx.save();
    ctx.fillStyle = "#1D4ED8";
    ctx.beginPath(); ctx.roundRect(x, y - 24, 64, 20, 4); ctx.fill();
    ctx.fillStyle = "#BFDBFE";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(`face ${score}%`, x + 5, y - 9);
    ctx.restore();

    // 랜드마크
    if (!landmarks) return;
    const pts: { x: number; y: number }[] = landmarks.positions;

    LANDMARK_GROUPS.forEach(({ range: [s, e], color, close }) => {
      const group = pts.slice(s, e);
      if (!group.length) return;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      group.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      if (close) ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      group.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI*2); ctx.fill(); });
      ctx.restore();
    });
  });
}

// ── Component ────────────────────────────────────────────────────────────────
export default function FaceCamera({ onResult, active = true }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef   = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faceapiRef = useRef<any>(null);

  type Status = "loading_model" | "waiting_camera" | "ready" | "error";
  const [status,   setStatus]   = useState<Status>("loading_model");
  const [errorMsg, setErrorMsg] = useState("");
  const [faceCount,setFaceCount]= useState(0);

  // ── 초기화: 모델 로드 + 카메라 획득 ─────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // SSR 안전 dynamic import
        const faceapi = await import("@vladmandic/face-api");
        faceapiRef.current = faceapi;

        // 세 모델 병렬 로드 (탐지 + 랜드마크 + 인식)
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        ]);

        if (!mounted) return;
        setStatus("waiting_camera");

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current && mounted) {
          videoRef.current.srcObject = stream;
          setStatus("ready");
        }
      } catch (e: unknown) {
        if (!mounted) return;
        setStatus("error");
        if (e instanceof Error) {
          const msgs: Record<string, string> = {
            NotAllowedError: "카메라 권한이 거부되었습니다",
            NotFoundError:   "카메라를 찾을 수 없습니다",
          };
          setErrorMsg(msgs[e.name] ?? e.message);
        }
      }
    })();

    return () => {
      mounted = false;
      loopRef.current = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ── 감지 루프 ─────────────────────────────────────────────────────────────
  const runDetection = useCallback(async () => {
    const faceapi = faceapiRef.current;
    const video   = videoRef.current;
    const canvas  = canvasRef.current;
    if (!faceapi || !video || !canvas || video.readyState < 2) return;

    // 캔버스를 소스 해상도에 동기화
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const detections = await faceapi
      .detectAllFaces(
        video,
        new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.45, inputSize: 416 })
      )
      .withFaceLandmarks(true)
      .withFaceDescriptors(); // ← 128-dim 임베딩 추출

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawDetections(ctx, detections);

    const count      = detections.length;
    const score      = count > 0 ? detections[0].detection.score : 0;
    const descriptor = count > 0 ? detections[0].descriptor as Float32Array : undefined;

    setFaceCount(count);
    onResult?.({ detected: count > 0, count, score, descriptor });
  }, [onResult]);

  // ── active prop 으로 루프 제어 ────────────────────────────────────────────
  useEffect(() => {
    if (status !== "ready") return;
    loopRef.current = active;
    if (!active) return;

    let cancelled = false;
    const loop = async () => {
      if (cancelled || !loopRef.current) return;
      await runDetection();
      if (!cancelled && loopRef.current) setTimeout(loop, 150); // ~6fps (recognition 부하 고려)
    };
    loop();

    return () => { cancelled = true; loopRef.current = false; };
  }, [status, active, runDetection]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-[#080d1a]"
         style={{ aspectRatio: "4/3" }}>

      {/* 미러(셀피) 처리 – video + canvas 동시 반전 */}
      <div className="absolute inset-0" style={{ transform: "scaleX(-1)" }}>
        <video
          ref={videoRef}
          autoPlay muted playsInline
          className="w-full h-full object-cover"
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
        />
      </div>

      {/* 스캔 프레임 모서리 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-3 left-3  w-6 h-6 border-t-2 border-l-2 border-blue-400 rounded-tl-lg" />
        <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-blue-400 rounded-tr-lg" />
        <div className="absolute bottom-3 left-3  w-6 h-6 border-b-2 border-l-2 border-blue-400 rounded-bl-lg" />
        <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-blue-400 rounded-br-lg" />
      </div>

      {/* 얼굴 감지 상태 배지 */}
      {status === "ready" && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
          {faceCount > 0 ? (
            <div className="flex items-center gap-1.5 bg-blue-600/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-blue-400/40">
              <div className="w-2 h-2 rounded-full bg-blue-300 animate-pulse" />
              <span className="text-white text-xs font-medium">얼굴 {faceCount}개 감지됨</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10">
              <div className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="text-slate-300 text-xs">얼굴을 프레임에 맞춰주세요</span>
            </div>
          )}
        </div>
      )}

      {/* 로딩 오버레이 */}
      {(status === "loading_model" || status === "waiting_camera") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#080d1a]">
          <div className="relative w-14 h-14">
            <svg className="w-14 h-14 animate-spin text-blue-500" viewBox="0 0 56 56" fill="none">
              <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4"
                strokeLinecap="round" strokeDasharray="120" strokeDashoffset="80" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-white text-sm font-medium">
              {status === "loading_model" ? "AI 모델 로딩 중..." : "카메라 연결 중..."}
            </p>
            <p className="text-slate-500 text-xs mt-1">잠시만 기다려 주세요</p>
          </div>
        </div>
      )}

      {/* 에러 오버레이 */}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0a0d1a] px-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="text-white text-sm font-medium">카메라 오류</p>
            <p className="text-slate-400 text-xs mt-1">{errorMsg}</p>
          </div>
          <button onClick={() => window.location.reload()}
            className="text-blue-400 text-xs underline underline-offset-2">
            다시 시도
          </button>
        </div>
      )}
    </div>
  );
}
