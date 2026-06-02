import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import { ɵsetAngularAppEngineManifest as setAngularAppEngineManifest } from '@angular/ssr';
import express from 'express';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

const browserDistFolder = resolve(fileURLToPath(import.meta.url), '../../browser');

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

async function bootstrap() {
  const { default: engineManifest } = await import(
    new URL('./angular-app-engine-manifest.mjs', import.meta.url).href as string
  );
  setAngularAppEngineManifest(engineManifest);

  const allowedHosts = process.env['NG_ALLOWED_HOSTS']
    ? (process.env['NG_ALLOWED_HOSTS'].split(',').map(h => h.trim()) as readonly string[])
    : undefined;

  const angularApp = new AngularNodeAppEngine(allowedHosts ? { allowedHosts } : undefined);
  const server = express();

  // Sitemap dinámico — debe ir ANTES de express.static para que no sea interceptado
  server.get('/sitemap.xml', async (_req, res) => {
    try {
      const apiUrl = process.env['API_URL'] ?? 'https://reserva-api-production-095e.up.railway.app/api';
      const data   = await fetchJson(`${apiUrl}/public/sitemap-slugs`);
      const base   = 'https://letsreserve.cl';
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

  server.use(
    express.static(browserDistFolder, { maxAge: '1y', index: false }),
  );

  server.use(
    createNodeRequestHandler(async (req, res, next) => {
      const response = await angularApp.handle(req);
      if (response) {
        await writeResponseToNodeResponse(response, res);
      } else {
        next();
      }
    }),
  );

  return server;
}

if (isMainModule(import.meta.url)) {
  bootstrap().then((server) => {
    const port = process.env['PORT'] || 4000;
    server.listen(port, () => {
      console.log(`Servidor SSR corriendo en http://localhost:${port}`);
    });
  });
}

export default bootstrap;
