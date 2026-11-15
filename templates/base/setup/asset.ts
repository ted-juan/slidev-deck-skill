// public/ 底下的圖片路徑（例如 /photos/x.jpg）加上部署時的 base path。
// 部署到 GitHub Pages 時網址會在 /six-grand-endless-wonders/ 底下，
// 直接寫 /photos/x.jpg 會指到網域根目錄而找不到圖。
export function asset(path: string): string {
  return path.startsWith('/') ? import.meta.env.BASE_URL + path.slice(1) : path
}
