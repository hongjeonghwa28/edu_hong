import { supabase } from "./supabase";

export interface FaceProfile {
  id: string;
  name: string;
  descriptor: number[]; // 128-dim Float32Array → 저장 시 number[]
  created_at: string;
}

/** 얼굴 프로필 저장 */
export async function saveFaceProfile(
  name: string,
  descriptor: Float32Array
): Promise<void> {
  const { error } = await supabase.from("face_profiles").insert({
    name: name.trim(),
    descriptor: Array.from(descriptor),
  });
  if (error) throw new Error(`저장 실패: ${error.message}`);
}

/** 전체 얼굴 프로필 로드 */
export async function getAllProfiles(): Promise<FaceProfile[]> {
  const { data, error } = await supabase
    .from("face_profiles")
    .select("id, name, descriptor, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`로드 실패: ${error.message}`);
  return data ?? [];
}

/** 특정 프로필 삭제 */
export async function deleteProfile(id: string): Promise<void> {
  const { error } = await supabase
    .from("face_profiles")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`삭제 실패: ${error.message}`);
}
