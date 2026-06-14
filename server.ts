import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

const browserDistFolder = join(import.meta.dirname, '../browser');

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = url.startsWith('https') ? httpsRequest : httpRequest;
    req(url, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid JSON')); }
      });
    }).on('error', reject).end();
  });
}

const angularApp = new AngularNodeAppEngine();
const app = express();

// Sitemap dinámico — debe ir ANTES de express.static para que no sea interceptado
app.get('/sitemap.xml', async (_req, res) => {
  try {
    const apiUrl = process.env['API_URL'] ?? 'https://reserva-api-production-095e.up.railway.app/api';
    const data   = await fetchJson(`${apiUrl}/public/sitemap-slugs`);
    const base   = 'https://www.letsreserve.cl';
    const now    = new Date().toISOString().slice(0, 10);

    const staticUrls = [
      { loc: `${base}/`,           priority: '1.0', changefreq: 'weekly'  },
      { loc: `${base}/planes`,     priority: '0.9', changefreq: 'weekly'  },
      { loc: `${base}/terminos`,   priority: '0.3', changefreq: 'monthly' },
      { loc: `${base}/privacidad`, priority: '0.3', changefreq: 'monthly' },
    ];

    const companyUrls = (data.companies ?? []).map((c: { slug: string; updatedAt: string }) => ({
      loc: `${base}/empresa/${c.slug}`,
      priority: '0.8',
      changefreq: 'weekly',
      lastmod: c.updatedAt?.slice(0, 10) ?? now,
    }));

    const professionalUrls = (data.professionals ?? []).map((p: { slug: string; updatedAt: string }) => ({
      loc: `${base}/reservar/${p.slug}`,
      priority: '0.8',
      changefreq: 'weekly',
      lastmod: p.updatedAt?.slice(0, 10) ?? now,
    }));

    const allUrls = [...staticUrls, ...companyUrls, ...professionalUrls];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>\n    ` : ''}<changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch {
    res.status(500).send('Error generando sitemap');
  }
});

// Sirve los archivos estáticos de /browser
app.use(
  express.static(browserDistFolder, { maxAge: '1y', index: false }),
);

// Todas las demás rutas las maneja el renderizador SSR de Angular
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

// Arranque local (npm run serve:ssr)
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Servidor SSR corriendo en http://localhost:${port}`);
  });
}

// Handler que Vercel/Angular detecta para el despliegue SSR
export const reqHandler = createNodeRequestHandler(app);
