(function () {
  "use strict";

  var cfg = window.NOTE_CONFIG || {};
  var line = document.querySelector("[data-contact-line]");
  if (!line) {
    return;
  }

  var ig = String(cfg.instagram || "").replace(/^@/, "").trim();
  if (/^[A-Za-z0-9._]{1,30}$/.test(ig)) {
    line.textContent = "You can ask a question about this page by messaging ";
    var a = document.createElement("a");
    a.href = "https://www.instagram.com/" + ig + "/";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "@" + ig + " on Instagram";
    line.appendChild(a);
    line.appendChild(document.createTextNode("."));
  }
})();
