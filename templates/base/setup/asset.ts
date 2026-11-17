// Prefixes a public/ image path (e.g. /photos/x.jpg) with the deploy base path.
// On GitHub Pages the deck lives under /<repo>/, so a bare /photos/x.jpg would
// point at the domain root and 404.
export function asset(path: string): string {
  return path.startsWith('/') ? import.meta.env.BASE_URL + path.slice(1) : path
}
