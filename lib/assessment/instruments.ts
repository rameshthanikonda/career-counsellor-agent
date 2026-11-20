import type { AptitudeDimension, BigFive, Riasec } from "@/lib/types";

export const INSTRUMENT_VERSION = "northstar-cc-1.2.0";
export const INSTRUMENT_NAME = "Northstar Career Compass Battery";

export type SectionKey = "interest" | "aptitude" | "personality";

export interface SectionMeta {
  key: SectionKey;
  title: string;
  eyebrow: string;
  description: string;
  instruction: string;
  minutes: number;
  itemCount: number;
  scoredNote: string;
}

export interface LikertItem {
  id: string;
  dimension: Riasec | BigFive;
  text: string;
  reverse?: boolean;
}

export interface AptitudeItem {
  id: string;
  dimension: AptitudeDimension;
  prompt: string;
  context?: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export const LIKERT_LABELS = [
  "Strongly disagree",
  "Disagree",
  "Neutral",
  "Agree",
  "Strongly agree",
] as const;

export const INTEREST_ITEMS: LikertItem[] = [
  // Realistic — building, tools, physical systems
  { id: "int-r1", dimension: "R", text: "I enjoy taking apart a device to understand how it works." },
  { id: "int-r2", dimension: "R", text: "I would rather build a working prototype than write about the idea." },
  { id: "int-r3", dimension: "R", text: "Hands-on work with tools, machines or materials appeals to me." },
  { id: "int-r4", dimension: "R", text: "I like fieldwork that takes me outdoors or onto a site." },
  { id: "int-r5", dimension: "R", text: "I am drawn to problems where the answer must work in the physical world." },
  { id: "int-r6", dimension: "R", text: "I would enjoy operating or tuning complex equipment." },

  // Investigative — research, analysis, evidence
  { id: "int-i1", dimension: "I", text: "I like digging into data until a pattern becomes clear." },
  { id: "int-i2", dimension: "I", text: "I enjoy forming a hypothesis and testing it carefully." },
  { id: "int-i3", dimension: "I", text: "I read about scientific or technical ideas for pleasure." },
  { id: "int-i4", dimension: "I", text: "I would enjoy a role where most of the work is analysis and reasoning." },
  { id: "int-i5", dimension: "I", text: "I keep asking 'why' until I reach the root cause." },
  { id: "int-i6", dimension: "I", text: "I like problems that have no obvious method at first." },

  // Artistic — expression, design, originality
  { id: "int-a1", dimension: "A", text: "I enjoy making things that are visually or emotionally expressive." },
  { id: "int-a2", dimension: "A", text: "I often imagine alternative ways a product or story could look or feel." },
  { id: "int-a3", dimension: "A", text: "Writing, sketching or composing helps me think." },
  { id: "int-a4", dimension: "A", text: "I would rather create an original concept than refine an existing one." },
  { id: "int-a5", dimension: "A", text: "I notice typography, colour and layout in everyday objects." },
  { id: "int-a6", dimension: "A", text: "I enjoy work where there is no single correct answer." },

  // Social — helping, teaching, care
  { id: "int-s1", dimension: "S", text: "I find it rewarding to help someone understand something difficult." },
  { id: "int-s2", dimension: "S", text: "People often come to me to talk through their problems." },
  { id: "int-s3", dimension: "S", text: "I would enjoy work that directly improves someone's wellbeing." },
  { id: "int-s4", dimension: "S", text: "I listen carefully before offering advice." },
  { id: "int-s5", dimension: "S", text: "I am comfortable explaining ideas to a group with mixed abilities." },
  { id: "int-s6", dimension: "S", text: "I would like a career where relationships are central, not incidental." },

  // Enterprising — leading, persuading, building ventures
  { id: "int-e1", dimension: "E", text: "I enjoy persuading others to back an idea I believe in." },
  { id: "int-e2", dimension: "E", text: "I would like to lead a team or launch something of my own." },
  { id: "int-e3", dimension: "E", text: "Negotiating and closing a deal energises me." },
  { id: "int-e4", dimension: "E", text: "I am comfortable making decisions with incomplete information." },
  { id: "int-e5", dimension: "E", text: "I like setting ambitious targets and mobilising people towards them." },
  { id: "int-e6", dimension: "E", text: "I would enjoy representing an organisation in front of clients." },

  // Conventional — structure, accuracy, process
  { id: "int-c1", dimension: "C", text: "I like having a clear process and following it precisely." },
  { id: "int-c2", dimension: "C", text: "I enjoy organising information so that others can find it easily." },
  { id: "int-c3", dimension: "C", text: "I am meticulous about accuracy in numbers and records." },
  { id: "int-c4", dimension: "C", text: "I would be comfortable working within well-defined rules and standards." },
  { id: "int-c5", dimension: "C", text: "I like planning resources and timelines in detail." },
  { id: "int-c6", dimension: "C", text: "I find satisfaction in completing a checklist accurately." },
];

export const APTITUDE_ITEMS: AptitudeItem[] = [
  // Numerical
  {
    id: "apt-n1",
    dimension: "numerical",
    prompt: "A programme's annual fee rises from ₹2,40,000 to ₹3,00,000. What is the percentage increase?",
    options: ["20%", "25%", "30%", "35%"],
    answerIndex: 1,
    explanation: "Increase = ₹60,000. 60,000 ÷ 2,40,000 = 0.25, i.e. 25%.",
  },
  {
    id: "apt-n2",
    dimension: "numerical",
    prompt: "A cohort of 64 learners is split in the ratio 3 : 5. How many are in the larger group?",
    options: ["24", "32", "40", "44"],
    answerIndex: 2,
    explanation: "8 parts = 64, so one part = 8. Larger group = 5 × 8 = 40.",
  },
  {
    id: "apt-n3",
    dimension: "numerical",
    prompt: "Eight counsellors advise 120 learners over 3 days. What is the average number of learners per counsellor per day?",
    options: ["4", "5", "6", "8"],
    answerIndex: 1,
    explanation: "120 ÷ 8 = 15 learners per counsellor over 3 days; 15 ÷ 3 = 5 per day.",
  },
  {
    id: "apt-n4",
    dimension: "numerical",
    prompt: "What number continues the series? 2, 6, 12, 20, 30, __",
    options: ["36", "40", "42", "44"],
    answerIndex: 2,
    explanation: "Differences are 4, 6, 8, 10, so the next difference is 12: 30 + 12 = 42.",
  },
  {
    id: "apt-n5",
    dimension: "numerical",
    prompt: "The average of five test scores is 72. One score of 60 is removed. What is the average of the remaining four?",
    options: ["74", "75", "76", "78"],
    answerIndex: 1,
    explanation: "Total = 5 × 72 = 360. Remove 60 → 300 over 4 scores = 75.",
  },
  {
    id: "apt-n6",
    dimension: "numerical",
    prompt: "15% of a study budget is ₹45,000. What is the full budget?",
    options: ["₹2,70,000", "₹3,00,000", "₹3,30,000", "₹3,60,000"],
    answerIndex: 1,
    explanation: "If 15% = 45,000, then 100% = 45,000 ÷ 0.15 = ₹3,00,000.",
  },

  // Verbal
  {
    id: "apt-v1",
    dimension: "verbal",
    prompt: "Choose the word closest in meaning to 'meticulous'.",
    options: ["Careless", "Thorough", "Hurried", "Flexible"],
    answerIndex: 1,
    explanation: "Meticulous means showing great attention to detail — thorough.",
  },
  {
    id: "apt-v2",
    dimension: "verbal",
    prompt: "Choose the word most opposite in meaning to 'transparent'.",
    options: ["Clear", "Opaque", "Honest", "Fragile"],
    answerIndex: 1,
    explanation: "Transparent allows light through; opaque does not.",
  },
  {
    id: "apt-v3",
    dimension: "verbal",
    prompt: "Complete the analogy. Curriculum : Course :: Blueprint : __",
    options: ["Architect", "Building", "Drawings", "Concrete"],
    answerIndex: 1,
    explanation: "A curriculum structures a course; a blueprint structures a building.",
  },
  {
    id: "apt-v4",
    dimension: "verbal",
    prompt: "Select the best word. 'The report was ___; every claim was supported by evidence.'",
    options: ["verbose", "rigorous", "tentative", "ornate"],
    answerIndex: 1,
    explanation: "Rigorous means careful and well evidenced, matching the second clause.",
  },
  {
    id: "apt-v5",
    dimension: "verbal",
    prompt: "Choose the grammatically correct sentence.",
    options: [
      "Neither the learner nor the counsellor were available.",
      "Neither the learner nor the counsellor was available.",
      "Neither the learner or the counsellor was available.",
      "Neither the learner nor the counsellor are available.",
    ],
    answerIndex: 1,
    explanation: "With 'neither … nor', the verb agrees with the nearer subject ('counsellor'), so 'was'.",
  },
  {
    id: "apt-v6",
    dimension: "verbal",
    prompt:
      "Read the passage and choose its main point. 'Employers increasingly screen candidates on demonstrable skills. Portfolios, assessments and work samples now sit alongside degrees, and in some roles they outweigh them.'",
    options: [
      "Degrees have no value to employers.",
      "Employers increasingly value demonstrable skills alongside degrees.",
      "Portfolios are the only reliable hiring tool.",
      "Candidates should avoid traditional education.",
    ],
    answerIndex: 1,
    explanation: "The passage says skills now sit alongside degrees, sometimes outweighing them — not that degrees are worthless.",
  },

  // Logical
  {
    id: "apt-l1",
    dimension: "logical",
    prompt: "What letter continues the series? A, C, F, J, __",
    options: ["M", "N", "O", "P"],
    answerIndex: 2,
    explanation: "The gaps grow by one letter: +2, +3, +4, so +5 from J lands on O.",
  },
  {
    id: "apt-l2",
    dimension: "logical",
    prompt:
      "All mentors are counsellors. Some counsellors are researchers. Which conclusion must be true?",
    options: [
      "All mentors are researchers.",
      "Some mentors are researchers.",
      "No mentor is a researcher.",
      "Some counsellors are mentors.",
    ],
    answerIndex: 3,
    explanation: "If every mentor is a counsellor, then at least some counsellors are mentors. Research overlap is undetermined.",
  },
  {
    id: "apt-l3",
    dimension: "logical",
    prompt: "Which number does not belong? 8, 27, 64, 100, 125",
    options: ["27", "64", "100", "125"],
    answerIndex: 2,
    explanation: "All are perfect cubes except 100 (8=2³, 27=3³, 64=4³, 125=5³).",
  },
  {
    id: "apt-l4",
    dimension: "logical",
    prompt: "If today is Wednesday, what day will it be after 45 days?",
    options: ["Friday", "Saturday", "Sunday", "Monday"],
    answerIndex: 1,
    explanation: "45 ÷ 7 leaves remainder 3. Wednesday + 3 days = Saturday.",
  },
  {
    id: "apt-l5",
    dimension: "logical",
    prompt: "What number continues the pattern? 3, 7, 16, 35, __",
    options: ["63", "70", "74", "78"],
    answerIndex: 2,
    explanation: "Each term is doubled and then increased by 1, 2, 3, 4: 35 × 2 + 4 = 74.",
  },
  {
    id: "apt-l6",
    dimension: "logical",
    prompt:
      "Only learners who complete the assessment receive a report. Ravi received a report. What follows?",
    options: [
      "Ravi completed the assessment.",
      "Ravi is a counsellor.",
      "Ravi scored above average.",
      "Nothing can be concluded.",
    ],
    answerIndex: 0,
    explanation: "Receiving a report requires completing the assessment, so Ravi must have completed it.",
  },

  // Spatial
  {
    id: "apt-s1",
    dimension: "spatial",
    prompt: "A square sheet is folded in half twice, then a single hole is punched through all layers. How many holes appear when unfolded?",
    options: ["1", "2", "4", "8"],
    answerIndex: 2,
    explanation: "Two folds create four layers, so one punch produces 4 holes.",
  },
  {
    id: "apt-s2",
    dimension: "spatial",
    prompt: "Which regular shape has the most lines of symmetry?",
    options: ["Equilateral triangle", "Square", "Regular pentagon", "Regular hexagon"],
    answerIndex: 3,
    explanation: "A regular n-gon has n lines of symmetry; the hexagon has 6, the most of these options.",
  },
  {
    id: "apt-s3",
    dimension: "spatial",
    prompt: "A cube is painted on all faces and cut into 27 equal smaller cubes. How many small cubes have exactly two painted faces?",
    options: ["6", "8", "12", "18"],
    answerIndex: 2,
    explanation: "Edge-centre cubes have exactly two painted faces: 12 edges × 1 = 12.",
  },
  {
    id: "apt-s4",
    dimension: "spatial",
    prompt: "If you rotate the lowercase letter 'b' by 180°, which letter does it most resemble?",
    options: ["p", "q", "d", "b"],
    answerIndex: 1,
    explanation: "A 180° rotation turns the stem and bowl of 'b' into the shape of 'q'.",
  },
  {
    id: "apt-s5",
    dimension: "spatial",
    prompt: "In a 3 × 3 × 3 painted cube, how many small cubes have no painted faces at all?",
    options: ["0", "1", "3", "6"],
    answerIndex: 1,
    explanation: "Only the single centre cube is fully interior.",
  },
  {
    id: "apt-s6",
    dimension: "spatial",
    prompt: "A rectangular room measures 6 m by 4 m. What is the largest square tile that can cover the floor exactly, without cutting?",
    options: ["1 m", "1.5 m", "2 m", "3 m"],
    answerIndex: 2,
    explanation: "The largest square tile is the greatest common divisor of 6 and 4, which is 2 m.",
  },
];

export const PERSONALITY_ITEMS: LikertItem[] = [
  // Openness
  { id: "per-o1", dimension: "openness", text: "I enjoy exploring ideas that challenge my usual way of thinking." },
  { id: "per-o2", dimension: "openness", text: "I prefer familiar routines over unfamiliar experiences.", reverse: true },
  { id: "per-o3", dimension: "openness", text: "I often connect ideas from different fields." },
  { id: "per-o4", dimension: "openness", text: "I avoid situations where I have to improvise.", reverse: true },

  // Conscientiousness
  { id: "per-c1", dimension: "conscientiousness", text: "I keep track of deadlines without needing reminders." },
  { id: "per-c2", dimension: "conscientiousness", text: "I often leave tasks unfinished when they get difficult.", reverse: true },
  { id: "per-c3", dimension: "conscientiousness", text: "I plan my week before it begins." },
  { id: "per-c4", dimension: "conscientiousness", text: "I work best only under last-minute pressure.", reverse: true },

  // Extraversion
  { id: "per-e1", dimension: "extraversion", text: "I enjoy meeting new people at events." },
  { id: "per-e2", dimension: "extraversion", text: "I prefer to observe rather than speak in group discussions.", reverse: true },
  { id: "per-e3", dimension: "extraversion", text: "I find it energising to present my ideas to a group." },
  { id: "per-e4", dimension: "extraversion", text: "I need long quiet breaks after social interactions.", reverse: true },

  // Agreeableness
  { id: "per-a1", dimension: "agreeableness", text: "I try to understand another person's viewpoint before responding." },
  { id: "per-a2", dimension: "agreeableness", text: "I find it easy to tell people when they are wrong.", reverse: true },
  { id: "per-a3", dimension: "agreeableness", text: "I am comfortable compromising to keep a team moving." },
  { id: "per-a4", dimension: "agreeableness", text: "I prefer to win an argument rather than preserve the relationship.", reverse: true },

  // Emotional stability
  { id: "per-s1", dimension: "emotional_stability", text: "I stay calm when plans change at short notice." },
  { id: "per-s2", dimension: "emotional_stability", text: "I replay stressful conversations long after they end.", reverse: true },
  { id: "per-s3", dimension: "emotional_stability", text: "I recover quickly after a setback." },
  { id: "per-s4", dimension: "emotional_stability", text: "I worry about outcomes I cannot control.", reverse: true },
];

export const SECTIONS: SectionMeta[] = [
  {
    key: "interest",
    title: "Interests",
    eyebrow: "Section 01",
    description:
      "What kind of work holds your attention? Based on the six RIASEC interest themes used in career counselling.",
    instruction:
      "Rate how much each statement describes you. Answer for how you are now, not how you think you should be.",
    minutes: 7,
    itemCount: INTEREST_ITEMS.length,
    scoredNote:
      "Interest scores describe preference, not ability. There are no right answers.",
  },
  {
    key: "aptitude",
    title: "Aptitude",
    eyebrow: "Section 02",
    description:
      "A short reasoning check across numerical, verbal, logical and spatial problem solving.",
    instruction:
      "Choose the best answer. You may skip a question, but a skipped question scores zero. No calculator.",
    minutes: 15,
    itemCount: APTITUDE_ITEMS.length,
    scoredNote:
      "This is a practice-level screen, not a standardised psychometric test or a selection instrument.",
  },
  {
    key: "personality",
    title: "Working style",
    eyebrow: "Section 03",
    description:
      "Five broad work-style dimensions: openness, conscientiousness, extraversion, agreeableness and emotional stability.",
    instruction:
      "Rate each statement against how you typically behave at work or study. Be candid — this is for your own guidance.",
    minutes: 6,
    itemCount: PERSONALITY_ITEMS.length,
    scoredNote:
      "A short self-report, useful for reflection and coaching. It is not a clinical or diagnostic assessment.",
  },
];

export const TOTAL_ITEMS =
  INTEREST_ITEMS.length + APTITUDE_ITEMS.length + PERSONALITY_ITEMS.length;

export function itemsForSection(section: SectionKey) {
  if (section === "interest") return INTEREST_ITEMS;
  if (section === "personality") return PERSONALITY_ITEMS;
  return APTITUDE_ITEMS;
}

export const RIASEC_LABELS: Record<Riasec, { name: string; blurb: string }> = {
  R: { name: "Realistic", blurb: "Hands-on, practical, build-and-fix" },
  I: { name: "Investigative", blurb: "Analytical, research-driven, curious" },
  A: { name: "Artistic", blurb: "Creative, expressive, original" },
  S: { name: "Social", blurb: "Helping, teaching, people-centred" },
  E: { name: "Enterprising", blurb: "Persuading, leading, venturing" },
  C: { name: "Conventional", blurb: "Structured, accurate, process-led" },
};

export const BIG_FIVE_LABELS: Record<BigFive, { name: string; low: string; high: string }> = {
  openness: {
    name: "Openness",
    low: "Practical and conventional",
    high: "Curious and exploratory",
  },
  conscientiousness: {
    name: "Conscientiousness",
    low: "Flexible and spontaneous",
    high: "Planned and dependable",
  },
  extraversion: {
    name: "Extraversion",
    low: "Reflective and reserved",
    high: "Outgoing and energising",
  },
  agreeableness: {
    name: "Agreeableness",
    low: "Direct and challenging",
    high: "Collaborative and accommodating",
  },
  emotional_stability: {
    name: "Emotional stability",
    low: "Sensitive to pressure",
    high: "Steady under pressure",
  },
};

export const APTITUDE_LABELS: Record<AptitudeDimension, string> = {
  numerical: "Numerical reasoning",
  verbal: "Verbal reasoning",
  logical: "Logical reasoning",
  spatial: "Spatial reasoning",
};
