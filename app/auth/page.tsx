"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import FaceCamera, { FaceResult } from "../components/FaceCamera";
import { getAllProfiles, type FaceProfile } from "../../lib/faceDB";
import { findBestMatch, SIMILARITY_THRESHOLD, type MatchResult } from "../../lib/similarity";
import { isSupabaseConfigured } from "../../lib/supabase";

type Step = "loading_db" | "scan" | "verifying" | "success" | "fail";

// 일치율에 따른 색상
function similarityColor(sim: number): string {
  if (sim >= SIMILARITY_THRESHOLD) return "#34D399"; // 초록
  if (sim >= 70)                   return "#FBBF24"; // 노랑
  return                                  "#F87171"; // 빨강
}

export default function AuthPage() {
  const [step,       setStep]       = useState<Step>("loading_db");
  const [dbError,    setDbError]    = useState("");
  const [match,      setMatch]      = useState<MatchResult | null>(null);
  const [authResult, setAuthResult] = useState<MatchResult | null>(null);

  const profilesRef   = useRef<FaceProfile[]>([]);
  const authenticatedRef = useRef(false); // 중복 인증 방지

  // ── DB 프로필 로드 ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const profiles = await getAllProfiles();
        profilesRef.current = profiles;
        setStep("scan");
      } catch (e: unknown) {
        setDbError(e instanceof Error ? e.message : "데이터베이스 연결 오류");
        setStep("fail");
      }
    })();
  }, []);

  // ── 실시간 얼굴 비교 ───────────────────────────────────────────────────
  const handleFaceResult = useCallback(
    (result: FaceResult) => {
      if (step !== "scan" || authenticatedRef.current) return;
      if (!result.descriptor || profilesRef.current.length === 0) {
        setMatch(null);
        return;
      }

      const best = findBestMatch(result.descriptor, profilesRef.current);
      setMatch(best);

      // 90% 이상 → 인증 시작
      if (best && best.similarity >= SIMILARITY_THRESHOLD) {
        authenticatedRef.current = true;
        setAuthResult(best);
        setStep("verifying");
        // 검증 애니메이션 후 success
        setTimeout(() => setStep("success"), 2200);
      }
    },
    [step]
  );

  const supabaseOk    = isSupabaseConfigured();
  const noProfiles    = profilesRef.current.length === 0 && step === "scan";

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
          <h1 className="text-white font-semibold text-base">인증 시작</h1>
          <p className="text-slate-500 text-xs">Face Authentication</p>
        </div>
        <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-blue-400 text-xs font-medium">보안 세션</span>
        </div>
      </header>

      {/* Supabase 미설정 경고 */}
      {!supabaseOk && (
        <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3">
          <span className="text-amber-400 text-lg shrink-0">⚠️</span>
          <p className="text-amber-300 text-sm">.env.local 파일에 Supabase 키를 설정하세요</p>
        </div>
      )}

      {/* ── DB 로딩 ── */}
      {step === "loading_db" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="relative w-14 h-14">
            <svg className="w-14 h-14 animate-spin text-indigo-500" viewBox="0 0 56 56" fill="none">
              <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4"
                strokeLinecap="round" strokeDasharray="120" strokeDashoffset="80" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-white text-sm font-medium">등록된 얼굴 데이터 로딩 중...</p>
            <p className="text-slate-500 text-xs mt-1">Supabase에서 프로필을 가져옵니다</p>
          </div>
        </div>
      )}

      {/* ── Scan ── */}
      {step === "scan" && (
        <div className="flex flex-col gap-5">
          <div className="text-center">
            <h2 className="text-xl font-bold text-white">얼굴을 인식해주세요</h2>
            <p className="text-slate-400 text-sm mt-1">
              일치율 {SIMILARITY_THRESHOLD}% 이상이면 자동 인증됩니다
            </p>
          </div>

          {/* 등록 없음 경고 */}
          {noProfiles && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
              <p className="text-amber-300 text-sm">등록된 얼굴이 없습니다</p>
              <Link href="/register" className="text-blue-400 text-xs underline mt-1 block">
                얼굴 등록하러 가기
              </Link>
            </div>
          )}

          {/* 카메라 */}
          <FaceCamera onResult={handleFaceResult} active={step === "scan"} />

          {/* 실시간 비교 패널 */}
          <div className="bg-[#0f1629] border border-white/5 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">실시간 분석</p>
              <span className="text-slate-600 text-xs">{profilesRef.current.length}명 등록됨</span>
            </div>

            {/* 최고 일치 정보 */}
            {match ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-500 text-xs">최고 일치</p>
                    <p className="text-white font-semibold text-base mt-0.5">{match.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500 text-xs">일치율</p>
                    <p className="font-bold text-2xl mt-0.5"
                      style={{ color: similarityColor(match.similarity) }}>
                      {match.similarity}%
                    </p>
                  </div>
                </div>

                {/* 일치율 게이지 */}
                <div className="relative w-full h-3 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${match.similarity}%`,
                      background: `linear-gradient(to right, ${similarityColor(0)}, ${similarityColor(match.similarity)})`,
                    }}
                  />
                  {/* 임계값 마커 */}
                  <div className="absolute top-0 h-full w-px bg-white/40"
                    style={{ left: `${SIMILARITY_THRESHOLD}%` }} />
                </div>

                <div className="flex justify-between text-xs text-slate-600">
                  <span>0%</span>
                  <span className="text-slate-400">{SIMILARITY_THRESHOLD}% 임계값</span>
                  <span>100%</span>
                </div>

                {/* 상태 메시지 */}
                <div className={`rounded-xl px-4 py-3 text-center text-sm font-medium
                  ${match.similarity >= SIMILARITY_THRESHOLD
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : match.similarity >= 70
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                    : "bg-white/5 border border-white/5 text-slate-400"
                  }`}>
                  {match.similarity >= SIMILARITY_THRESHOLD
                    ? `✓ ${match.name}님 확인 — 인증 중...`
                    : match.similarity >= 70
                    ? "더 가까이 다가와 주세요"
                    : "등록된 얼굴과 다릅니다"}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 py-2">
                <div className="w-2 h-2 rounded-full bg-slate-600" />
                <span className="text-slate-500 text-sm">얼굴을 카메라에 비춰주세요</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Verifying ── */}
      {step === "verifying" && (
        <div className="flex flex-col items-center gap-6 mt-4">
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 text-indigo-500" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="8"
                strokeLinecap="round" strokeDasharray="276" strokeDashoffset="60"
                className="animate-spin" style={{ animationDuration: "1.5s" }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
          </div>

          {authResult && (
            <div className="bg-[#0f1629] border border-indigo-500/20 rounded-2xl p-5 text-center w-full">
              <p className="text-slate-400 text-sm">일치된 사용자</p>
              <p className="text-white text-2xl font-bold mt-1">{authResult.name}</p>
              <p className="font-bold text-3xl mt-2" style={{ color: similarityColor(authResult.similarity) }}>
                {authResult.similarity}%
              </p>
              <p className="text-slate-500 text-xs mt-1">일치율</p>
            </div>
          )}

          <div className="text-center">
            <h2 className="text-xl font-bold text-white">신원 확인 중</h2>
            <p className="text-slate-400 text-sm mt-1">보안 토큰을 발급하고 있어요</p>
          </div>

          <div className="w-full space-y-3">
            {["얼굴 벡터 매칭 완료", "위변조 감지 통과", "보안 토큰 발급 중"].map((label, i) => (
              <div key={label} className="flex items-center justify-between bg-[#0f1629] border border-white/5 rounded-xl p-4">
                <span className="text-slate-300 text-sm">{label}</span>
                <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"
                  style={{ animationDelay: `${i * 0.25}s` }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Success ── */}
      {step === "success" && authResult && (
        <div className="flex flex-col items-center gap-6 mt-4">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <svg className="w-14 h-14 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/50">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <div className="text-center">
            <p className="text-slate-400 text-sm">인증 완료</p>
            <h2 className="text-3xl font-bold text-white mt-1">
              안녕하세요,<br />{authResult.name}님
            </h2>
          </div>

          {/* 인증 결과 카드 */}
          <div className="w-full bg-[#0f1629] border border-emerald-500/20 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-sm">인증 방식</span>
              <span className="text-white text-sm font-medium">AI 얼굴 인식</span>
            </div>
            <div className="w-full h-px bg-white/5" />

            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-sm">일치율</span>
              <span className="font-bold text-lg" style={{ color: similarityColor(authResult.similarity) }}>
                {authResult.similarity}%
              </span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full"
                style={{
                  width: `${authResult.similarity}%`,
                  background: `linear-gradient(to right, #10B981, #34D399)`,
                }} />
            </div>
            <div className="w-full h-px bg-white/5" />

            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-sm">보안 등급</span>
              <span className="text-emerald-400 text-sm font-medium">최고 (Lv.3)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-sm">세션 유효시간</span>
              <span className="text-white text-sm font-medium">30분</span>
            </div>
          </div>

          <Link href="/"
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold
                       rounded-2xl py-5 text-center shadow-lg shadow-emerald-500/20 active:scale-95
                       transition-transform block">
            서비스 이용하기
          </Link>
        </div>
      )}

      {/* ── Fail ── */}
      {step === "fail" && (
        <div className="flex flex-col items-center gap-6 mt-4">
          <div className="w-28 h-28 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg className="w-14 h-14 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>

          <div className="text-center">
            <h2 className="text-xl font-bold text-white">인증 실패</h2>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              {dbError || "일치하는 얼굴을 찾을 수 없습니다"}
            </p>
          </div>

          <div className="w-full space-y-3">
            <button
              onClick={() => { authenticatedRef.current = false; setMatch(null); setStep("scan"); }}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold
                         rounded-2xl py-5 shadow-lg shadow-blue-500/20 active:scale-95 transition-transform">
              다시 시도
            </button>
            <Link href="/register"
              className="w-full bg-[#0f1629] border border-white/5 text-slate-400 font-medium
                         rounded-2xl py-3 text-sm text-center active:scale-95 transition-transform block">
              얼굴 등록하러 가기
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
