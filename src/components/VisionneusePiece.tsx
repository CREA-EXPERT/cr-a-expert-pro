import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { estImage, estPdf } from "@/lib/pieces";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";

export type PieceApercu = {
  id: string;
  libelle: string;
  personne: string;
  chemin: string | null;
  url?: string;
};

/**
 * Lecteur intégré : images agrandissables avec zoom, PDF embarqués.
 * Aucun nouvel onglet : les liens signés sont fournis par le serveur.
 */
export function VisionneusePiece({
  pieces,
  index,
  onIndex,
  onFermer,
}: {
  pieces: PieceApercu[];
  index: number | null;
  onIndex: (i: number) => void;
  onFermer: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const piece = index === null ? null : pieces[index];

  useEffect(() => setZoom(1), [index]);

  if (!piece) return null;

  const precedent = () => onIndex((index! - 1 + pieces.length) % pieces.length);
  const suivant = () => onIndex((index! + 1) % pieces.length);

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-left text-base">
            {piece.libelle}
            <span className="block text-sm font-normal text-muted-foreground">
              {piece.personne}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={precedent} aria-label="Pièce précédente">
              <ChevronLeft strokeWidth={1.5} /> Précédente
            </Button>
            <Button size="sm" variant="outline" onClick={suivant} aria-label="Pièce suivante">
              Suivante <ChevronRight strokeWidth={1.5} />
            </Button>
            <span className="text-xs text-muted-foreground">
              {index! + 1} / {pieces.length}
            </span>
          </div>
          {estImage(piece.chemin) && (
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="outline"
                className="size-8"
                aria-label="Réduire"
                onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))}
              >
                <Minus className="size-4" strokeWidth={1.5} aria-hidden />
              </Button>
              <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)} %</span>
              <Button
                size="icon"
                variant="outline"
                className="size-8"
                aria-label="Agrandir"
                onClick={() => setZoom((z) => Math.min(5, +(z + 0.5).toFixed(1)))}
              >
                <Plus className="size-4" strokeWidth={1.5} aria-hidden />
              </Button>
            </div>
          )}
        </div>

        <div className="max-h-[70vh] overflow-auto rounded-md border border-border bg-muted/30">
          {!piece.url && <p className="p-6 text-sm text-muted-foreground">Aperçu indisponible.</p>}
          {piece.url && estImage(piece.chemin) && (
            <img
              src={piece.url}
              alt={`Aperçu de la pièce ${piece.libelle}`}
              style={{ width: `${zoom * 100}%` }}
              className="max-w-none"
            />
          )}
          {piece.url && estPdf(piece.chemin) && (
            <object data={piece.url} type="application/pdf" className="h-[70vh] w-full">
              <iframe
                src={piece.url}
                title={`Aperçu de ${piece.libelle}`}
                className="h-[70vh] w-full"
              />
            </object>
          )}
          {piece.url && !estImage(piece.chemin) && !estPdf(piece.chemin) && (
            <p className="p-6 text-sm text-muted-foreground">
              Ce format ne peut pas être affiché en ligne.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
