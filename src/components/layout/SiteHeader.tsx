import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Landmark, LogOut, Menu, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

const publicLinks = [
  { to: "/", label: "Accueil" },
  { to: "/commencer", label: "Créer ma société" },
  { to: "/simulateur", label: "Simulateur" },
  { to: "/tarifs", label: "Frais légaux" },
];

export function SiteHeader() {
  const { user } = useAuth();
  const { isCabinet, isAdmin } = useRoles(user);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => setOpen(false), [user]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5">
          <Landmark className="size-5 text-accent" strokeWidth={1.5} aria-hidden />
          <span className="font-serif text-lg font-semibold tracking-tight">CREA EXPERT</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Navigation principale">
          {publicLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-sm text-foreground font-medium" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/tableau-de-bord">Mon espace</Link>
              </Button>
              {isCabinet && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/cabinet">Cabinet</Link>
                </Button>
              )}
              {isAdmin && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin">Admin</Link>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut strokeWidth={1.5} />
                Se déconnecter
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Se connecter</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/commencer">Créer ma société</Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex size-10 items-center justify-center rounded-md border border-border md:hidden"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {open ? <X className="size-5" strokeWidth={1.5} /> : <Menu className="size-5" strokeWidth={1.5} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-surface md:hidden">
          <div className="container-page flex flex-col gap-1 py-3">
            {publicLinks.map((l) => (
              <Link key={l.to} to={l.to} className="rounded-md px-2 py-2.5 text-sm">
                {l.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link to="/tableau-de-bord" className="rounded-md px-2 py-2.5 text-sm">
                  Mon espace
                </Link>
                {isCabinet && (
                  <Link to="/cabinet" className="rounded-md px-2 py-2.5 text-sm">
                    Espace cabinet
                  </Link>
                )}
                {isAdmin && (
                  <Link to="/admin" className="rounded-md px-2 py-2.5 text-sm">
                    Administration
                  </Link>
                )}
                <Button variant="outline" size="sm" className="mt-2" onClick={signOut}>
                  Se déconnecter
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth" className="rounded-md px-2 py-2.5 text-sm">
                  Se connecter
                </Link>
                <Button asChild size="sm" className="mt-2">
                  <Link to="/commencer">Créer ma société</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
