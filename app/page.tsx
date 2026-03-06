"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#080d1a] flex flex-col items-center justify-between px-6 py-12 max-w-md mx-auto">
      {/* Header */}
      <header className="w-full flex items-center justify-between pt-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <span className="text-white font-semibold text-base tracking-tight">FaceAuth</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#131929] flex items-center justify-center border border-white/10">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full flex flex-col items-center gap-10 -mt-8">
        {/* Face Scan Illustration */}
        <div className="relative flex items-center justify-center">
          {/* Outer glow ring */}
          <div className="absolute w-56 h-56 rounded-full bg-blue-500/5 animate-pulse" />
          <div className="absolute w-44 h-44 rounded-full bg-blue-500/8" />

          {/* Scan frame */}
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* Corner brackets */}
            <div className="absolute inset-0">
              {/* Top-left */}
              <div className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-blue-400 rounded-tl-lg" />
              {/* Top-right */}
              <div className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-blue-400 rounded-tr-lg" />
              {/* Bottom-left */}
              <div className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-blue-400 rounded-bl-lg" />
              {/* Bottom-right */}
              <div className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-blue-400 rounded-br-lg" />
            </div>

            {/* Face icon */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#131929] to-[#1a2540] border border-white/10 flex items-center justify-center shadow-xl">
              <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Title & Description */}
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-white tracking-tight">얼굴 인증 서비스</h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
            AI 기반 얼굴 인식으로 안전하고 빠른<br />본인 확인을 경험하세요
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 text-xs font-medium">보안 연결 활성화됨</span>
        </div>

        {/* Buttons */}
        <div className="w-full flex flex-col gap-4">
          <Link
            href="/register"
            className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-px shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          >
            <div className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 transition-all group-hover:from-blue-500 group-hover:to-indigo-500">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-base">얼굴 등록</p>
                <p className="text-blue-200 text-xs mt-0.5">처음 사용 시 등록이 필요해요</p>
              </div>
              <svg className="w-5 h-5 text-white/60 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href="/auth"
            className="group relative w-full overflow-hidden rounded-2xl p-px transition-all active:scale-95"
            style={{ background: "linear-gradient(to right, rgba(99,102,241,0.3), rgba(59,130,246,0.3))" }}
          >
            <div className="flex items-center justify-center gap-3 rounded-2xl bg-[#0f1629] px-6 py-5 border border-white/5 transition-all group-hover:bg-[#141d35]">
              <div className="w-10 h-10 rounded-xl bg-[#131929] border border-white/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-base">인증 시작</p>
                <p className="text-slate-400 text-xs mt-0.5">등록된 얼굴로 본인을 확인해요</p>
              </div>
              <svg className="w-5 h-5 text-slate-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Info Cards */}
        <div className="w-full grid grid-cols-3 gap-3">
          {[
            { label: "보안등급", value: "최고", icon: "🔒" },
            { label: "인식속도", value: "0.3초", icon: "⚡" },
            { label: "정확도", value: "99.9%", icon: "✓" },
          ].map((item) => (
            <div key={item.label} className="bg-[#0f1629] border border-white/5 rounded-xl p-3 flex flex-col items-center gap-1">
              <span className="text-lg">{item.icon}</span>
              <span className="text-white font-bold text-sm">{item.value}</span>
              <span className="text-slate-500 text-[10px]">{item.label}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center pb-4">
        <p className="text-slate-600 text-xs">금융보안원 인증 · AES-256 암호화</p>
      </footer>
    </div>
  );
}
