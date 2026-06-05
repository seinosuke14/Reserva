// Serverless function de Vercel: ejecuta el servidor SSR de Angular.
// Todas las rutas que no son archivos estáticos se enrutan aquí (ver vercel.json),
// de modo que el SSR maneja el renderizado y el F5 funciona en cualquier ruta.
import { reqHandler } from '../dist/professional-dashboard-angular/server/server.mjs';

export default reqHandler;
