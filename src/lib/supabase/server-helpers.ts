import { createClient } from "@/lib/supabase/server";

const SCHEMA = "taskgo" as const;

/**
 * API ルート用: 認証済みユーザーと taskgo スキーマの DB クライアントを返す。
 * 未認証の場合は user が null になるため、呼び出し側で 401 を返すこと。
 */
export async function getServerContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const db = supabase.schema(SCHEMA);
  return { user, supabase, db };
}
