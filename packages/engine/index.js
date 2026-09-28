/**
 * RTI Project Estimator deterministic sizing engine.
 *
 * Pure functions only: no DB, network, AI, clock, or hidden commercial values.
 * All commercial inputs must be passed explicitly from approved RTI policy data.
 */

export function roundUp(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.ceil((Number(value) || 0) * factor) / factor;
}

export function tshirtFromMd(md) {
  const value = Math.max(0, Number(md) || 0);
  if (value <= 5) return 'XS';
  if (value <= 12) return 'S';
  if (value <= 25) return 'M';
  if (value <= 45) return 'L';
  if (value <= 80) return 'XL';
  return 'XXL';
}

export function uncertaintyFactor(confidenceScore) {
  const score = Math.max(0, Math.min(100, Number(confidenceScore) || 0));
  if (score >= 85) return 0.10;
  if (score >= 70) return 0.20;
  if (score >= 50) return 0.35;
  return 0.50;
}

export function computeDurationRange({
  executionMd,
  squadSize = 1,
  efficiency = 0.85,
  nonExecutionDays = 0,
  confidenceScore = 70,
}) {
  const md = Math.max(0, Number(executionMd) || 0);
  const squad = Math.max(1, Number(squadSize) || 1);
  const eff = Math.max(0.1, Math.min(1, Number(efficiency) || 0.85));
  const p50Days = Math.max(1, Math.ceil(md / squad / eff) + Math.max(0, Number(nonExecutionDays) || 0));
  const p80Days = Math.ceil(p50Days * (1 + uncertaintyFactor(confidenceScore)));
  const p50Weeks = Math.max(1, Math.floor(p50Days / 5));
  const p80Weeks = Math.max(p50Weeks + 1, Math.ceil(p80Days / 5));
  return { p50Days, p80Days, p50Weeks, p80Weeks };
}

export function computeVaptWebMd({
  complexity = 'Medium',
  roles = 0,
  endpoints = 0,
  box = 'Grey',
  auth = 'Basic',
  compliance = 'umum',
}) {
  const base = { Simple: 3, Medium: 5, Complex: 8, Critical: 12 }[complexity] ?? 5;
  const boxFactor = { Black: 1.0, Grey: 1.2, White: 1.5 }[box] ?? 1.0;
  const authFactor = { Basic: 1.0, SSO: 1.1, MFA: 1.2, 'PKI/IdAM': 1.3 }[auth] ?? 1.0;
  const complianceFactor = {
    umum: 1.0,
    ASVS: 1.1,
    regulator: 1.2,
    'PCI-DSS': 1.3,
  }[compliance] ?? 1.0;

  const raw = (base + Math.max(0, Number(roles) || 0) * 0.5 + Math.ceil(Math.max(0, Number(endpoints) || 0) / 25)) *
    boxFactor * authFactor * complianceFactor;
  return Math.ceil(raw);
}

export function computeVaptMobileMd({
  apps = 1,
  platform = 'Android',
  feature = 'Basic',
  backend = 'tanpa',
}) {
  const base = { Android: 4, iOS: 4, Dual: 7 }[platform] ?? 4;
  const featureFactor = { Basic: 1.0, Payment: 1.3, 'Biometric/NFC': 1.4, 'Offline/PKI': 1.5 }[feature] ?? 1.0;
  const backendFactor = backend === 'dengan' ? 1.5 : 1.0;
  return Math.ceil(Math.max(1, Number(apps) || 1) * base * featureFactor * backendFactor);
}

export function computeVaptApiMd({
  endpoints = 0,
  auth = 'Basic',
  documentation = 'Swagger',
}) {
  const authFactor = { Basic: 1.0, SSO: 1.1, MFA: 1.2, 'PKI/IdAM': 1.3 }[auth] ?? 1.0;
  const docFactor = { Swagger: 1.0, terbatas: 1.2, tanpa: 1.4 }[documentation] ?? 1.0;
  return Math.ceil(Math.max(3, Math.ceil(Math.max(0, Number(endpoints) || 0) / 25) * 1.5) * authFactor * docFactor);
}

export function computeVaptNetworkMd({
  externalIps = 0,
  internalHosts = 0,
  ad = false,
  wifiClusters = 0,
  firewalls = 0,
  cloudAccounts = 0,
}) {
  const raw =
    Math.ceil(Math.max(0, Number(externalIps) || 0) / 50) * 2 +
    Math.ceil(Math.max(0, Number(internalHosts) || 0) / 100) * 3 +
    (ad ? 2 : 0) +
    Math.max(0, Number(wifiClusters) || 0) * 2 +
    Math.max(0, Number(firewalls) || 0) * 1.5 +
    Math.max(0, Number(cloudAccounts) || 0) * 3;
  return Math.max(1, Math.ceil(raw));
}

export function computeSwdevMd({
  features = [],
  integrations = [],
  roles = 0,
  migration = 0,
  design = 'none',
  platform = 'web',
  multiTenant = false,
  securityBaseline = false,
  compliance = false,
  highAvailability = false,
}) {
  const featureMd = { S: 3, M: 6, C: 12, XC: 20 };
  const integrationMd = { sederhana: 3, standar: 5, kompleks: 10 };
  let build =
    features.reduce((sum, item) => sum + (featureMd[item] ?? 0), 0) +
    integrations.reduce((sum, item) => sum + (integrationMd[item] ?? 0), 0) +
    Math.max(0, Number(roles) || 0) +
    Math.max(0, Number(migration) || 0);

  build *= design === 'final' ? 1.05 : 1.20;

  const platformFactor = {
    web: 1.0,
    mobile_single: 1.0,
    native_dual: 1.7,
    cross_platform: 1.25,
    web_mobile: 1.8,
  }[platform] ?? 1.0;
  build *= platformFactor;
  if (multiTenant) build *= 1.2;
  if (securityBaseline) build *= 1.10;
  if (compliance) build *= 1.10;
  if (highAvailability) build *= 1.15;

  const overhead = build * (0.20 + 0.15 + 0.08);
  return Math.ceil(build + overhead);
}

export function computeCodeReviewMd({
  kloc = 0,
  language = 'umum',
  depth = 'manual',
  reportDays = 2,
}) {
  const langFactor = language === 'legacy' ? 1.3 : 1.0;
  const depthFactor = depth === 'sast_triage' ? 0.6 : 1.0;
  return Math.ceil(Math.ceil(Math.max(0, Number(kloc) || 0) / 15) * langFactor * depthFactor + Math.max(0, Number(reportDays) || 0));
}

export function computePricingBands({
  internalCost,
  floorMargin = 0.20,
  segmentMultiplier = 1,
  marketAdjustment = 1,
  premiumFactor = 1.25,
}) {
  const cost = Math.max(0, Number(internalCost) || 0);
  const margin = Math.max(0, Math.min(0.95, Number(floorMargin) || 0));
  const floor = cost / Math.max(0.05, 1 - margin);
  const standard = Math.max(floor, floor * Math.max(0, Number(segmentMultiplier) || 0) * Math.max(0, Number(marketAdjustment) || 0));
  const premium = Math.max(standard, standard * Math.max(1, Number(premiumFactor) || 1));
  return {
    internalCost: Math.round(cost),
    floor: Math.round(floor),
    standard: Math.round(standard),
    premium: Math.round(premium),
  };
}
