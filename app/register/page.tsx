"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import FaceCamera, { FaceResult } from "../components/FaceCamera";
import { saveFaceProfile } from "../../lib/faceDB";
import { isSupabaseConfigured } from "../../lib/supabase";

type Step = "guide" | "camera" | "processing" | "done";
const STEPS: Step[] = ["guide", "camera", "processing", "done"];

export default function RegisterPage() {
  const [step,       setStep]       = useState<Step>("guide");
  const [name,       setName]       = useState("");
  const [nameError,  setNameError]  = useState("");
  const [faceResult, setFaceResult] = useState<FaceResult>({ detected: false, count: 0, score: 0 });
  const [countdown,  setCountdown]  = useState<number | null>(null);
  const [saveError,  setSaveError]  = useState("");

  // 가장 최근 descriptor 를 ref 로 보관 (stale closure 방지)
  const latestDescRef   = useRef<Float32Array | null>(null);
  const capturedDescRef = useRef<Float32Array | null>(null);
  const countdownTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const savingRef       = useRef(false);
  // ← 핵심: 항상 최신 step 을 반영하는 ref (handleFaceResult stale closure 방지)
  const stepRef         = useRef<Step>("guide");

  const stepIndex = STEPS.indexOf(step);

  // stepRef 를 state 와 동기화
  useEffect(() => { stepRef.current = step; }, [step]);

  // ── camera 단계에서 벗어나면 카운트다운 타이머를 즉시 정리 ───────────
  // (비동기 감지 루프가 step 변경 후에도 한 번 더 실행돼 새 타이머를 시작하는 것을 차단)
  useEffect(() => {
    if (step !== "camera" && countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
      setCountdown(null);
    }
  }, [step]);

  // ── 얼굴 감지 콜백 ─────────────────────────────────────────────────────
  // deps 에 step 을 넣지 않고 stepRef 를 사용 → stale closure 원천 차단
  const handleFaceResult = useCallback(
    (result: FaceResult) => {
      setFaceResult(result);
      if (result.descriptor) latestDescRef.current = result.descriptor;

      // stepRef.current 로 항상 최신 step 확인
      if (stepRef.current !== "camera") return;

      if (result.detected && result.score > 0.5 && !countdownTimer.current) {
        // 감지 시작 → 카운트다운 3→2→1
        let count = 3;
        setCountdown(count);
        countdownTimer.current = setInterval(() => {
          count--;
          if (count <= 0) {
            clearInterval(countdownTimer.current!);
            countdownTimer.current = null;
            setCountdown(null);

            // 타이머 종료 시점에 다시 한번 step 확인
            if (stepRef.current !== "camera") return;

            const desc = latestDescRef.current;
            if (desc) {
              capturedDescRef.current = desc;
              setStep("processing");
            }
          } else {
            setCountdown(count);
          }
        }, 500);
      } else if (!result.detected && countdownTimer.current) {
        // 얼굴 사라지면 타이머 취소
        clearInterval(countdownTimer.current);
        countdownTimer.current = null;
        setCountdown(null);
      }
    },
    [] // step 의존성 제거 → 함수가 재생성되지 않음 (stepRef 로 실시간 참조)
  );

  // ── Processing 단계: Supabase 저장 ────────────────────────────────────
  useEffect(() => {
    if (step !== "processing") {
      savingRef.current = false; // 다른 단계로 나가면 플래그 초기화
      return;
    }

    // 이미 저장 진행 중이면 중복 실행 차단 (StrictMode 2회 실행 대응)
    if (savingRef.current) return;
    savingRef.current = true;

    const descriptor = capturedDescRef.current;
    if (!descriptor) { setStep("camera"); return; }

    (async () => {
      try {
        setSaveError("");
        await saveFaceProfile(name, descriptor);
        setStep("done");
      } catch (e: unknown) {
        setSaveError(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다");
        savingRef.current = false;
        setTimeout(() => setStep("camera"), 2500);
      }
    })();
  }, [step, name]);

  // ── 언마운트 시 타이머 정리 ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    };
  }, []);

  const supabaseOk = isSupabaseConfigured();

  return (
    <div className="min-h-screen bg-[#080d1a] flex flex-col max-w-md mx-auto px-5 pb-10">

      {/* Header */}
      <header className="flex items-center gap-4 pt-10 pb-6">
        <Link href="/"
          className="w-9 h-9 rounded-xl bg-[#131929] border border-white/10 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-white font-semibold text-base">얼굴 등록</h1>
          <p className="text-slate-500 text-xs">Face Registration</p>
        </div>
        <span className="text-slate-500 text-xs">{stepIndex + 1} / {STEPS.length}</span>
      </header>

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="h-1 flex-1 rounded-full transition-all duration-500"
            style={{ background: i <= stepIndex ? "#3B82F6" : "rgba(255,255,255,0.08)" }} />
        ))}
      </div>

      {/* Supabase 미설정 경고 */}
      {!supabaseOk && (
        <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3">
          <span className="text-amber-400 text-lg shrink-0">⚠️</span>
          <div>
            <p className="text-amber-300 text-sm font-medium">.env.local 파일이 필요합니다</p>
            <p className="text-amber-400/70 text-xs mt-0.5">
              .env.local.example 을 복사해 Supabase 키를 입력하세요
            </p>
          </div>
        </div>
      )}

      {/* ── Step: Guide + 이름 입력 ── */}
      {step === "guide" && (
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-white">등록 안내</h2>
            <p className="text-slate-400 text-sm mt-1">이름을 입력하고 얼굴을 등록하세요</p>
          </div>

          {/* 이름 입력 */}
          <div className="space-y-2">
            <label className="text-slate-300 text-sm font-medium">이름</label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError(""); }}
                placeholder="홍길동"
                maxLength={20}
                className="w-full bg-[#0f1629] border border-white/10 rounded-xl px-4 py-4 text-white placeholder-slate-600
                           focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
              />
              {name && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
            {nameError && <p className="text-red-400 text-xs">{nameError}</p>}
          </div>

          {/* 안내사항 */}
          <div className="space-y-3">
            {[
              { icon: "💡", title: "밝은 환경에서 촬영", desc: "조명이 얼굴을 고르게 비추는 곳에서 촬영하세요" },
              { icon: "👁️", title: "정면을 바라보세요",   desc: "카메라를 정면으로 응시하고 눈을 크게 뜨세요" },
              { icon: "🚫", title: "안경·마스크 제거",    desc: "얼굴 특징점 추출에 방해되는 물건을 제거하세요" },
            ].map((tip) => (
              <div key={tip.title} className="flex items-start gap-4 bg-[#0f1629] border border-white/5 rounded-xl p-4">
                <span className="text-xl shrink-0">{tip.icon}</span>
                <div>
                  <p className="text-white text-sm font-medium">{tip.title}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              if (!name.trim()) { setNameError("이름을 입력해 주세요"); return; }
              setStep("camera");
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold
                       rounded-2xl py-5 shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
          >
            카메라 시작
          </button>
        </div>
      )}

      {/* ── Step: Camera ── */}
      {step === "camera" && (
        <div className="flex flex-col gap-5">
          <div className="text-center">
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">등록 대상</p>
            <h2 className="text-xl font-bold text-white">{name}</h2>
            <p className="text-slate-400 text-sm mt-1">얼굴이 감지되면 자동으로 촬영됩니다</p>
          </div>

          <div className="relative">
            <FaceCamera onResult={handleFaceResult} active={step === "camera"} />

            {/* 카운트다운 오버레이 */}
            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-20 h-20 rounded-full bg-blue-600/75 backdrop-blur-sm
                               flex items-center justify-center border-2 border-blue-400">
                  <span className="text-white text-4xl font-bold">{countdown}</span>
                </div>
              </div>
            )}
          </div>

          {/* 실시간 정보 */}
          <div className="bg-[#0f1629] border border-white/5 rounded-xl p-4 space-y-3">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">실시간 감지</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-500 text-xs">상태</p>
                <p className={`text-sm font-semibold mt-0.5 ${faceResult.detected ? "text-blue-400" : "text-slate-500"}`}>
                  {faceResult.detected ? "✓ 얼굴 감지됨" : "— 대기 중"}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">신뢰도</p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {faceResult.detected ? `${Math.round(faceResult.score * 100)}%` : "—"}
                </p>
              </div>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.round(faceResult.score * 100)}%` }} />
            </div>
            <p className="text-slate-600 text-xs">
              {faceResult.descriptor ? "✓ 얼굴 벡터 추출 완료" : "벡터 추출 중..."}
            </p>
          </div>
        </div>
      )}

      {/* ── Step: Processing (Supabase 저장) ── */}
      {step === "processing" && (
        <div className="flex flex-col items-center gap-6 mt-4">
          {saveError ? (
            <>
              <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-white font-semibold">저장 실패</p>
                <p className="text-red-400 text-sm mt-1">{saveError}</p>
                <p className="text-slate-500 text-xs mt-1">카메라로 돌아갑니다...</p>
              </div>
            </>
          ) : (
            <>
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 animate-spin text-blue-500" viewBox="0 0 100 100" fill="none">
                  <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="8"
                    strokeLinecap="round" strokeDasharray="276" strokeDashoffset="180" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                    <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 5.75 5.75 0 011.043 11.095H6.75z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <h2 className="text-xl font-bold text-white">Supabase 저장 중</h2>
                <p className="text-slate-400 text-sm mt-1">{name}님의 얼굴 데이터를 암호화해 저장합니다</p>
              </div>

              <div className="w-full space-y-3">
                {[
                  "128차원 얼굴 벡터 추출",
                  "데이터 암호화",
                  "Supabase 데이터베이스 저장",
                ].map((label) => (
                  <div key={label} className="flex items-center justify-between bg-[#0f1629] border border-white/5 rounded-xl p-4">
                    <span className="text-slate-300 text-sm">{label}</span>
                    <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step: Done ── */}
      {step === "done" && (
        <div className="flex flex-col items-center gap-6 mt-4">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <svg className="w-14 h-14 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/40">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">등록 완료!</h2>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              <span className="text-blue-400 font-medium">{name}</span>님의 얼굴이<br />
              데이터베이스에 안전하게 저장됐어요
            </p>
          </div>

          <div className="w-full bg-[#0f1629] border border-white/5 rounded-2xl p-5 space-y-3">
            {[
              { label: "등록자",       value: name },
              { label: "특징점 수",    value: "128차원 벡터" },
              { label: "저장소",       value: "Supabase PostgreSQL" },
              { label: "암호화",       value: "전송 중 TLS 1.3" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-slate-500 text-sm">{label}</span>
                <span className="text-white text-sm font-medium">{value}</span>
              </div>
            ))}
          </div>

          <div className="w-full flex gap-3">
            <button
              onClick={() => { setStep("guide"); setName(""); }}
              className="flex-1 bg-[#0f1629] border border-white/10 text-slate-300 font-medium
                         rounded-2xl py-4 text-sm active:scale-95 transition-transform"
            >
              추가 등록
            </button>
            <Link href="/"
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold
                         rounded-2xl py-4 text-sm text-center shadow-lg shadow-emerald-500/20
                         active:scale-95 transition-transform block">
              홈으로
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
