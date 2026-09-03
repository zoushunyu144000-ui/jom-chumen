import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SaveImageButton({ src, filename }: { src: string; filename: string }) {
  async function save() {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("图片已保存，可以拿去扫码付款");
    } catch {
      window.open(src, "_blank");
    }
  }
  return (
    <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => void save()}>
      保存图片
    </Button>
  );
}
