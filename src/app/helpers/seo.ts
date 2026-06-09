// ─── Helpers de SEO / social meta tags ────────────────────────────────────────

import { Meta, Title } from '@angular/platform-browser';

export interface ISocialMeta {
  title: string;
  description: string;
  image: string;
  url: string;
}

/** Setea título, description y tags Open Graph / Twitter de una página pública */
export function setSocialMeta(titleSvc: Title, metaSvc: Meta, m: ISocialMeta): void {
  titleSvc.setTitle(m.title);
  metaSvc.updateTag({ name: 'description', content: m.description });
  metaSvc.updateTag({ property: 'og:title', content: m.title });
  metaSvc.updateTag({ property: 'og:description', content: m.description });
  metaSvc.updateTag({ property: 'og:image', content: m.image });
  metaSvc.updateTag({ property: 'og:url', content: m.url });
  metaSvc.updateTag({ name: 'twitter:title', content: m.title });
  metaSvc.updateTag({ name: 'twitter:description', content: m.description });
  metaSvc.updateTag({ name: 'twitter:image', content: m.image });
}
