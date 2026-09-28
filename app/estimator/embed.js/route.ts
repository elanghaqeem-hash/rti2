export const runtime = 'edge';

export async function GET() {
  const script = `(() => {
  const current = document.currentScript;
  if (!current) return;
  const url = new URL(current.src);
  const target = current.dataset.target || 'risetin-project-estimator';
  let mount = document.getElementById(target);
  if (!mount) {
    mount = document.createElement('div');
    mount.id = target;
    current.insertAdjacentElement('afterend', mount);
  }
  const iframe = document.createElement('iframe');
  iframe.src = url.origin + '/estimator?embed=1';
  iframe.title = 'Risetin Project Estimator & RFQ Builder';
  iframe.loading = 'lazy';
  iframe.style.width = '100%';
  iframe.style.minHeight = current.dataset.minHeight || '920px';
  iframe.style.border = '0';
  iframe.style.borderRadius = '16px';
  iframe.style.background = '#EEF1F5';
  iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  iframe.setAttribute('allow', 'clipboard-write');
  mount.replaceChildren(iframe);
})();`;

  return new Response(script, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
