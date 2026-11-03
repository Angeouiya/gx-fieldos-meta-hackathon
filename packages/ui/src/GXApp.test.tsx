import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";

import { GXApp } from "./GXApp";

const desktopNavigation = () => within(screen.getByRole("navigation", { name: "GX.ai workspaces" }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
  window.localStorage.clear();
});

describe("GX agricultural workspaces", () => {
  test("GX-LANG-001: the interface switches between French and English and saves the choice", async () => {
    const user = userEvent.setup();
    render(<GXApp />);
    expect(desktopNavigation().getByRole("button", { name: "Bureau" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "EN" }));
    expect(desktopNavigation().getByRole("button", { name: "Workspace" })).toBeVisible();
    expect(document.documentElement.lang).toBe("en");
    await waitFor(() => expect(localStorage.getItem("gx.ai.language.v1")).toBe("en"));
    await user.click(screen.getByRole("button", { name: "FR" }));
    expect(desktopNavigation().getByRole("button", { name: "Bureau" })).toBeVisible();
    expect(document.documentElement.lang).toBe("fr");
  });
  test("GX-ARCHIVE-001: an AGRIX conversation reappears from its account archive", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
      if (url === "/api/session") return { ok: true, json: async () => ({ authenticated: true }) };
      if (url === "/api/field/conversations" && options?.method === "PATCH") return { ok: true, json: async () => ({}) };
      if (url === "/api/field/conversations") return { ok: true, json: async () => ({
        ownerUserId: "owner-123", summaries: [{ id: "local-12345678", title: "Essai archivé" }],
        conversations: [{ id: "local-12345678", title: "Essai archivé", createdAt: 1_782_890_000_000,
          messages: [{ id: "message-12345678", role: "assistant", content: "Réponse conservée.", createdAt: 1_782_890_000_000 }] }],
      }) };
      throw new Error(`Unexpected request: ${url}`);
    }));
    render(<GXApp agrixMode />);
    await user.click(await screen.findByRole("button", { name: "Essai archivé" }));
    expect(screen.getByText("Réponse conservée.")).toBeVisible();
    expect(screen.queryByRole("group", { name: "Actions for Essai archivé" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Options for Essai archivé" }));
    expect(screen.getByRole("group", { name: "Actions for Essai archivé" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Rename Essai archivé" }));
    await user.clear(screen.getByRole("textbox", { name: "New conversation name" }));
    await user.type(screen.getByRole("textbox", { name: "New conversation name" }), "Essai renommé");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("button", { name: "Essai renommé" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Options for Essai renommé" }));
    await user.click(screen.getByRole("button", { name: "Delete Essai renommé" }));
    expect(screen.getByRole("alertdialog", { name: "Confirm deletion" })).toHaveTextContent("messages will be removed");
    await user.click(screen.getByRole("button", { name: "Keep" }));
    await user.click(screen.getByRole("button", { name: "Options for Essai renommé" }));
    await user.click(screen.getByRole("button", { name: "Pin Essai renommé" }));
    expect(await screen.findByRole("button", { name: "● Essai renommé" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Options for Essai renommé" }));
    await user.click(screen.getByRole("button", { name: "Archive Essai renommé" }));
    expect(await screen.findByRole("button", { name: "Archives (1)" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Archives (1)" }));
    expect(screen.getByRole("button", { name: "Essai renommé" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Options for Essai renommé" }));
    await user.click(screen.getByRole("button", { name: "Restore Essai renommé" }));
    await user.click(screen.getByRole("button", { name: "Back to conversations" }));
    expect(screen.getByRole("button", { name: "Essai renommé" })).toBeVisible();
  });

  test("GX-UI-002: the sidebar exposes the four workspaces and GX chat", () => {
    render(<GXApp />);

    expect(screen.getByRole("complementary", { name: "Main navigation" })).toBeVisible();
    expect(screen.getByRole("button", { name: "New conversation GX.ai" })).toBeVisible();
    expect(screen.getByTestId("view-chat")).toBeVisible();
    expect(desktopNavigation().getByRole("button", { name: "Bureau" })).toBeVisible();
    expect(desktopNavigation().getByRole("button", { name: "Entreprise" })).toBeVisible();
    expect(desktopNavigation().getByRole("button", { name: "Projets" })).toBeVisible();
    expect(desktopNavigation().getByRole("button", { name: "Terrain" })).toBeVisible();
    expect(screen.queryByRole("navigation", { name: "Navigation mobile" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discuter avec GX.ai" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Paramètres" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Accueil" })).not.toBeInTheDocument();
  });

  test("GX-UI-011: the desktop sidebar collapses, expands, and remembers the choice", async () => {
    const user = userEvent.setup();
    render(<GXApp />);
    const shell = screen.getByTestId("gx-app");
    await user.click(screen.getByRole("button", { name: "Réduire la barre latérale" }));
    expect(shell).toHaveClass("is-sidebar-collapsed");
    expect(window.localStorage.getItem("gx.ai.sidebar.collapsed.v1")).toBe("true");
    await user.click(screen.getByRole("button", { name: "Déplier la barre latérale" }));
    expect(shell).not.toHaveClass("is-sidebar-collapsed");
    expect(window.localStorage.getItem("gx.ai.sidebar.collapsed.v1")).toBe("false");
  });

  test.each([
    ["GX-UI-003", "Bureau", "view-office", "Dossiers & stockage"],
    ["GX-UI-004", "Entreprise", "view-company", "Créer un employé GX"],
    ["GX-UI-010", "Projets", "view-projects", "Créer un projet"],
    ["GX-UI-005", "Terrain", "view-field", "Fermes & parcelles"],
    ["GX-UI-008", "Paramètres", "view-settings", "Repères de l’organisation"],
  ])("%s: navigation %s opens its workspace", async (_id, label, testId, copy) => {
    const user = userEvent.setup();
    render(<GXApp />);

    await user.click(label === "Paramètres"
      ? screen.getByRole("button", { name: label })
      : desktopNavigation().getByRole("button", { name: label }));

    expect(screen.getByTestId(testId)).toBeVisible();
    expect(screen.getByText(copy)).toBeVisible();
  });

  test("GX-UI-009: the mobile menu reaches every main view without a bottom bar", async () => {
    const user = userEvent.setup();
    render(<GXApp />);

    const menu = screen.getByRole("button", { name: "Ouvrir la navigation" });
    await user.click(menu);
    expect(menu).toHaveAttribute("aria-expanded", "true");
    await user.click(desktopNavigation().getByRole("button", { name: "Entreprise" }));
    expect(screen.getByTestId("view-company")).toBeVisible();
    await user.click(menu);
    await user.click(desktopNavigation().getByRole("button", { name: "Terrain" }));
    expect(screen.getByTestId("view-field")).toBeVisible();
    await user.click(menu);
    await user.click(desktopNavigation().getByRole("button", { name: "Projets" }));
    expect(screen.getByTestId("view-projects")).toBeVisible();
    await user.click(menu);
    await user.click(desktopNavigation().getByRole("button", { name: "Discuter avec GX.ai" }));
    expect(screen.getByTestId("view-chat")).toBeVisible();
    await user.click(menu);
    await user.click(desktopNavigation().getByRole("button", { name: "Bureau" }));
    expect(screen.getByTestId("view-office")).toBeVisible();
  });

  test("GX-AGRO-001: field categories expose Agrix farm, crop and task links", async () => {
    const user = userEvent.setup();
    render(<GXApp />);
    await user.click(desktopNavigation().getByRole("button", { name: "Terrain" }));

    const farmCard = screen.getByText("Fermes & parcelles").closest("article")!;
    expect(within(farmCard).getByRole("button", { name: "Configurer le dossier" })).toBeVisible();
    expect(within(farmCard).getByRole("link", { name: /Créer avec GX dans Agrix/ })).toHaveAttribute(
      "href", expect.stringContaining("space=terrain&module=gx-farm"),
    );
    await user.click(screen.getByRole("tab", { name: "Production animale" }));
    expect(screen.getByText("Élevage & santé animale")).toBeVisible();
    expect(screen.queryByText("Fermes & parcelles")).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Opérations" }));
    expect(screen.getByText("Interventions terrain")).toBeVisible();
  });

  test("GX-AGRO-002: a project creates a structured local dossier before optional AI analysis", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<GXApp />);

    await user.click(desktopNavigation().getByRole("button", { name: "Projets" }));
    await user.click(screen.getAllByRole("button", { name: "Configurer le dossier" })[0]!);
    const dossier = screen.getByRole("dialog", { name: "Créer un projet" });
    await user.type(within(dossier).getByRole("textbox", { name: "Nom du projet *" }), "Ferme pilote");
    await user.type(within(dossier).getByRole("textbox", { name: "Filière agricole *" }), "Maraîchage");
    await user.type(within(dossier).getByRole("textbox", { name: "Objectif mesurable *" }), "Produire 2 tonnes");
    await user.click(within(dossier).getByRole("button", { name: "Créer le projet local" }));
    expect(within(dossier).getByText("Brouillon local")).toBeVisible();
    expect(within(dossier).getByText("Valider le périmètre et les objectifs")).toBeVisible();
    expect(window.localStorage.getItem("gx.ai.work.records.v1")).toContain("Ferme pilote");
    await user.type(within(dossier).getByRole("textbox", { name: "Nom du collaborateur" }), "Awa");
    await user.click(within(dossier).getAllByRole("button", { name: "Ajouter" })[1]!);
    expect(within(dossier).getByText("Awa")).toBeVisible();
    await user.click(within(dossier).getByRole("button", { name: "Poursuivre dans la conversation GX.ai" }));
    expect(screen.getByTestId("view-chat")).toBeVisible();
    expect((screen.getByRole("textbox", { name: "Écrivez à GX.ai" }) as HTMLTextAreaElement).value)
      .toContain("Ferme pilote");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("GX-WORK-001: a product task returns a report into its dossier", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ report: "Produit observé. Étapes à valider." }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<GXApp />);
    await user.click(screen.getByRole("button", { name: "Paramètres" }));
    await user.type(screen.getByLabelText("Code de test local GX.ai"), "test-access");
    await user.click(desktopNavigation().getByRole("button", { name: "Projets" }));
    const product = screen.getByText("Produits & images").closest("article")!;
    await user.click(within(product).getByRole("button", { name: "Configurer le dossier" }));
    const dossier = screen.getByRole("dialog", { name: "Produits & images" });
    await user.type(within(dossier).getByRole("textbox", { name: "Nom du produit *" }), "Mangue séchée");
    await user.type(within(dossier).getByRole("textbox", { name: "Origine végétale, animale ou transformée *" }), "Végétale");
    await user.click(within(dossier).getByRole("button", { name: "Créer le dossier" }));
    await user.click(within(dossier).getByRole("button", { name: "Décrire le produit" }));
    await user.type(within(dossier).getByRole("textbox", { name: "Consigne ou résultat attendu" }), "Décrire sa couleur et sa texture");
    await user.click(within(dossier).getByRole("button", { name: "Lancer « Décrire le produit »" }));
    await user.click(await within(dossier).findByText(/Décrire le produit ·/));
    expect(within(dossier).getByText(/Produit observé/)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith("/api/work", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).context).toContain("Décrire sa couleur et sa texture");
    expect(window.localStorage.getItem("gx.ai.work.records.v1")).toContain("Produit observé");
  });

  test("GX-METRIC-001: measured processing masses show a yield and reach the server as numbers", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ report: "Calcul GX sur vos mesures déclarées\n15 kg ÷ 100 kg × 100 = 15 %.\n\nFiche de lot à vérifier." }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<GXApp />);
    await user.click(screen.getByRole("button", { name: "Paramètres" }));
    await user.type(screen.getByLabelText("Code de test local GX.ai"), "code-test");
    await user.click(desktopNavigation().getByRole("button", { name: "Projets" }));
    await user.click(screen.getByRole("tab", { name: "Chaîne de valeur" }));
    const processing = screen.getByText("Transformation").closest("article")!;
    await user.click(within(processing).getByRole("button", { name: "Configurer le dossier" }));
    const dossier = screen.getByRole("dialog", { name: "Transformation" });
    await user.type(within(dossier).getByRole("textbox", { name: "Produit transformé *" }), "Mangue séchée");
    await user.type(within(dossier).getByRole("textbox", { name: "Matière première *" }), "Mangues fraîches");
    await user.type(within(dossier).getByRole("spinbutton", { name: "Masse entrante mesurée (kg)" }), "100");
    await user.type(within(dossier).getByRole("spinbutton", { name: "Masse sortante mesurée (kg)" }), "15");
    expect(within(dossier).getByText(/Rendement massique apparent.*15 %/u)).toBeVisible();
    await user.click(within(dossier).getByRole("button", { name: "Créer le dossier" }));
    await user.click(within(dossier).getByRole("button", { name: "Fiche de lot pilote" }));
    await user.click(within(dossier).getByRole("button", { name: "Lancer « Fiche de lot pilote »" }));
    expect(await within(dossier).findByText(/Livrable « Fiche de lot pilote » enregistré/u)).toBeVisible();
    const payload = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(payload.measurement).toEqual({ kind: "processing_yield", inputMassKg: 100, outputMassKg: 15 });
  });

  test("GX-PHOTO-001: the main conversation scans a selected camera photo with the scan quota", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 640, height: 480, close: vi.fn() }));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as never);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,AA==");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ report: "Plante visible. Vérifier les feuilles sur place." }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<GXApp />);
    await user.click(screen.getByRole("button", { name: "Paramètres" }));
    await user.type(screen.getByLabelText("Code de test local GX.ai"), "code-test");
    await user.click(screen.getByRole("button", { name: "New conversation GX.ai" }));

    const camera = screen.getByLabelText("Prendre une photo") as HTMLInputElement;
    expect(camera).toHaveAttribute("capture", "environment");
    await user.upload(camera, new File(["pixels"], "tomate.jpg", { type: "image/jpeg" }));

    expect(await screen.findByText("Plante visible. Vérifier les feuilles sur place.")).toBeVisible();
    expect(screen.getByAltText("Photo envoyée : tomate.jpg")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith("/api/work", expect.objectContaining({ method: "POST" }));
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body.mode).toBe("scan");
    expect(body.images).toHaveLength(1);
    expect(body.images[0].dataUrl).toBe("data:image/jpeg;base64,AA==");
  });

  test("GX-GOAL-001: a project sends its chosen outcome and success criteria to GX", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ report: "Plan de projet préparé." }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<GXApp />);
    await user.click(screen.getByRole("button", { name: "Paramètres" }));
    await user.type(screen.getByLabelText("Code de test local GX.ai"), "code-test");
    await user.click(desktopNavigation().getByRole("button", { name: "Projets" }));
    await user.click(screen.getAllByRole("button", { name: "Configurer le dossier" })[0]!);
    const dossier = screen.getByRole("dialog", { name: "Créer un projet" });
    await user.type(within(dossier).getByRole("textbox", { name: "Nom du projet *" }), "Projet tomate");
    await user.type(within(dossier).getByRole("textbox", { name: "Filière agricole *" }), "Maraîchage");
    await user.type(within(dossier).getByRole("textbox", { name: "Objectif mesurable *" }), "Deux tonnes");
    await user.selectOptions(within(dossier).getByLabelText("Résultat final souhaité"), "Calendrier de jalons");
    await user.type(within(dossier).getByLabelText("Critère de réussite"), "Toutes les dates ont un responsable");
    await user.click(within(dossier).getByRole("checkbox", { name: "Risques" }));
    await user.click(within(dossier).getByRole("button", { name: "Créer le projet local" }));
    expect(within(dossier).getByText(/Ce que GX préparera/)).toBeVisible();
    await user.click(within(dossier).getByRole("button", { name: "Lancer « Construire le plan »" }));
    await user.click(await within(dossier).findByText(/Construire le plan ·/));
    expect(await within(dossier).findByText(/Plan de projet préparé/)).toBeVisible();
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body.context).toContain("Résultat final : Calendrier de jalons");
    expect(body.context).toContain("Toutes les dates ont un responsable");
    expect(body.context).toContain("Points demandés : Risques");
  });

  test("GX-PHOTO-002: a dossier accepts a gallery photo and exposes a camera input", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 640, height: 480, close: vi.fn() }));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as never);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,AA==");
    render(<GXApp />);
    await user.click(desktopNavigation().getByRole("button", { name: "Terrain" }));
    const crops = screen.getByText("Cultures & récoltes").closest("article")!;
    await user.click(within(crops).getByRole("button", { name: "Configurer le dossier" }));
    const dossier = screen.getByRole("dialog", { name: "Cultures & récoltes" });
    await user.type(within(dossier).getByRole("textbox", { name: "Nom de la culture *" }), "Tomates");
    await user.type(within(dossier).getByRole("textbox", { name: "Espèce / variété *" }), "Roma");
    await user.type(within(dossier).getByRole("textbox", { name: "Ferme / parcelle *" }), "A1");
    await user.click(within(dossier).getByRole("button", { name: "Créer le dossier" }));
    await user.click(within(dossier).getByRole("button", { name: "Fichiers & images" }));
    expect(within(dossier).getByLabelText("Prendre une photo")).toHaveAttribute("capture", "environment");
    await user.upload(within(dossier).getByLabelText("Charger une photo"), new File(["pixels"], "plant.jpg", { type: "image/jpeg" }));
    expect(await within(dossier).findByAltText("plant.jpg")).toBeVisible();
    expect(within(dossier).getByRole("status")).toHaveTextContent("Image « plant.jpg » ajoutée");
  });

  test("GX-COMMS-001: an employee keeps channel coordinates and a manual incoming thread without claiming a connection", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<GXApp />);
    await user.click(desktopNavigation().getByRole("button", { name: "Entreprise" }));
    await user.click(screen.getAllByRole("button", { name: "Configurer le dossier" })[1]!);
    const dossier = screen.getByRole("dialog", { name: "Créer un employé GX" });
    await user.type(within(dossier).getByRole("textbox", { name: "Nom du poste GX *" }), "Conseiller culture");
    await user.type(within(dossier).getByRole("textbox", { name: "Rôle et raison d’être *" }), "Suivre les cultures");
    await user.type(within(dossier).getByRole("textbox", { name: "Organisation *" }), "Agrix");
    await user.type(within(dossier).getByRole("textbox", { name: "Adresse email de contact" }), "equipe@example.org");
    await user.type(within(dossier).getByRole("textbox", { name: "Numéro WhatsApp avec indicatif" }), "+2250700000000");
    await user.click(within(dossier).getByRole("button", { name: "Enregistrer le brouillon" }));
    await user.click(within(dossier).getByRole("button", { name: "Échanges" }));
    expect(within(dossier).getAllByText(/Non connecté · réception et envoi indisponibles/)).toHaveLength(2);
    await user.type(within(dossier).getByRole("textbox", { name: "Message reçu à copier" }), "Quel est le suivi de ma culture ?");
    await user.click(within(dossier).getByRole("button", { name: "Ajouter au journal local" }));
    expect(within(dossier).getByText("Quel est le suivi de ma culture ?")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("GX-AGRO-003: workspace preferences save locally without storing the access code", async () => {
    const user = userEvent.setup();
    render(<GXApp />);
    await user.click(screen.getByRole("button", { name: "Paramètres" }));
    await user.type(screen.getByRole("textbox", { name: "Localité principale" }), "Abidjan");
    await user.type(screen.getByLabelText("Code de test local GX.ai"), "code-test");
    await user.click(screen.getByRole("button", { name: "Enregistrer les préférences" }));

    expect(screen.getByRole("status")).toHaveTextContent("Préférences enregistrées");
    const saved = window.localStorage.getItem("gx.ai.workspace.preferences.v1") ?? "";
    expect(saved).toContain("Abidjan");
    expect(saved).not.toContain("code-test");
  });

  test("GX-SET-001: privacy and diagnostics tabs explain the local data and capabilities", async () => {
    const user = userEvent.setup();
    render(<GXApp />);
    await user.click(screen.getByRole("button", { name: "Paramètres" }));
    await user.click(screen.getByRole("tab", { name: "Confidentialité" }));
    expect(screen.getByRole("button", { name: "Exporter les données locales" })).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Diagnostics" }));
    expect(screen.getByText("Connexion et exécution non disponibles")).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Général" }));
    expect(screen.getByLabelText("Code de test local GX.ai")).toBeVisible();
  });

  test("GX-VOICE-UI-001: voice controls explain the missing access code", async () => {
    const user = userEvent.setup();
    render(<GXApp />);
    await user.click(desktopNavigation().getByRole("button", { name: "Discuter avec GX.ai" }));
    expect(screen.getByRole("button", { name: "Joindre un document" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Discussion vocale" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Dicter un message" }));
    expect(screen.getByText(/Ajoutez le code de test local GX.ai/)).toBeVisible();
    expect(screen.getByText(/GX peut faire des erreurs/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Politique de confidentialité" })).toHaveAttribute("href", "https://agrix.africa/privacy");
  });

  test("GX-UI-006: a session conversation can be selected", async () => {
    const user = userEvent.setup();
    render(<GXApp />);

    expect(screen.getByText("Aucune conversation.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "New conversation GX.ai" }));
    await user.type(screen.getByRole("textbox", { name: "Écrivez à GX.ai" }), "Préparer la récolte");
    await user.click(screen.getByRole("button", { name: "Envoyer le message" }));
    await user.click(desktopNavigation().getByRole("button", { name: "Bureau" }));
    const conversation = screen.getByRole("button", { name: "Préparer la récolte" });
    await user.click(conversation);

    expect(screen.getByRole("heading", { name: "Préparer la récolte" })).toBeVisible();
    expect(conversation).toHaveAttribute("aria-current", "page");
  });

  test("GX-UI-007: a message is displayed and requests an access code when missing", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<GXApp />);

    await user.click(screen.getByRole("button", { name: "New conversation GX.ai" }));

    const composer = screen.getByRole("textbox", { name: "Écrivez à GX.ai" });
    await user.type(composer, "Préparer notre prochain point de travail.");
    await user.click(screen.getByRole("button", { name: "Envoyer le message" }));

    expect(within(screen.getByRole("article")).getByText("Préparer notre prochain point de travail.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Préparer notre prochain point de travail." })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Ajoutez le code de test local GX.ai");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("GX-CHAT-UI-001: sends the conversation and displays the GX.ai reply", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: "Voici une première proposition." }),
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: "Voici la suite." }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<GXApp />);

    await user.click(screen.getByRole("button", { name: "Paramètres" }));
    await user.type(screen.getByLabelText("Code de test local GX.ai"), "code-test");
    await user.click(screen.getByRole("button", { name: "New conversation GX.ai" }));
    await user.type(screen.getByRole("textbox", { name: "Écrivez à GX.ai" }), "Bonjour GX.ai");
    await user.click(screen.getByRole("button", { name: "Envoyer le message" }));

    expect(await screen.findByText("Voici une première proposition.")).toBeVisible();
    expect(within(screen.getAllByRole("article")[0]!).getByText("Bonjour GX.ai")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith("/api/chat", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer code-test" }),
      body: JSON.stringify({ messages: [{ role: "user", content: "Bonjour GX.ai" }] }),
    }));

    await user.type(screen.getByRole("textbox", { name: "Écrivez à GX.ai" }), "Et ensuite ?");
    await user.click(screen.getByRole("button", { name: "Envoyer le message" }));
    expect(await screen.findByText("Voici la suite.")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(JSON.stringify({ messages: [
      { role: "user", content: "Bonjour GX.ai" },
      { role: "assistant", content: "Voici une première proposition." },
      { role: "user", content: "Et ensuite ?" },
    ] }));
  });

  test("GX-CHAT-UI-002: shows a server failure without naming the provider", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "GX.ai est momentanément indisponible." }),
    }));
    render(<GXApp />);

    await user.click(screen.getByRole("button", { name: "Paramètres" }));
    await user.type(screen.getByLabelText("Code de test local GX.ai"), "code-test");
    await user.click(screen.getByRole("button", { name: "New conversation GX.ai" }));
    await user.type(screen.getByRole("textbox", { name: "Écrivez à GX.ai" }), "Bonjour");
    await user.click(screen.getByRole("button", { name: "Envoyer le message" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("GX.ai est momentanément indisponible.");
  });

  test("GX-CORE-014: stopping a reply aborts the network request", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((_url: string, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    }));
    vi.stubGlobal("fetch", fetchMock);
    render(<GXApp />);
    await user.click(screen.getByRole("button", { name: "Paramètres" }));
    await user.type(screen.getByLabelText("Code de test local GX.ai"), "code-test");
    await user.click(screen.getByRole("button", { name: "New conversation GX.ai" }));
    await user.type(screen.getByRole("textbox", { name: "Écrivez à GX.ai" }), "Prépare un plan");
    await user.click(screen.getByRole("button", { name: "Envoyer le message" }));
    await user.click(await screen.findByRole("button", { name: "Arrêter GX" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Génération arrêtée");
    expect((fetchMock.mock.calls[0]?.[1]?.signal as AbortSignal).aborted).toBe(true);
    expect(screen.queryByRole("button", { name: "Arrêter GX" })).not.toBeInTheDocument();
  });

  test("GX-A11Y-001: primary controls expose labels and accept keyboard focus", async () => {
    const user = userEvent.setup();
    render(<GXApp />);

    const office = desktopNavigation().getByRole("button", { name: "Bureau" });
    office.focus();
    expect(office).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("view-office")).toBeVisible();
  });

  test("GX-CORE-UI-001: safe Rust system information is rendered by the desktop shell", async () => {
    const user = userEvent.setup();
    render(
      <GXApp
        runtime="desktop"
        systemInfo={{ platform: "windows", architecture: "x86_64", appVersion: "0.1.0" }}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "GX.ai Desktop 0.1.0 · windows · x86_64",
    );
    await user.click(screen.getByRole("button", { name: "New conversation GX.ai" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "GX.ai Desktop 0.1.0 · windows · x86_64",
    );
  });
});
