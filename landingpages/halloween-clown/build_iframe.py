"""Builds iframe.html: the landing page as a self-contained <iframe srcdoc>.

The page is not loaded from a URL (Shopify forbids framing with X-Frame-Options: DENY),
it travels inside the srcdoc attribute. Paste the <iframe> between IFRAME START and ENDE
into any page or CMS block that allows iframes.

A small script inside the iframe takes care of what an iframe cannot do on its own:
it grows the iframe to the height of the content, scrolls the outer page for the
"Jetzt Clown suchen" links, places the voucher pop-up in the visible part of the
screen and sends the tracking event to the outer page's dataLayer. Shop links open
in the outer window (target="_top").

    python3 -I landingpages/halloween-clown/build_iframe.py
"""
import html
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "index.html"
OUT = HERE / "iframe.html"
FALLBACK_HEIGHT = "3600px"

HELPER = """<script>
(function () {
  var frame = window.frameElement;
  if (!frame) return;
  function fit() { frame.style.height = Math.ceil(document.body.getBoundingClientRect().height) + 'px'; }
  fit();
  window.addEventListener('load', fit);
  if (window.ResizeObserver) new ResizeObserver(fit).observe(document.body);

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    var target = a && document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    parent.scrollBy({ top: frame.getBoundingClientRect().top + target.getBoundingClientRect().top, behavior: 'smooth' });
  });

  var pop = document.getElementById('hdx-clown-gutschein');
  function isOpen() {
    try { return pop.matches(':popover-open'); } catch (err) { return pop.style.display === 'block'; }
  }
  function place() {
    var r = frame.getBoundingClientRect();
    var top = Math.max(0, -r.top);
    var bottom = Math.min(r.height, parent.innerHeight - r.top);
    pop.style.top = top + 'px';
    pop.style.height = Math.max(bottom - top, 320) + 'px';
  }
  var openers = document.querySelectorAll('[popovertarget=hdx-clown-gutschein]:not([popovertargetaction])');
  for (var i = 0; i < openers.length; i++) openers[i].addEventListener('click', place);
  parent.addEventListener('scroll', function () { if (isOpen()) place(); }, { passive: true });

  try { window.dataLayer = parent.dataLayer = parent.dataLayer || []; } catch (err) {}
})();
</script>"""

page = SRC.read_text(encoding="utf-8")
start = page.index("-->", page.index("CMS-BLOCK START")) + 3
end = page.index("<!-- ===== HOME DELUXE · HALLOWEEN-SUCHSPIEL · CMS-BLOCK ENDE")
block = re.sub(r"<!--.*?-->", "", page[start:end], flags=re.S)
block = " ".join(line.strip() for line in block.splitlines() if line.strip())
block = block.replace('<a href="https://', '<a target="_top" href="https://')

inner = (
    '<!doctype html><html lang="de"><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width, initial-scale=1">'
    "<title>Halloween-Suchspiel | Home Deluxe</title></head>"
    '<body style="margin:0;background:#fefefe;">'
    + block + " " + " ".join(line.strip() for line in HELPER.splitlines())
    + "</body></html>"
)

iframe = (
    '<iframe title="Home Deluxe Halloween-Suchspiel" srcdoc="' + html.escape(inner, quote=True) + '" '
    'loading="eager" scrolling="no" allow="autoplay; clipboard-write" '
    f'style="display:block;width:100%;height:{FALLBACK_HEIGHT};margin:0;padding:0;border:0;overflow:hidden;"></iframe>'
)

OUT.write_text(
    "<!doctype html>\n<html lang=\"de\">\n<head>\n<meta charset=\"utf-8\">\n"
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"
    "<meta name=\"robots\" content=\"noindex, nofollow\">\n"
    "<title>Halloween-Suchspiel (iframe) | Home Deluxe</title>\n</head>\n"
    "<body style=\"margin:0;padding:0;\">\n\n"
    "<!-- ===== HOME DELUXE · HALLOWEEN-SUCHSPIEL · IFRAME START =====\n"
    "     Alles bis IFRAME ENDE einfügen, am besten in einen vollbreiten Bereich.\n"
    "     Erzeugt aus index.html mit build_iframe.py – nicht von Hand ändern. -->\n"
    + iframe + "\n"
    "<!-- ===== HOME DELUXE · HALLOWEEN-SUCHSPIEL · IFRAME ENDE ===== -->\n\n"
    "</body>\n</html>\n",
    encoding="utf-8",
)
print(f"{OUT.relative_to(HERE.parent.parent)}: iframe-Code {len(iframe)} Zeichen")
