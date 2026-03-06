import type { FaceProfile } from "./faceDB";

/**
 * 인증 임계값 (%)
 *
 * face-api.js faceRecognitionNet 128-dim 유클리드 거리 기준:
 *   distance 0.00 → similarity 100%  (완전 일치)
 *   distance 0.10 → similarity  90%  ← 인증 통과 기준
 *   distance 0.40 → similarity  60%
 *   distance 0.60 → similarity  40%  (face-api.js 기본 임계값)
 *   distance 1.00 → similarity   0%
 *
 * 동일인을 같은 환경에서 비교하면 보통 distance 0.0~0.15 (similarity 85~100%).
 * 다른 사람이면 보통 distance 0.6+ (similarity ~40% 이하).
 */
export const SIMILARITY_THRESHOLD = 80; // % — 필요 시 조정

export interface MatchResult {
  profileId: string;
  name: string;
  similarity: number; // 0~100 (정수)
  distance: number;   // 유클리드 거리
}

// ── 내부 유틸 ──────────────────────────────────────────────────────────────

function euclideanDistance(
  a: ArrayLike<number>,
  b: ArrayLike<number>
): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/**
 * 유클리드 거리 → 일치율(%) 변환
 * similarity = clamp(round((1 - distance) * 100), 0, 100)
 */
export function distanceToSimilarity(distance: number): number {
  return Math.max(0, Math.min(100, Math.round((1 - distance) * 100)));
}

// ── 공개 API ──────────────────────────────────────────────────────────────

/**
 * 쿼리 descriptor 와 모든 프로필을 비교해 가장 유사한 결과를 반환.
 * 프로필이 없으면 null 반환.
 */
export function findBestMatch(
  query: Float32Array,
  profiles: FaceProfile[]
): MatchResult | null {
  if (profiles.length === 0) return null;

  let best: MatchResult | null = null;

  for (const p of profiles) {
    const dist = euclideanDistance(query, p.descriptor);
    const sim  = distanceToSimilarity(dist);

    if (!best || sim > best.similarity) {
      best = { profileId: p.id, name: p.name, similarity: sim, distance: dist };
    }
  }

  return best;
}
