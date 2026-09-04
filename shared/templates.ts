export interface SiteTemplate {
  id: number;
  key: string;
  name: string;
  /** Representative color shown as a swatch in the picker UI. */
  swatchHex: string;
  /**
   * Degrees to hue-rotate the page's rendered output. The base UI is built
   * around a green accent (~142deg). Rather than recoloring dozens of
   * individually hardcoded color values scattered across styles, every
   * other theme is produced by rotating the whole rendered page's hue by
   * a fixed offset - true grays/black/white are unaffected by hue
   * rotation, so only the accent color shifts.
   */
  hueRotate: number;
  isDefault: boolean;
}

export const SITE_TEMPLATES: SiteTemplate[] = [
  { id: 1, key: "neon-green", name: "Neon Green", swatchHex: "#22c55e", hueRotate: 0, isDefault: true },
  { id: 2, key: "cyber-purple", name: "Cyber Purple", swatchHex: "#a855f7", hueRotate: 130, isDefault: false },
  { id: 3, key: "electric-blue", name: "Electric Blue", swatchHex: "#3b82f6", hueRotate: 75, isDefault: false },
  { id: 4, key: "crimson", name: "Crimson", swatchHex: "#ef4444", hueRotate: 218, isDefault: false },
  { id: 5, key: "gold-rush", name: "Gold Rush", swatchHex: "#eab308", hueRotate: 263, isDefault: false },
];

export function getTemplateById(id: number | null | undefined): SiteTemplate {
  return SITE_TEMPLATES.find((t) => t.id === id) ?? SITE_TEMPLATES[0];
}

export function isValidTemplateId(id: number): boolean {
  return SITE_TEMPLATES.some((t) => t.id === id);
}
