import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/** Zone de tracé manuscrit : renvoie une image PNG en base64 (data URL). */
export function ZoneTrace({ onTrace }: { onTrace: (dataUrl: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [dessine, setDessine] = useState(false);
  const trace = useRef(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#101828";
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = ref.current!;
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * canvas.width,
      y: ((e.clientY - r.top) / r.height) * canvas.height,
    };
  };

  const debut = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = ref.current!.getContext("2d")!;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    trace.current = true;
  };

  const bouge = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!trace.current) return;
    const ctx = ref.current!.getContext("2d")!;
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setDessine(true);
  };

  const fin = () => {
    if (!trace.current) return;
    trace.current = false;
    onTrace(ref.current!.toDataURL("image/png"));
  };

  const effacer = () => {
    const canvas = ref.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setDessine(false);
    onTrace(null);
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={ref}
        width={600}
        height={200}
        onPointerDown={debut}
        onPointerMove={bouge}
        onPointerUp={fin}
        onPointerLeave={fin}
        className="h-40 w-full touch-none rounded-md border border-border bg-background"
        aria-label="Zone de signature manuscrite"
      />
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {dessine ? "Tracé enregistré." : "Tracez votre signature dans le cadre."}
        </p>
        <Button type="button" size="sm" variant="outline" onClick={effacer}>
          Effacer
        </Button>
      </div>
    </div>
  );
}
