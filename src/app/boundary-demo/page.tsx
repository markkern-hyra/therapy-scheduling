"use client";

// mutation: доказ, що правило «секретний ключ лише на сервері» (check:boundary) ловить порушення — тимчасово, буде revert.
export default function BoundaryDemoPage() {
  return <p>{process.env.SUPABASE_SECRET_KEY ? "set" : "unset"}</p>;
}
