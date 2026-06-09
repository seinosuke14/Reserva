// ─── Estilos de marca (fondo y tipografías personalizadas) ────────────────────
// Compartido por los portales públicos que renderizan la marca del profesional/empresa.

export interface IBrandStyleSource {
  backgroundType?: 'color' | 'image' | null;
  backgroundColor?: string | null;
  backgroundImage?: string | null;
}

/** Estilo de fondo del portal según la configuración de marca */
export function brandBgStyle(
  src: IBrandStyleSource | null | undefined,
  opts: { fixed?: boolean; fallbackColor?: string } = {},
): Record<string, string> {
  if (!src) return {};
  if (src.backgroundType === 'image' && src.backgroundImage) {
    const style: Record<string, string> = {
      'background-image':    `url(${src.backgroundImage})`,
      'background-size':     'cover',
      'background-position': 'center',
    };
    if (opts.fixed) style['background-attachment'] = 'fixed';
    return style;
  }
  const color = src.backgroundColor ?? opts.fallbackColor;
  return color ? { 'background-color': color } : {};
}

/** Estilo font-family para una fuente de marca (o vacío si no hay) */
export const fontFamilyStyle = (family: string | null | undefined): Record<string, string> =>
  family ? { 'font-family': `${family}, sans-serif` } : {};
