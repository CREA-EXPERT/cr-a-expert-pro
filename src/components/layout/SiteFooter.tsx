import { Link } from "@tanstack/react-router";
import { Landmark } from "lucide-react";
import { RecommandationDialog } from "@/components/RecommandationDialog";
import { CABINET } from "@/lib/domain";


export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-12 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <Landmark className="size-5 text-accent" strokeWidth={1.5} aria-hidden />
            <span className="font-serif text-lg font-semibold">CREA EXPERT</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Création de société en ligne, en France, avec un cabinet d'expertise comptable inscrit à
            l'Ordre derrière chaque dossier.
          </p>
        </div>

        <nav aria-label="Informations légales">
          <h2 className="text-sm font-medium">Informations légales</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/mentions-legales" className="hover:text-foreground">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link to="/confidentialite" className="hover:text-foreground">
                Politique de confidentialité
              </Link>
            </li>
            <li>
              <Link to="/cgu" className="hover:text-foreground">
                Conditions générales d'utilisation
              </Link>
            </li>
            <li>
              <Link to="/cgv" className="hover:text-foreground">
                CGV
              </Link>
            </li>

          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-medium">Nos engagements</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Honoraires de création : 0 €</li>
            <li>Mission comptable : 199 € HT/mois, engagement 3 mois</li>
            <li>Frais légaux refacturés à l'euro près</li>
            <li>Données hébergées en Union européenne</li>
          </ul>
          <div className="mt-4">
            <RecommandationDialog />
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="container-page py-5 text-xs text-muted-foreground">
          CREA EXPERT — plateforme d'accompagnement à la création de société. Les informations
          publiées sur ce site sont générales et ne constituent pas un conseil personnalisé. En
          l'absence de recours à un professionnel, les choix effectués et les documents produits
          relèvent de la seule responsabilité de l'utilisateur : ni CREA EXPERT, ni {CABINET.mention},
          ne peuvent en répondre.
        </p>

      </div>
    </footer>
  );
}
