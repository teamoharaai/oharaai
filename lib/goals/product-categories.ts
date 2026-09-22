/** Product taxonomy only. Momentum compatibility profiles are a separate domain. */
export const PRODUCT_CATEGORIES = [
  'Health & Fitness',
  'Work & Money',
  'Learning & Creativity',
  'Life & Relationships',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const APPROVED_MIND_CATEGORIES: Readonly<Record<string, ProductCategory>> = {
  '0072a366-4863-4004-b16c-404c5a096fd0': 'Learning & Creativity',
  '11125ce9-713e-4ede-84a2-cbae9e41012e': 'Health & Fitness',
  '1941106e-85e5-4947-850e-25eeb9fffa31': 'Life & Relationships',
  '465140b0-0183-41dc-9dcb-09136ee48f2e': 'Health & Fitness',
  '5e7a4487-98a1-4bea-9fb6-c7a05b98097c': 'Learning & Creativity',
  '79ed0b33-a2e5-41b1-a4c7-63c1ddf90f8e': 'Learning & Creativity',
  '98046f42-f474-480a-b782-fff92da86bb0': 'Learning & Creativity',
  'ad607078-f9ac-45a5-bd35-a0e68e0de31b': 'Learning & Creativity',
  'ae716a0f-a7ed-44cd-9161-ca6193fd9287': 'Health & Fitness',
  'ddd70994-48da-4c0e-adc4-1673f6976414': 'Learning & Creativity',
};

const LEGACY_PRODUCT_CATEGORIES: Readonly<Record<string, ProductCategory>> = {
  body: 'Health & Fitness', health: 'Health & Fitness', health_fitness: 'Health & Fitness',
  money: 'Work & Money', finance: 'Work & Money', career: 'Work & Money',
  create: 'Learning & Creativity', creative: 'Learning & Creativity', education: 'Learning & Creativity',
  connect: 'Life & Relationships', relationships: 'Life & Relationships',
  contribute: 'Life & Relationships', growth: 'Life & Relationships', personal_growth: 'Life & Relationships',
};

/** Unknown values and unreviewed mind Goals fail closed; never default to growth. */
export function productCategory(value: string, goalId?: string): ProductCategory {
  if ((PRODUCT_CATEGORIES as readonly string[]).includes(value)) return value as ProductCategory;
  const legacy = value.trim().toLowerCase();
  const resolved = legacy === 'mind'
    ? goalId && APPROVED_MIND_CATEGORIES[goalId]
    : LEGACY_PRODUCT_CATEGORIES[legacy];
  if (!resolved) throw new Error(`Unmapped Goal category: ${value}`);
  return resolved;
}
