import { useState } from "react";
import { toast } from "sonner";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MessageSquarePlus } from "lucide-react";

/** Recueil de suggestions d'amélioration, accessible depuis toutes les pages. */
export function RecommandationDialog({
  variant = "outline",
  size = "sm",
  className,
  label = "Proposer une amélioration",
}: {
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg";
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const page = useRouterState({ select: (s) => s.location.pathname });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 10) {
      toast.error("Merci de détailler votre suggestion en quelques mots.");
      return;
    }
    setEnvoi(true);
    const { data: sess } = await supabase.auth.getSession();
    const { error } = await supabase.from("recommandations").insert({
      user_id: sess.session?.user.id ?? null,
      page: page.slice(0, 200),
      message: message.trim().slice(0, 2000),
      email: email.trim().slice(0, 255) || null,
    });
    setEnvoi(false);
    if (error) {
      toast.error("Votre suggestion n'a pas pu être enregistrée.");
      return;
    }
    setOpen(false);
    setMessage("");
    toast.success("Merci : votre suggestion a bien été transmise.");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <MessageSquarePlus strokeWidth={1.5} />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Votre recommandation</DialogTitle>
          <DialogDescription>
            Une formulation peu claire, une étape manquante, une idée ? Vos retours améliorent
            l'outil en continu.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reco-msg">Votre suggestion</Label>
            <Textarea
              id="reco-msg"
              rows={5}
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ce qui vous a manqué, ce qui pourrait être plus clair…"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reco-email">Adresse électronique (facultatif)</Label>
            <Input
              id="reco-email"
              type="email"
              maxLength={255}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Pour être recontacté si nécessaire"
            />
          </div>
          <Button type="submit" className="w-full" disabled={envoi}>
            {envoi ? "Envoi…" : "Envoyer ma recommandation"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
