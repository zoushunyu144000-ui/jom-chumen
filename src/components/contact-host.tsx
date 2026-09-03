import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { openClubChat } from "@/lib/server/chat";

export function ContactHostButton({ clubId }: { clubId: string }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      const chat = await openClubChat({ data: { clubId } });
      await navigate({ to: "/chat/$id", params: { id: chat.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "请先登录");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button type="button" variant="outline" className="mt-3 w-full" disabled={busy} onClick={() => void go()}>
      {busy ? "打开中…" : "联系主办"}
    </Button>
  );
}
