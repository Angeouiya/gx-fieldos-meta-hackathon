/** Curated excerpts of the Meta results obtained on the 20-view project on 2026-10-31.
 * The local demo replays these saved findings when the test API key is out of credit.
 * They are not a new inference and are not a diagnosis of a real parcel.
 */
type Scan = { id: string; title: string };

const observations: Record<string, { summary: string; views: string[]; missing: string[] }> = {
  "01": {
    summary: "The views show rows of leafy vegetables, reddish paths, shade netting and a wet lower channel. Their exact positions, crop identities and relationship to one parcel remain unverified.",
    views: [
      "Parallel vegetable rows, a reddish footpath, banana plants and a distant water body are visible.",
      "Leafy rows, onion-like plants and black shade netting are visible; irrigation method is not shown.",
      "A central path separates beds; the skyline and water body appear behind the site.",
      "A shallow muddy channel with visible water runs beside the beds; its source and outlet are unknown.",
    ],
    missing: ["GPS perimeter and measured area", "Soil profile and laboratory results", "Water source, quality and reliability", "Bed IDs and crop history"],
  },
  "02": {
    summary: "The images show red-brown cloddy and granular soil at several apparent sampling views. A photograph cannot establish soil texture class, fertility or pH.",
    views: [
      "Gloved hands hold a crumbly red-brown clod and a partly filled sample bag beside a ruler.",
      "A shallow pit exposes loose aggregates and a darker lower face; depth is not measurable.",
      "A gloved hand holds granular soil and a larger rounded clod; particle proportions are not measurable.",
      "A furrow contains rough red-brown clods and scattered dry residue between crop rows.",
    ],
    missing: ["Numbered sample positions and depths", "Field texture-by-feel record", "Laboratory pH, organic matter and nutrient results", "Infiltration and rainfall history"],
  },
  "03": {
    summary: "Broad green leaves show small holes and pale speckling in some views. Cause, incidence, crop identity and representativeness are not established.",
    views: [
      "A person examines a broad green leaf with a magnifier; tiny dark specks are visible.",
      "Rosette plants have small holes in several leaves and pale speckling on some lower leaves.",
      "A backlit broad leaf shows prominent venation, a few holes and tiny dark specks.",
      "Leafy rows differ in apparent size; the image does not establish the cause.",
    ],
    missing: ["Confirmed crop and variety", "Affected-plant counts by bed", "Dated upper and underside photographs", "Recent irrigation and input history"],
  },
  "04": {
    summary: "The four views are visually consistent as a drip-irrigation scene with a lined reservoir, valve and laterals. They do not establish volume, flow, pressure, quality, reliability or legal access.",
    views: [
      "A lined reservoir holds water; a hose and red-handled valve are visible on the bank.",
      "A hose enters reservoir water with ripples; whether water is entering or leaving is unknown.",
      "Black pipes form a manifold with a red wheel valve; small droplets are visible at fittings.",
      "One emitter visibly wets a patch beside a leafy plant; system-wide uniformity is unknown.",
    ],
    missing: ["Legal water access", "Reservoir volume and refill rate", "Measured zone flow and pressure", "Laboratory water-quality results"],
  },
  "05": {
    summary: "The views show paths, bamboo or wire fences, vegetable beds and a channel or depression near cropped areas. Exact edges, drainage function and legal boundaries are not verified.",
    views: [
      "A bamboo fence and narrow red-earth path border vegetable beds and vegetation.",
      "Wire fencing on wooden posts borders a path; its relationship to the first edge is unknown.",
      "A curved path follows beds beside a narrow channel with brownish standing water.",
      "A fence and shallow depression run near banana plants; drainage function is uncertain.",
    ],
    missing: ["Surveyed boundary or GPS polygon", "Dated repeatable photo points", "Ground observation of drainage after rain", "Confirmation of edge direction and ownership"],
  },
};

export function replayScanResult(title: string) {
  const key = title.slice(0, 2);
  const data = observations[key];
  if (!data) throw new Error("No saved Meta result for this scan.");
  return {
    summary: data.summary,
    viewFindings: data.views.map((finding, index) => ({ viewIndex: index + 1,
      observations: [finding], uncertainty: "Generated sample image; exact location and measurements are unverified." })),
    actions: [], missingEvidence: data.missing, sources: [],
  };
}

