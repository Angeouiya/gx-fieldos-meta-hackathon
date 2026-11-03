import { workspaces, type WorkspaceDefinition, type WorkspaceId, type WorkspaceModule } from "./workspace-data";

type ModuleCopy = Pick<WorkspaceModule, "title" | "description" | "prompt"> & { cta?: string };

const sections: Record<WorkspaceId, Pick<WorkspaceDefinition, "title" | "description" | "highlight"> & { categories: Record<string, string> }> = {
  office: {
    title: "The tools GX needs, in one place.",
    description: "Prepare devices, applications, accounts, files and channels. A setup draft never grants access by itself.",
    highlight: "Real connections must be enabled separately.",
    categories: { all: "All", devices: "Devices", access: "Access", files: "Files" },
  },
  company: {
    title: "Who GX works for and what it may do.",
    description: "Set up organizations, GX staff roles, responsibilities and approval rules.",
    highlight: "A configured GX employee remains a local draft until explicitly activated.",
    categories: { all: "All", structure: "Organization", people: "GX staff", rules: "Rules", learning: "Training" },
  },
  projects: {
    title: "From an agricultural project to execution.",
    description: "Bring objectives, budget, dates, team, steps and documents together.",
    highlight: "These workbench drafts are saved on this device.",
    categories: { all: "All", planning: "Plan", operations: "Track", value: "Value chain" },
  },
  field: {
    title: "Ground truth guides every action.",
    description: "Track farms, crops and interventions, and prepare livestock, input and harvest decisions.",
    highlight: "Farm, crop and task actions use your AGRIX account after review.",
    categories: { all: "Overview", plant: "Crop production", animal: "Livestock", operations: "Operations" },
  },
};

const modules: Record<string, ModuleCopy> = {
  computer: { title: "Computers", description: "Plan a local or cloud workstation for GX.", prompt: "Define GX computer requirements. Distinguish local hardware from cloud services and do not claim a machine has been provisioned." },
  applications: { title: "Applications and tools", description: "Identify useful software and required permissions.", prompt: "Prepare an inventory of necessary applications and permissions that need separate approval." },
  accounts: { title: "Accounts and WhatsApp", description: "Plan email, calendar and professional channels.", prompt: "Prepare the requested business connections. Never claim a channel is connected without technical verification." },
  folder: { title: "Folders and storage", description: "Organize files, read documents and export deliverables.", prompt: "Organize this work folder, its sources and permissions. Cloud storage requires a real connection." },
  organization: { title: "Organization", description: "Name, activity, country, team and guidance.", prompt: "Help structure the organization and its guidance without inventing facts." },
  employee: { title: "Create a GX employee", description: "Role, manager, responsibilities and resources.", prompt: "Prepare a GX employee role, responsibilities, manager and resources. Do not activate it without approval." },
  authority: { title: "Permissions and approvals", description: "Define what GX may do, must confirm or may not do.", prompt: "Define precise permissions for a GX employee. Apply the most restrictive rule." },
  communications: { title: "Business communication", description: "WhatsApp, email, reports and human escalation.", prompt: "Prepare communication rules. No external message is sent without an active connection and authorization." },
  course: { title: "Create training", description: "Prepare and review a course draft in AGRIX.", cta: "Create with GX in AGRIX", prompt: "Prepare an agricultural training program using the supplied sources." },
  "project-plan": { title: "Create a project", description: "Objectives, sector, location, budget, stages and outcomes.", prompt: "Build an agricultural project plan from the folder. Flag missing information and required approvals. Do not invent figures." },
  "project-review": { title: "Project review", description: "Blockers, decisions and next steps.", prompt: "Prepare a project review with priorities, blockers and owners." },
  time: { title: "Schedule and time", description: "Deadlines, availability and task allocation.", prompt: "Prepare an agricultural schedule and identify conflicts." },
  processing: { title: "Food processing", description: "Processes, equipment and quality control.", prompt: "Prepare a food processing project from the folder." },
  quality: { title: "Quality and traceability", description: "Batches, checks, risks and corrective actions.", prompt: "Prepare a quality and traceability sheet for this product or batch." },
  supply: { title: "Sourcing", description: "Materials, suppliers and purchasing criteria.", prompt: "Prepare an agricultural sourcing plan." },
  recipes: { title: "Gastronomy", description: "Menus, products and production sheets.", prompt: "Prepare a culinary offer using local agricultural products." },
  "product-analysis": { title: "Products and images", description: "Describe a product and review its photos.", prompt: "Analyze this agricultural or processed product using its folder and images." },
  tasks: { title: "AGRIX tasks", description: "Prepare and create an operational task in AGRIX.", cta: "Create with GX in AGRIX", prompt: "Prepare an agricultural operations task folder." },
  farms: { title: "Farms and parcels", description: "Review a farm folder before creating it in AGRIX.", cta: "Create with GX in AGRIX", prompt: "Organize an agricultural farm or parcel folder." },
  crops: { title: "Crops and harvests", description: "Prepare and review a crop linked to a field.", cta: "Create with GX in AGRIX", prompt: "Prepare a complete crop folder from the supplied data." },
  livestock: { title: "Livestock and animal health", description: "Plan herd, feeding, health and breeding records.", prompt: "Structure livestock follow-up. Ask for species, count, place, feed, goals and known health events. Propose a register and checks for veterinary review." },
  feed: { title: "Feed and inputs", description: "Plan seeds, feed, water, fertilizer and other resources.", prompt: "Plan farm inputs from known production, area or herd size, stocks, timing and constraints. Do not invent quantities." },
  "field-tasks": { title: "Field interventions", description: "Prepare a dated intervention for AGRIX.", cta: "Create with GX in AGRIX", prompt: "Prepare a field intervention folder." },
  weather: { title: "Weather and observations", description: "Connect local observations to production decisions.", prompt: "Prepare a field observation log. Ask for location, crop or livestock, date, symptoms and known weather. Separate facts from hypotheses. Do not invent forecasts." },
};

export function englishWorkspace(id: WorkspaceId): WorkspaceDefinition {
  const source = workspaces[id];
  const translated = sections[id];
  return {
    ...source,
    title: translated.title,
    description: translated.description,
    highlight: translated.highlight,
    categories: source.categories.map((category) => ({ ...category, label: translated.categories[category.id] ?? category.label })),
    modules: source.modules.map((module) => ({ ...module, ...modules[module.id] })),
  };
}
