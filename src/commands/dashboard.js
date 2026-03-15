import { launchTUI } from "../features/dashboard/dashboard.js";

export async function runDashboard(options) {
  const { repo } = options;
  await launchTUI(repo);
}
