import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { genererGabaritIdentite, telechargerPdf } from "@/lib/pdf";
import type { Associe, Dossier } from "@/lib/documents";
import { Download } from "lucide-react";

/**
 * Guide de dépôt des copies de pièces d'identité : ce qui est exigé, la mention
 * manuscrite exacte, et un gabarit imprimable à télécharger.
 */
export function GuideIdentite({ dossier, associes }: { dossier: Dossier; associes: Associe[] }) {
  async function telecharger() {
    try {
      const octets = await genererGabaritIdentite(dossier, associes);
      telechargerPdf(octets, "Gabarit - copie de piece d'identite certifiee conforme");
    } catch {
      toast.error("Le gabarit n'a pas pu être généré.");
    }
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <h3 className="font-serif text-xl">Copie de votre pièce d'identité : ce qui est exigé</h3>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-justify">
        <li>
          Copie <strong>recto ET verso</strong> d'une pièce en cours de validité : carte nationale
          d'identité, passeport (pages d'identité) ou titre de séjour. Le permis de conduire n'est
          pas accepté pour l'immatriculation.
        </li>
        <li>
          Sur la copie elle-même, recopiez à la main, lisiblement, la mention :{" "}
          <span className="font-medium">
            « Je soussigné(e) [prénom NOM], certifie la présente copie conforme à l'original de ma
            pièce d'identité. »
          </span>
        </li>
        <li>Ajoutez le lieu, la date du jour, puis votre signature manuscrite sous la mention.</li>
        <li>
          Scannez ou photographiez la copie annotée, bien à plat, sans reflet ni zone coupée, puis
          déposez-la ci-dessous (PDF, JPG ou PNG, 10 Mo maximum).
        </li>
      </ol>
      <p className="mt-3 text-sm leading-relaxed text-justify text-muted-foreground">
        Une copie expirée, illisible, tronquée, sans verso, ou dont la mention est absente,
        dactylographiée, non datée ou non signée sera refusée : chaque associé et chaque dirigeant
        doit fournir sa propre copie certifiée.
      </p>
      <Button variant="outline" size="sm" className="mt-4" onClick={telecharger}>
        <Download strokeWidth={1.5} /> Télécharger le gabarit à imprimer
      </Button>
    </section>
  );
}
