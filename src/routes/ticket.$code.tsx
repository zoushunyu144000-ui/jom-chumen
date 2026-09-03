import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { ShareableTicket } from "@/components/ticket-share";
import { Button } from "@/components/ui/button";
import { applyStatusLabel, isApplySuccess } from "@/lib/format";
import { getTicketByCode } from "@/lib/server/events";

export const Route = createFileRoute("/ticket/$code")({
  loader: async ({ params }) => {
    const ticket = await getTicketByCode({ data: { code: params.code } });
    if (!ticket) throw notFound();
    return { ticket };
  },
  notFoundComponent: () => (
    <main className="px-6 py-20 text-center">
      <p className="font-display text-xl font-semibold">找不到这张票</p>
      <Link to="/tickets" className="mt-4 inline-block text-sm text-muted underline">打开票夹</Link>
    </main>
  ),
  component: TicketPage,
});

function TicketPage() {
  const { ticket } = Route.useLoaderData();
  const success = isApplySuccess(ticket.paymentStatus);

  if (!success) {
    return (
      <main className="px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
        <Link to="/me/applies" className="flex size-11 items-center justify-center" aria-label="返回">
          <ArrowLeft className="size-5" />
        </Link>
        <p className="font-display text-lg font-semibold">还没有出票</p>
        <p className="mt-1 text-sm text-muted">当前状态：{applyStatusLabel(ticket.paymentStatus)}。提交申请不等于报名成功。</p>
        <Button asChild className="mt-5 w-full">
          <Link to="/apply/$code" params={{ code: ticket.code }}>查看申请与付款指引</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="px-4 pb-10">
      <header className="flex items-center gap-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Link to="/tickets" className="flex size-11 items-center justify-center" aria-label="票夹">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-display text-lg font-semibold">电子票</h1>
      </header>
      <div className="rise-in mb-4 flex items-center gap-2 rounded-lg bg-lime px-3 py-2 text-sm font-medium">
        <Check className="size-4" />
        报名成功，入场出示此票
      </div>
      <ShareableTicket ticket={ticket} />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={async () => {
          try {
            await navigator.clipboard.writeText(`${ticket.applyNo} ${ticket.code}`);
            toast.success("已复制票号");
          } catch {
            toast.message(ticket.code);
          }
        }}>复制票号</Button>
        <Button asChild variant="ink"><Link to="/">继续逛局</Link></Button>
      </div>
    </main>
  );
}