export function replayPlanResult(scans: Scan[]) {
  const id = (prefix: string) => scans.find((scan) => scan.title.startsWith(prefix))?.id ?? "";
  return {
    summary: "All five scans are compared. Visual findings suggest sloping vegetable beds, red-brown cloddy soil, drip infrastructure and leaf holes or speckling. Crop identity, soil chemistry, parcel area, water capacity and boundaries remain unverified.",
    findings: [
      "Site: vegetable rows, paths, shade netting and a wet lower channel are visible; species unconfirmed.",
      "Soil: red-brown clods are visible; texture, pH, fertility and sampling positions are unmeasured.",
      "Plants: some leaves show holes and speckling; cause and incidence are unknown.",
      "Water: reservoir, valve and drip lateral are visible; capacity, quality and reliability are unknown.",
      "Boundaries: fences and paths are visible; legal limits and drainage function are unverified.",
    ],
    uncertainties: ["Generated images are not georeferenced and cannot measure area or slope.",
      "No laboratory soil or water results, yield, price, dose or legal authorisation is established.",
      "Crop and variety names remain visual hypotheses; planting dates and history are missing."],
    recommendations: [
      { title: "Measure parcel and microzones", rationale: "Area, slope and boundaries cannot be inferred reliably from the images.", sourceUrls: [], sourceStatus: "not_locally_verified", checks: ["GPS polygon", "Boundary status", "Dated photo points"] },
      { title: "Test soil and water", rationale: "Visible colour and infrastructure do not establish fertility or water quality.", sourceUrls: [], sourceStatus: "not_locally_verified", checks: ["Mapped samples", "Laboratory results", "Reservoir capacity and flow"] },
      { title: "Scout leaves without diagnosing", rationale: "Holes and speckling are visible, but their cause and incidence are unknown.", sourceUrls: [], sourceStatus: "not_locally_verified", checks: ["Confirm crop", "Count affected plants", "Seek local agronomic review"] },
    ],
    nextActions: ["Complete GPS, soil, water and drainage checks before approving a crop or budget.",
      "Tag beds and repeat dated photographs from fixed positions.",
      "Confirm local crop suitability, inputs and buyers with primary sources.",
      "Record actual operations, costs, weights and sales separately from assumptions."],
    comparisons: [
      { finding: "Overview and boundary views both show beds beside paths and a wet channel.", scanIds: [id("01"), id("05")], uncertainty: "The same edge and drainage path are not proven." },
      { finding: "Red-brown soil appears around broad leafy rows in soil and plant views.", scanIds: [id("02"), id("03")], uncertainty: "No shared sample point or measured property links them." },
      { finding: "Water infrastructure might serve the cropped area in the overview.", scanIds: [id("04"), id("01")], uncertainty: "Coverage and water source are not established." },
    ],
    cropCandidates: [
      { name: "Leafy greens — trial hypothesis", rationale: "Lettuce-like rosettes recur across views.", evidenceIds: [id("01"), id("03"), id("05")], sourceUrls: [], missingChecks: ["Confirm crop identity", "Soil and water tests", "Season and buyer check"], sourceStatus: "not_locally_verified" },
      { name: "Brassica-like crops — trial hypothesis", rationale: "Some larger blue-green leaves resemble brassicas.", evidenceIds: [id("01")], sourceUrls: [], missingChecks: ["Confirm variety", "Soil pH and nutrients", "Local season"], sourceStatus: "not_locally_verified" },
      { name: "Onion-like crops — trial hypothesis", rationale: "Upright onion-like rows recur in several views.", evidenceIds: [id("01"), id("05")], sourceUrls: [], missingChecks: ["Confirm species", "Drainage", "Local market"], sourceStatus: "not_locally_verified" },
    ],
    journey: [
      ["assessment", "Assessment and crop choice", "Map GPS polygon, beds, slope, paths and water points."],
      ["clearing", "Clearing and constraints", "Clear only confirmed work areas and protect drainage and access."],
      ["soil_preparation", "Soil and water preparation", "Use laboratory results before amendments or irrigation design."],
      ["planting", "Sowing or planting", "Start small verified trial beds after soil and water checks."],
      ["maintenance", "Maintenance and checks", "Record scouting counts, emitter uniformity and drainage."],
      ["harvest", "Harvest", "Weigh quality and losses by tagged bed and date."],
      ["postharvest", "Sorting and storage", "Sort, shade and track losses and batches."],
      ["sale", "Sale and lessons learned", "Compare dated receipts and real costs with the plan."],
    ].map(([phase, label, action]) => ({ phase, label, actions: [action], checks: ["Owner review and local verification"], status: "needs_input" })),
  };
}
