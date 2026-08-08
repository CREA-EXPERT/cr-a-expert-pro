import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { enregistrerRappel } from "@/lib/public-forms.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PhoneCall } from "lucide-react";

const CRENEAUX = [
  "Dès que possible",
  "Aujourd'hui, matin",
  "Aujourd'hui, après-midi",
  "Demain, matin",
  "Demain, après-midi",
  "Cette semaine",
];

const TURNSTILE_SITE_KEY = import.meta.env["VITE_TURNSTILE_SITE_KEY"] as string | undefined;

export function CallbackDialog({
  variant = "outline",
  size = "default",
  className,
  label = "Être rappelé",
}: {
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [telephone, setTelephone] = useState("");
  const [creneau, setCreneau] = useState<string>(CRENEAUX[0] as string);
  const [societeWeb, setSocieteWeb] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (telephone.trim().length < 6) {
      toast.error("Merci d'indiquer un numéro de téléphone valide.");
      return;
    }
    setSending(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const reponse = await enregistrerRappel({
        data: {
          telephone: telephone.trim().slice(0, 30),
          creneau_souhaite: creneau,
          user_id: sess.session?.user.id,
          piege: societeWeb || undefined,
        },
      });
      setSending(false);
      if (!reponse.ok) {
        if (reponse.raison === "trop_de_demandes") {
          toast.error("Trop de demandes envoyées depuis cet appareil. Réessayez dans une heure.");
        } else {
          toast.error("La demande n'a pas pu être enregistrée.");
        }
        return;
      }
      setOpen(false);
      setTelephone("");
      toast.success("Demande enregistrée. Nous vous rappelons sur le créneau indiqué.");
    } catch {
      setSending(false);
      toast.error("La demande n'a pas pu être enregistrée.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <PhoneCall strokeWidth={1.5} />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Être rappelé</DialogTitle>
          <DialogDescription>
            Un membre du cabinet vous rappelle sur le créneau de votre choix. Aucun engagement.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cb-tel">Téléphone</Label>
            <Input
              id="cb-tel"
              type="tel"
              autoComplete="tel"
              maxLength={30}
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="06 12 34 56 78"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cb-creneau">Créneau souhaité</Label>
            <select
              id="cb-creneau"
              value={creneau}
              onChange={(e) => setCreneau(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm"
            >
              {CRENEAUX.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            name="societe_web"
            value={societeWeb}
            onChange={(e) => setSocieteWeb(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute left-[-9999px] h-0 w-0 opacity-0"
          />
          {TURNSTILE_SITE_KEY && (
            <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} />
          )}
          <Button type="submit" className="w-full" disabled={sending}>
            {sending ? "Envoi…" : "Demander à être rappelé"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
