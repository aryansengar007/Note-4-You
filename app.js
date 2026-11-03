(function () {
  "use strict";

  var cfg = window.NOTE_CONFIG || {};
  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var main = document.querySelector("main");
  var steps = {};
  Array.prototype.forEach.call(document.querySelectorAll("[data-step]"), function (el) {
    steps[el.getAttribute("data-step")] = el;
  });

  /* ---------- Config: copy ---------- */

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el && typeof value === "string" && value.trim()) {
      el.textContent = value;
    }
  }

  var msg = cfg.message || {};
  setText("msg-title", msg.title);
  setText("msg-sig", msg.signature);

  if (Object.prototype.toString.call(msg.body) === "[object Array]" && msg.body.length) {
    var holder = document.getElementById("msg-body");
    holder.textContent = "";
    msg.body.forEach(function (line) {
      if (typeof line === "string" && line.trim()) {
        var p = document.createElement("p");
        p.textContent = line;
        holder.appendChild(p);
      }
    });
  }

  var exitLink = document.getElementById("exit");
  if (exitLink && /^https:\/\//.test(String(cfg.exitUrl || ""))) {
    exitLink.href = cfg.exitUrl;
  }

  /* ---------- Contact options ---------- */

  var igHandle = String(cfg.instagram || "").replace(/^@/, "").trim();
  var snapHandle = String(cfg.snapchat || "").replace(/^@/, "").trim();
  var waNumber = String(cfg.whatsapp || "").replace(/[^\d]/g, "");
  var emailAddr = String(cfg.email || "").trim();

  var hasIg = /^[A-Za-z0-9._]{1,30}$/.test(igHandle);
  var hasSnap = /^[A-Za-z][A-Za-z0-9._-]{2,14}$/.test(snapHandle);
  var hasWa = /^\d{8,15}$/.test(waNumber);
  var hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddr);
  var hasContact = hasIg || hasSnap || hasWa || hasEmail;

  var replies = cfg.replies || {};
  var replyText = {
    photo: String(replies.photo || "Hi, I read your note. I’d like to take that photo together.")
  };

  var contactList = document.getElementById("contact-list");
  var igNote = document.getElementById("ig-note");
  var notNow = contactList ? contactList.querySelector(".text-btn") : null;
  var builtLinks = [];

  function clearLinks() {
    builtLinks.forEach(function (a) {
      if (a.parentNode) {
        a.parentNode.removeChild(a);
      }
    });
    builtLinks = [];
  }

  function addLink(label, href, opts) {
    var a = document.createElement("a");
    a.className = "btn " + (builtLinks.length === 0 ? "btn--solid" : "btn--line");
    a.textContent = label;
    a.href = href;
    if (/^https?:/.test(href)) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
    if (opts && opts.onclick) {
      a.addEventListener("click", opts.onclick);
    }
    contactList.insertBefore(a, igNote || notNow);
    builtLinks.push(a);
  }

  function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(function () {});
      }
    } catch (e) {
      /* copying is a convenience only */
    }
  }

  function buildContacts(text) {
    clearLinks();
    if (hasIg) {
      addLink("Message on Instagram", "https://www.instagram.com/" + igHandle + "/", {
        onclick: function () {
          copyText(text);
        }
      });
    }
    if (hasSnap) {
      addLink("Add on Snapchat", "https://www.snapchat.com/add/" + snapHandle, {
        onclick: function () {
          copyText(text);
        }
      });
    }
    if (hasWa) {
      addLink("Message on WhatsApp", "https://wa.me/" + waNumber + "?text=" + encodeURIComponent(text));
    }
    if (hasEmail) {
      addLink(
        "Send an email",
        "mailto:" + emailAddr + "?subject=" + encodeURIComponent("Your note") + "&body=" + encodeURIComponent(text)
      );
    }
    if (igNote) {
      var names = [];
      if (hasIg) {
        names.push("Instagram");
      }
      if (hasSnap) {
        names.push("Snapchat");
      }
      igNote.hidden = names.length === 0;
      igNote.textContent =
        names.join(" and ") + " can’t pre-fill a message, so your words are copied when you tap. Paste them into the chat.";
    }
  }

  /* ---------- Steps ---------- */

  var current = "intro";
  var busy = false;

  function show(name) {
    var next = steps[name];
    if (!next) {
      return;
    }
    steps[current].hidden = true;
    next.hidden = false;
    next.classList.remove("enter");
    void next.offsetWidth; // restart the entrance animation
    next.classList.add("enter");
    current = name;

    var heading = next.querySelector("h1");
    if (heading) {
      heading.focus({ preventScroll: true });
    }
    window.scrollTo(0, 0);
  }

  function go(name) {
    if (busy || name === current) {
      return;
    }

    // With no contact option configured, skip the reply questions instead of showing a dead end.
    if ((name === "reply" || name === "contact") && !hasContact) {
      name = "end";
    }

    if (name === "intro") {
      steps.intro.classList.remove("opening");
    }

    // Tapping Yes opens the envelope first, then shows the message.
    if (name === "message" && current === "intro" && !reduceMotion) {
      busy = true;
      steps.intro.classList.add("opening");
      document.body.classList.add("is-opening");
      window.setTimeout(function () {
        busy = false;
        document.body.classList.remove("is-opening");
        show("message");
      }, 1450);
      return;
    }

    show(name);
  }

  main.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("button") : null;
    if (!t) {
      return;
    }

    var reply = t.getAttribute("data-reply");
    if (reply && replyText[reply]) {
      if (busy) {
        return;
      }
      buildContacts(replyText[reply]);
      go("contact");
      return;
    }

    var target = t.getAttribute("data-go");
    if (target) {
      go(target);
    }
  });
})();
