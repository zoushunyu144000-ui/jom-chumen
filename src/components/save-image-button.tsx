import { toast } from "sonner";

export function SaveImageButton({ src, name }: { src: string; name: string }) {
  async function save() {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name.endsWith(".png") || name.endsWith(".jpg") ? name : `${name}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("图片已保存，可以打开相册扫码");
    } catch {
      toast.error("保存失败，请长按图片");
    }
  }
  return (
    <button type="button" onClick={() => void save()} className="mt-3 h-11 w-full rounded-lg bg-ink text-sm font-semibold text-lime">
      保存图片
    </button>
  );
}
