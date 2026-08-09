/// <reference types="@testing-library/jest-dom/vitest" />
import { useState } from "react";

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssocieIdentite } from "./AssocieIdentite";
import type { Associe } from "@/lib/documents";

function associeVide(valeurs: Partial<Associe> = {}): Associe {
  return {
    id: "a1",
    dossier_id: "d1",
    type: "personne_physique",
    civilite: null,
    prenom: null,
    prenoms: [],
    nom: null,
    nom_naissance: null,
    date_naissance: null,
    lieu_naissance: null,
    nationalite: null,
    adresse: null,
    adresse_code_postal: null,
    adresse_ville: null,
    adresse_pays: null,
    email: null,
    ...valeurs,
  } as unknown as Associe;
}

/** Harnais fidèle à l'écran : l'état remonte au parent puis redescend en props. */
function Harnais({ initial }: { initial?: Partial<Associe> }) {
  const [associe, setAssocie] = useState<Associe>(associeVide(initial));
  return (
    <>
      <AssocieIdentite associe={associe} onChange={(v) => setAssocie((a) => ({ ...a, ...v }))} />
      <output data-testid="date">{associe.date_naissance ?? "vide"}</output>
    </>
  );
}

describe("AssocieIdentite — date de naissance", () => {
  it("retient jour, mois et année et n'enregistre qu'une date complète", async () => {
    const u = userEvent.setup();
    render(<Harnais />);

    const jour = screen.getByLabelText("Jour de naissance");
    const mois = screen.getByLabelText("Mois de naissance");
    const annee = screen.getByLabelText("Année de naissance");

    await u.selectOptions(jour, "14");
    expect(jour).toHaveValue("14");
    expect(screen.getByTestId("date")).toHaveTextContent("vide");
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await u.selectOptions(mois, "3");
    expect(mois).toHaveValue("3");
    expect(jour).toHaveValue("14");
    expect(screen.getByTestId("date")).toHaveTextContent("vide");

    await u.selectOptions(annee, "1985");
    expect(annee).toHaveValue("1985");
    expect(jour).toHaveValue("14");
    expect(mois).toHaveValue("3");
    expect(screen.getByTestId("date")).toHaveTextContent("1985-03-14");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("affiche la date déjà enregistrée d'un associé existant et la conserve après modification d'un autre champ", async () => {
    const u = userEvent.setup();
    render(<Harnais initial={{ date_naissance: "1979-11-02", nom: "Durand" }} />);

    expect(screen.getByLabelText("Jour de naissance")).toHaveValue("2");
    expect(screen.getByLabelText("Mois de naissance")).toHaveValue("11");
    expect(screen.getByLabelText("Année de naissance")).toHaveValue("1979");

    await u.type(screen.getByDisplayValue("Durand"), "e");

    expect(screen.getByLabelText("Jour de naissance")).toHaveValue("2");
    expect(screen.getByLabelText("Mois de naissance")).toHaveValue("11");
    expect(screen.getByLabelText("Année de naissance")).toHaveValue("1979");
    expect(screen.getByTestId("date")).toHaveTextContent("1979-11-02");
  });

  it("efface la date enregistrée si la sélection redevient incomplète", async () => {
    const u = userEvent.setup();
    render(<Harnais initial={{ date_naissance: "1990-05-20" }} />);

    await u.selectOptions(screen.getByLabelText("Mois de naissance"), "");

    expect(screen.getByTestId("date")).toHaveTextContent("vide");
    expect(screen.getByLabelText("Jour de naissance")).toHaveValue("20");
    expect(screen.getByLabelText("Année de naissance")).toHaveValue("1990");
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
