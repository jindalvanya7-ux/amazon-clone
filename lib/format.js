function formatPrice(cents) {
  const n = Number(cents) || 0;
  return '$' + (n / 100).toFixed(2);
}

function placeholderUri(color, label) {
  const safeColor = /^#[0-9A-Fa-f]{6}$/.test(color || '') ? color : '#D5D9D9';
  const text = String(label || 'Product')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">' +
    '<rect width="600" height="600" fill="' + safeColor + '"/>' +
    '<rect x="40" y="40" width="520" height="520" fill="none" stroke="#0F1111" stroke-opacity="0.2" stroke-width="4"/>' +
    '<text x="300" y="300" text-anchor="middle" dominant-baseline="middle" fill="#0F1111" ' +
    'font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700">' +
    text +
    '</text></svg>';
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

function safeNext(value) {
  if (typeof value !== 'string') return '/';
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  return value;
}

module.exports = { formatPrice, placeholderUri, safeNext };
