(function () {
  "use strict";

  var INK = "#11264b";
  var BG = "#ffffff";
  var QUIET = 4; // white border, in modules. 4 is the standard minimum.
  var FONT = "Figtree, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  var NS = "http://www.w3.org/2000/svg";

  var urlEl = document.getElementById("url");
  var capEl = document.getElementById("cap");
  var out = document.getElementById("qr-out");
  var msg = document.getElementById("msg");
  var btnPng = document.getElementById("dl-png");
  var btnSvg = document.getElementById("dl-svg");
  var btnPrint = document.getElementById("print");

  var model = null; // { n, dark(r, c), caption, size, capH, fs }

  function say(text, isError) {
    msg.textContent = text;
    msg.className = "msg" + (isError ? " err" : "");
  }

  function reset(text, isError) {
    model = null;
    out.hidden = true;
    out.textContent = "";
    btnPng.disabled = btnSvg.disabled = btnPrint.disabled = true;
    say(text, isError);
  }

  function parseLink(raw) {
    var v = raw.trim();
    if (!v) {
      return { empty: true };
    }
    if (/^http:\/\//i.test(v)) {
      return { error: "Use the https:// version of your link." };
    }
    if (!/^https:\/\//i.test(v)) {
      v = "https://" + v;
    }
    var u;
    try {
      u = new URL(v);
    } catch (e) {
      return { error: "That does not look like a link yet." };
    }
    var host = u.hostname;
    if (host.indexOf(".") < 1 || /\s/.test(host)) {
      return { error: "That does not look like a link yet." };
    }
    if (/^(localhost|127\.|10\.|192\.168\.|0\.0\.0\.0)/i.test(host) || /\.local$/i.test(host)) {
      return { error: "This is a test link that only works on your own network. Use your final link." };
    }
    return { url: u.href };
  }

  // Dark modules merged into horizontal runs, as [row, startCol, length].
  function runs(m) {
    var list = [];
    for (var r = 0; r < m.n; r++) {
      var c = 0;
      while (c < m.n) {
        if (m.dark(r, c)) {
          var start = c;
          while (c < m.n && m.dark(r, c)) {
            c++;
          }
          list.push([r, start, c - start]);
        } else {
          c++;
        }
      }
    }
    return list;
  }

  function build() {
    var parsed = parseLink(urlEl.value);
    if (parsed.empty) {
      reset("Paste the link to see your code.", false);
      return;
    }
    if (parsed.error) {
      reset(parsed.error, true);
      return;
    }

    var qr;
    try {
      qr = qrcode(0, "H");
      qr.addData(parsed.url);
      qr.make();
    } catch (e) {
      reset("That link is too long to make a reliable code.", true);
      return;
    }

    var n = qr.getModuleCount();
    var caption = capEl.value.trim();
    var size = n + QUIET * 2;
    var capH = caption ? 6 : 0;
    var fs = caption ? Math.min(2.4, (size * 0.9) / (caption.length * 0.56)) : 0;

    model = {
      n: n,
      dark: function (r, c) {
        return qr.isDark(r, c);
      },
      caption: caption,
      size: size,
      capH: capH,
      fs: fs
    };

    renderPreview();
    btnPng.disabled = btnSvg.disabled = btnPrint.disabled = false;
    say("The code opens " + parsed.url, false);
  }

  function svgMarkup() {
    var m = model;
    var d = runs(m)
      .map(function (s) {
        var x = s[1] + QUIET;
        var y = s[0] + QUIET;
        return "M" + x + " " + y + "h" + s[2] + "v1h-" + s[2] + "z";
      })
      .join("");
    var h = m.size + m.capH;
    var s =
      '<svg xmlns="' + NS + '" viewBox="0 0 ' + m.size + " " + h + '" width="' + m.size * 10 + '" height="' + h * 10 + '">' +
      '<rect width="' + m.size + '" height="' + h + '" fill="' + BG + '"/>' +
      '<path d="' + d + '" fill="' + INK + '" shape-rendering="crispEdges"/>';
    if (m.caption) {
      s +=
        '<text x="' + m.size / 2 + '" y="' + (m.size + m.capH * 0.45) + '" text-anchor="middle" dominant-baseline="middle" ' +
        'font-family="' + FONT.replace(/'/g, "&apos;") + '" font-weight="600" font-size="' + m.fs + '" fill="' + INK + '">' +
        escapeXml(m.caption) + "</text>";
    }
    return s + "</svg>";
  }

  function escapeXml(t) {
    return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderPreview() {
    var doc = new DOMParser().parseFromString(svgMarkup(), "image/svg+xml");
    var node = document.importNode(doc.documentElement, true);
    node.removeAttribute("width");
    node.removeAttribute("height");
    out.textContent = "";
    out.appendChild(node);
    out.hidden = false;
  }

  function saveBlob(blob, name) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 2000);
  }

  function downloadSvg() {
    if (!model) {
      return;
    }
    saveBlob(new Blob([svgMarkup()], { type: "image/svg+xml" }), "note-qr.svg");
  }

  function downloadPng() {
    if (!model) {
      return;
    }
    var m = model;
    var go = function () {
      var scale = Math.max(10, Math.ceil(1400 / m.size));
      var canvas = document.createElement("canvas");
      canvas.width = m.size * scale;
      canvas.height = (m.size + m.capH) * scale;
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = INK;
      runs(m).forEach(function (s) {
        ctx.fillRect((s[1] + QUIET) * scale, (s[0] + QUIET) * scale, s[2] * scale, scale);
      });
      if (m.caption) {
        ctx.font = "600 " + m.fs * scale + "px " + FONT;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(m.caption, canvas.width / 2, (m.size + m.capH * 0.45) * scale);
      }
      canvas.toBlob(function (blob) {
        if (blob) {
          saveBlob(blob, "note-qr.png");
        }
      }, "image/png");
    };
    if (document.fonts && document.fonts.load) {
      document.fonts.load("600 20px Figtree").then(go, go);
    } else {
      go();
    }
  }

  urlEl.addEventListener("input", build);
  capEl.addEventListener("input", build);
  btnPng.addEventListener("click", downloadPng);
  btnSvg.addEventListener("click", downloadSvg);
  btnPrint.addEventListener("click", function () {
    window.print();
  });

  // Keep a pasted value that was filled in before the script ran.
  if (urlEl.value) {
    build();
  }
})();
