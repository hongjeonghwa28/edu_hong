import { createClient } from "@supabase/supabase-js";

/*
  ────────────────────────────────────────────────────────────────
  Supabase 테이블 생성 SQL (Supabase Dashboard → SQL Editor 에서 실행)
  ────────────────────────────────────────────────────────────────
  CREATE TABLE face_profiles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    descriptor  DOUBLE PRECISION[] NOT NULL,   -- 128-dim 얼굴 벡터
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );

  -- RLS 비활성화 (개발용 / 프로덕션에서는 정책 설정 필요)
  ALTER TABLE face_profiles DISABLE ROW LEVEL SECURITY;
  ────────────────────────────────────────────────────────────────
*/

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseKey);

/** .env.local 환경변수가 설정됐는지 확인 */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseKey);
}
