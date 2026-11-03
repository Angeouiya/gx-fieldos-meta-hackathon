import { useCallback, useState, type ReactNode } from "react";

import { Icon } from "../components/Icon";
import { LegalNotice } from "../components/LegalNotice";
import { ModuleWorkbench } from "../components/ModuleWorkbench";
import type { RunWorkTask } from "../types";
import { workspaces, type WorkspaceId, type WorkspaceModule } from "../workspace-data";
import { englishWorkspace } from "../workspace-data-en";

interface WorkspaceProps {
  english?: boolean;
  id: WorkspaceId;
  onStartPlan: (prompt: string) => void;
  onRunTask: RunWorkTask;
  footer?: ReactNode;
  legalBaseUrl?: string;
}

export function Workspace({ english = false, id, onStartPlan, onRunTask, footer, legalBaseUrl }: WorkspaceProps) {
  const definition = english ? englishWorkspace(id) : workspaces[id];
  const label = english ? id === "office" ? "Workspace" : id === "company" ? "Business" : id === "projects" ? "Projects" : "Field" : id === "office" ? "Bureau" : id === "company" ? "Entreprise" : id === "projects" ? "Projets" : "Terrain";
  const [category, setCategory] = useState("all");
  const [selectedModule, setSelectedModule] = useState<WorkspaceModule | null>(null);
  const closeWorkbench = useCallback(() => setSelectedModule(null), []);
  const visibleModules = category === "all"
    ? definition.modules
    : definition.modules.filter((module) => module.category === category);

  return (
    <section className="gx-workspace" aria-labelledby={`gx-${id}-title`} data-testid={`view-${id}`}>
      <div className="gx-workspace-inner">
        <header className="gx-workspace-header">
          <div>
            <h1 id={`gx-${id}-title`}>{label}</h1>
            <p className="gx-workspace-subtitle">{definition.title}</p>
            <p className="gx-workspace-description">{definition.description}</p>
          </div>
        </header>

        <div className="gx-workspace-toolbar">
          <div>
            <span className="gx-section-kicker">{english ? "FUNCTIONS" : "FONCTIONS"}</span>
            <h2>{english ? "Your workspace" : "Votre espace de travail"}</h2>
          </div>
          <p>{definition.highlight}</p>
        </div>

        <div className="gx-workspace-tabs" role="tablist" aria-label={`${english ? "Categories" : "Domaines"} ${label}`}>
          {definition.categories.map((item) => (
            <button
              key={item.id}
              id={`gx-${id}-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={category === item.id}
              aria-controls={`gx-${id}-modules`}
              className={category === item.id ? "is-active" : ""}
              onClick={() => setCategory(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div
          id={`gx-${id}-modules`}
          className="gx-module-grid"
          role="tabpanel"
          aria-labelledby={`gx-${id}-tab-${category}`}
        >
          {visibleModules.map((module) => (
            <article className="gx-module-card" key={module.id}>
              <span className="gx-module-icon"><Icon name={module.icon} /></span>
              <div className="gx-module-copy">
                <h3>{module.title}</h3>
                <p>{module.description}</p>
              </div>
              {module.prompt ? (
                <button className="gx-module-action" type="button" onClick={() => setSelectedModule(module)}>
                  {english ? "Configure folder" : "Configurer le dossier"} <Icon name="arrow-up" />
                </button>
              ) : null}
              {module.action === "agrix" && module.href ? (
                <a className="gx-module-action" href={module.href} target="_blank" rel="noopener noreferrer">
                  {module.cta ?? (english ? "Manage in AGRIX" : "Gérer dans Agrix")} <Icon name="external" />
                </a>
              ) : null}
            </article>
          ))}
        </div>

        <footer className="gx-workspace-footer">
          <div>
            <strong>{english ? "One action at a time." : "Une action à la fois."}</strong>
            <span>{english ? "GX.ai prepares analyses and plans. Changes in AGRIX still require your action and approval." : "GX.ai prépare les analyses et plans. Les changements dans Agrix restent soumis à vos actions et validations."}</span>
            <LegalNotice baseUrl={legalBaseUrl} english={english} />
          </div>
          {footer}
        </footer>
      </div>
      {selectedModule ? <ModuleWorkbench key={selectedModule.id} module={selectedModule} onClose={closeWorkbench} onStartPlan={onStartPlan} onRunTask={onRunTask} english={english} /> : null}
    </section>
  );
}
