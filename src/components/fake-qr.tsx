import { useMemo } from "react";

function hash(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function finder(x: number, y: number, size: number) {
  const inOuter = x < 7 && y < 7;
  const inOuter2 = x >= size - 7 && y < 7;
  const inOuter3 = x < 7 && y >= size - 7;
  return inOuter || inOuter2 || inOuter3;
}

function finderFill(x: number, y: number, size: number) {
  const local = (gx: number, gy: number) => {
    const ring = gx === 0 || gy === 0 || gx === 6 || gy === 6;
    const core = gx >= 2 && gx <= 4 && gy >= 2 && gy <= 4;
    return ring || core;
  };
  if (x < 7 && y < 7) return local(x, y);
  if (x >= size - 7 && y < 7) return local(x - (size - 7), y);
  if (x < 7 && y >= size - 7) return local(x, y - (size - 7));
  return false;
}

export function FakeQr({
  seed,
  className,
}: {
  seed: string;
  className?: string;
}) {
  const size = 21;
  const cells = useMemo(() => {
    const h = hash(seed);
    const out: boolean[] = [];
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (finder(x, y, size)) {
          out.push(finderFill(x, y, size));
        } else {
          const bit = (h >> ((x * 3 + y) % 24)) & 1;
          const mix = (x * 13 + y * 7 + (h % 17)) % 3 === 0;
          out.push(Boolean(bit) !== mix);
        }
      }
    }
    return out;
  }, [seed]);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-hidden="true"
    >
      <rect width={size} height={size} fill="#fffefa" />
      {cells.map((on, i) =>
        on ? (
          <rect
            key={i}
            x={i % size}
            y={Math.floor(i / size)}
            width="1"
            height="1"
            fill="#121410"
          />
        ) : null,
      )}
    </svg>
  );
}
