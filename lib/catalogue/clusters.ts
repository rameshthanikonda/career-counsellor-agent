import type { CareerCluster } from "@/lib/types";

/**
 * Career clusters are the bridge between assessment scores and options.
 * Each cluster carries an ideal RIASEC profile, the aptitudes the work
 * actually leans on, and a small number of work-style preferences.
 *
 * The numbers are transparent weights designed for explainable matching,
 * not psychometrically normed parameters. Every screen that surfaces a
 * fit score also shows the factors behind it.
 */
export const CAREER_CLUSTERS: CareerCluster[] = [
  {
    id: "engineering",
    name: "Engineering & Built Environment",
    shortName: "Engineering",
    summary:
      "Designing, building and maintaining physical systems — from machines and materials to cities and infrastructure.",
    riasecIdeal: { R: 95, I: 85, A: 25, S: 30, E: 50, C: 60 },
    aptitudeWeights: { numerical: 0.35, verbal: 0.1, logical: 0.35, spatial: 0.2 },
    personalityPreference: {
      conscientiousness: { direction: 1, weight: 0.6 },
      openness: { direction: 1, weight: 0.4 },
    },
    accent: "slateblue",
  },
  {
    id: "data",
    name: "Data, Computing & AI",
    shortName: "Data & AI",
    summary:
      "Working with data, models and software systems to explain the world and automate decisions.",
    riasecIdeal: { R: 55, I: 95, A: 35, S: 35, E: 45, C: 75 },
    aptitudeWeights: { numerical: 0.35, verbal: 0.1, logical: 0.45, spatial: 0.1 },
    personalityPreference: {
      openness: { direction: 1, weight: 0.6 },
      conscientiousness: { direction: 1, weight: 0.4 },
    },
    accent: "evergreen",
  },
  {
    id: "health",
    name: "Health & Life Sciences",
    shortName: "Health",
    summary:
      "Improving physical and mental wellbeing through clinical practice, research and public health.",
    riasecIdeal: { R: 55, I: 80, A: 30, S: 85, E: 40, C: 60 },
    aptitudeWeights: { numerical: 0.2, verbal: 0.3, logical: 0.3, spatial: 0.2 },
    personalityPreference: {
      agreeableness: { direction: 1, weight: 0.6 },
      emotional_stability: { direction: 1, weight: 0.4 },
    },
    accent: "clay",
  },
  {
    id: "business",
    name: "Business & Management",
    shortName: "Business",
    summary:
      "Building products, markets and teams — commercial judgement combined with execution.",
    riasecIdeal: { R: 30, I: 50, A: 40, S: 60, E: 90, C: 65 },
    aptitudeWeights: { numerical: 0.25, verbal: 0.3, logical: 0.35, spatial: 0.1 },
    personalityPreference: {
      extraversion: { direction: 1, weight: 0.6 },
      conscientiousness: { direction: 1, weight: 0.4 },
    },
    accent: "brass",
  },
  {
    id: "finance",
    name: "Finance & Accounting",
    shortName: "Finance",
    summary:
      "Measuring, reporting and allocating capital with accuracy and commercial context.",
    riasecIdeal: { R: 25, I: 65, A: 20, S: 35, E: 65, C: 90 },
    aptitudeWeights: { numerical: 0.45, verbal: 0.15, logical: 0.35, spatial: 0.05 },
    personalityPreference: {
      conscientiousness: { direction: 1, weight: 0.7 },
      emotional_stability: { direction: 1, weight: 0.3 },
    },
    accent: "olive",
  },
  {
    id: "law",
    name: "Law, Policy & Public Administration",
    shortName: "Law & Policy",
    summary:
      "Reasoning from rules and precedent, drafting, advocacy and designing public systems.",
    riasecIdeal: { R: 20, I: 75, A: 35, S: 65, E: 80, C: 70 },
    aptitudeWeights: { numerical: 0.1, verbal: 0.4, logical: 0.4, spatial: 0.1 },
    personalityPreference: {
      openness: { direction: 1, weight: 0.5 },
      conscientiousness: { direction: 1, weight: 0.5 },
    },
    accent: "aubergine",
  },
  {
    id: "design",
    name: "Design & Creative Practice",
    shortName: "Design",
    summary:
      "Shaping products, spaces and experiences where craft, research and originality meet.",
    riasecIdeal: { R: 55, I: 45, A: 95, S: 45, E: 55, C: 30 },
    aptitudeWeights: { numerical: 0.1, verbal: 0.2, logical: 0.25, spatial: 0.45 },
    personalityPreference: {
      openness: { direction: 1, weight: 0.7 },
      conscientiousness: { direction: 1, weight: 0.3 },
    },
    accent: "clay",
  },
  {
    id: "education",
    name: "Education & Social Impact",
    shortName: "Education",
    summary:
      "Helping people learn, grow and navigate transitions — teaching, counselling and programme design.",
    riasecIdeal: { R: 30, I: 55, A: 55, S: 95, E: 50, C: 50 },
    aptitudeWeights: { numerical: 0.1, verbal: 0.35, logical: 0.25, spatial: 0.1 },
    personalityPreference: {
      agreeableness: { direction: 1, weight: 0.7 },
      emotional_stability: { direction: 1, weight: 0.3 },
    },
    accent: "evergreen",
  },
  {
    id: "media",
    name: "Media & Communication",
    shortName: "Media",
    summary:
      "Telling stories and shaping narratives across film, journalism, content and brand.",
    riasecIdeal: { R: 30, I: 45, A: 90, S: 60, E: 70, C: 35 },
    aptitudeWeights: { numerical: 0.05, verbal: 0.45, logical: 0.25, spatial: 0.25 },
    personalityPreference: {
      openness: { direction: 1, weight: 0.6 },
      extraversion: { direction: 1, weight: 0.4 },
    },
    accent: "aubergine",
  },
  {
    id: "environment",
    name: "Environment & Sustainability",
    shortName: "Sustainability",
    summary:
      "Applying science and systems thinking to climate, energy, water and natural resources.",
    riasecIdeal: { R: 80, I: 80, A: 35, S: 55, E: 40, C: 55 },
    aptitudeWeights: { numerical: 0.25, verbal: 0.2, logical: 0.35, spatial: 0.2 },
    personalityPreference: {
      openness: { direction: 1, weight: 0.6 },
      agreeableness: { direction: 1, weight: 0.4 },
    },
    accent: "olive",
  },
  {
    id: "hospitality",
    name: "Hospitality, Travel & Services",
    shortName: "Hospitality",
    summary:
      "Designing and running guest experiences, travel and service operations at scale.",
    riasecIdeal: { R: 40, I: 30, A: 45, S: 75, E: 75, C: 55 },
    aptitudeWeights: { numerical: 0.15, verbal: 0.35, logical: 0.25, spatial: 0.1 },
    personalityPreference: {
      extraversion: { direction: 1, weight: 0.7 },
      agreeableness: { direction: 1, weight: 0.3 },
    },
    accent: "brass",
  },
  {
    id: "public_service",
    name: "Public Service, Defence & Aviation",
    shortName: "Public service",
    summary:
      "Roles with a duty of care to the public — administration, uniformed services and aviation.",
    riasecIdeal: { R: 55, I: 55, A: 25, S: 80, E: 75, C: 70 },
    aptitudeWeights: { numerical: 0.2, verbal: 0.3, logical: 0.3, spatial: 0.2 },
    personalityPreference: {
      conscientiousness: { direction: 1, weight: 0.6 },
      emotional_stability: { direction: 1, weight: 0.4 },
    },
    accent: "slateblue",
  },
];

export const CLUSTER_BY_ID = Object.fromEntries(
  CAREER_CLUSTERS.map((c) => [c.id, c])
) as Record<string, CareerCluster>;
