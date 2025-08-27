// src/utils/printPdf.js
export function openPrintWindow(html, title = 'document') {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>body{font-family:system-ui,Arial;padding:16px} table{width:100%;border-collapse:collapse} td,th{border-bottom:1px solid #ddd;padding:6px}</style>
  </head><body>${html}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
}
