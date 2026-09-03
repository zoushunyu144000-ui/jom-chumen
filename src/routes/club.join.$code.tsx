import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/page-loading";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { joinClubByCode } from "@/lib/server/chat";

export const Route = createFileRoute("/club/join/$code")({ component: JoinPage });

function JoinPage() {
  const { code } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  if (isPending) return <PageLoading label="加入俱乐部" />;
  if (!user) return <RedirectToSignIn />;
  async function join() {
    setBusy(true);
    try {
      const res = await joinClubByCode({ data: { code } });
      toast.success(`已加入 ${res.name}，可以审核报名`);
      await navigate({ to: "/club" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加入失败");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="px-6 py-16 text-center">
      <h1 className="font-display text-xl font-bold">邀请你成为管理员</h1>
      <p className="mt-2 text-sm text-muted">加入后可以收到报名申请并审核。</p>
      <Button className="mt-6" disabled={busy} onClick={() => void join()}>{busy ? "加入中…" : "接受邀请"}</Button>
      <Link to="/club" className="mt-4 block text-sm text-muted underline">取消</Link>
    </main>
  );
}
