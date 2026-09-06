/* ==========================================================================
   GFSMUN - main.js
   Navigation, scroll reveals, lightbox, utilities
   Vanilla JS, no dependencies, deferred
   ========================================================================== */
"use strict";

/* --------------------------------------------------------------------------
   1. NAVIGATION - MOBILE MENU
   -------------------------------------------------------------------------- */
(function initNav() {
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("mobileMenu");
  if (!toggle || !menu) return;

  const backdrop = menu.querySelector("[data-close-menu]");
  const panel = menu.querySelector(".mobile-menu__panel");
  const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  let lastFocus = null;

  function isOpen() {
    return menu.classList.contains("mobile-menu--open");
  }

  function getFocusable() {
    return Array.from(panel.querySelectorAll(focusableSelector));
  }

  function openMenu() {
    lastFocus = document.activeElement;
    menu.classList.add("mobile-menu--open");
    menu.removeAttribute("inert");
    menu.setAttribute("aria-hidden", "false");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close navigation menu");
    document.body.classList.add("menu-open");
    // Focus first link after transition
    requestAnimationFrame(() => {
      const first = getFocusable()[0];
      if (first) first.focus();
    });
    document.addEventListener("keydown", onKeyDown);
  }

  function closeMenu() {
    menu.classList.remove("mobile-menu--open");
    menu.setAttribute("aria-hidden", "true");
    menu.setAttribute("inert", "");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation menu");
    document.body.classList.remove("menu-open");
    document.removeEventListener("keydown", onKeyDown);
    if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus();
    } else {
      toggle.focus();
    }
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeMenu();
      return;
    }
    if (e.key === "Tab" && isOpen()) {
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }

  toggle.addEventListener("click", () => {
    if (isOpen()) closeMenu();
    else openMenu();
  });

  if (backdrop) {
    backdrop.addEventListener("click", closeMenu);
  }

  // Close when a mobile link is clicked
  panel.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      // For anchor links inside same page, keep slight delay for smooth scroll
      setTimeout(closeMenu, 120);
    });
  });
})();

/* --------------------------------------------------------------------------
   2. NAV SCROLLED STATE + SCROLL PROGRESS
   -------------------------------------------------------------------------- */
(function initScroll() {
  const nav = document.querySelector(".nav");
  const progress = document.getElementById("scrollProgress");

  function onScroll() {
    const y = window.scrollY;
    if (nav) {
      if (y > 24) nav.classList.add("nav--scrolled");
      else nav.classList.remove("nav--scrolled");
    }
    if (progress) {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docH > 0 ? (y / docH) * 100 : 0;
      progress.style.width = pct + "%";
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

/* --------------------------------------------------------------------------
   3. REVEAL ON SCROLL - IntersectionObserver
   -------------------------------------------------------------------------- */
(function initReveals() {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const els = document.querySelectorAll(".reveal");
  if (prefersReduced) {
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  if (!("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  els.forEach((el) => io.observe(el));

  // Restart pass: on full load, instantly show anything already in view
  // (covers images shifting layout) and re-observe the rest.
  window.addEventListener("load", () => {
    els.forEach((el) => {
      if (el.classList.contains("is-visible")) return;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        el.classList.add("is-visible");
        io.unobserve(el);
      }
    });
  });
})();

/* --------------------------------------------------------------------------
   4. CURRENT YEAR
   -------------------------------------------------------------------------- */
(function initYear() {
  const el = document.getElementById("currentYear");
  if (el) el.textContent = String(new Date().getFullYear());
})();

/* --------------------------------------------------------------------------
   5. IMAGE FALLBACK - GRACEFUL PLACEHOLDER FOR MISSING ASSETS
   -------------------------------------------------------------------------- */
(function initImageFallbacks() {
  // For any <img> that errors, hide it and if inside a media container,
  // ensure placeholder is visible (if present), otherwise add one.
  document.querySelectorAll("img").forEach((img) => {
    img.addEventListener("error", () => {
      img.style.display = "none";
      const container = img.parentElement;
      if (!container) return;

      // If container has a .image-placeholder sibling, show it
      const placeholder = container.querySelector(".image-placeholder");
      if (placeholder) {
        placeholder.style.display = "grid";
        // Add a subtle label with the missing filename for editors
        const file = (img.getAttribute("src") || "").split("/").pop();
        const span = placeholder.querySelector("span");
        if (span && file) span.textContent = file.replace(/\.[^.]+$/, "").replace(/-/g, " ").toUpperCase();
        return;
      }

      // For gallery/team/cover containers, inject a minimal placeholder if empty
      if (container.classList.contains("gallery-item") ||
          container.classList.contains("team-card__media") ||
          container.classList.contains("about__media") ||
          container.classList.contains("letter__portrait") ||
          container.classList.contains("gallery-edition__cover") ||
          container.classList.contains("hero__media") ||
          container.classList.contains("page-hero__bg")) {
        // Don't inject inside hero - it has gradient overlay already
        if (container.classList.contains("hero__media") || container.classList.contains("page-hero__bg")) {
          return;
        }
        if (!container.querySelector(".image-placeholder--injected")) {
          const ph = document.createElement("div");
          ph.className = "image-placeholder image-placeholder--injected";
          ph.setAttribute("aria-hidden", "true");
          const file = (img.getAttribute("src") || "").split("/").pop() || "GFSMUN image";
          ph.innerHTML = "<span>" + file.replace(/\.[^.]+$/, "").replace(/-/g, " ").toUpperCase() + "</span>";
          ph.style.position = "absolute";
          ph.style.inset = "0";
          // Ensure container is relative
          const cs = getComputedStyle(container);
          if (cs.position === "static") container.style.position = "relative";
          container.appendChild(ph);
        }
      }
    });

    // If image already failed before JS loaded (broken src)
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) {
      img.dispatchEvent(new Event("error"));
    }
  });
})();

/* --------------------------------------------------------------------------
   6. LIGHTBOX - GALLERY
   -------------------------------------------------------------------------- */
(function initLightbox() {
  const lightbox = document.getElementById("lightbox");
  if (!lightbox) return;

  const imageEl = document.getElementById("lightboxImage");
  const captionEl = document.getElementById("lightboxCaption");
  const counterEl = document.getElementById("lightboxCounter");
  const prevBtn = document.getElementById("lightboxPrev");
  const nextBtn = document.getElementById("lightboxNext");
  const closeEls = lightbox.querySelectorAll("[data-lightbox-close]");

  // Build grouped galleries: { 'gfsmun-v': [ {src, alt}, ... ], ... }
  const groups = {};
  const triggers = document.querySelectorAll("[data-gallery]");

  triggers.forEach((btn) => {
    const group = btn.getAttribute("data-gallery");
    const img = btn.querySelector("img");
    if (!group || !img) return;
    if (!groups[group]) groups[group] = [];
    const idx = parseInt(btn.getAttribute("data-index") || "0", 10);
    groups[group][idx] = {
      src: img.getAttribute("src"),
      alt: img.getAttribute("alt") || "",
      caption: img.getAttribute("alt") || ""
    };
  });

  // Also support a flat ordered list for sequential nav within a group
  let currentGroup = null;
  let currentIndex = 0;
  let lastFocus = null;

  function getGroupItems(group) {
    return (groups[group] || []).filter(Boolean);
  }

  function updateLightbox() {
    const items = getGroupItems(currentGroup);
    const item = items[currentIndex];
    if (!item) return;
    imageEl.setAttribute("src", item.src);
    imageEl.setAttribute("alt", item.alt);
    if (captionEl) captionEl.textContent = item.caption;
    if (counterEl) counterEl.textContent = (currentIndex + 1) + " / " + items.length;
    if (prevBtn) prevBtn.disabled = currentIndex === 0;
    if (nextBtn) nextBtn.disabled = currentIndex === items.length - 1;
  }

  function openLightbox(group, index) {
    currentGroup = group;
    currentIndex = index;
    updateLightbox();
    lightbox.classList.add("lightbox--open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    lastFocus = document.activeElement;
    // Focus close button for accessibility
    const closeBtn = lightbox.querySelector(".lightbox__close");
    if (closeBtn) closeBtn.focus();
    document.addEventListener("keydown", onKeyDown);
  }

  function closeLightbox() {
    lightbox.classList.remove("lightbox--open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKeyDown);
    if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus();
    }
  }

  function next() {
    const items = getGroupItems(currentGroup);
    if (currentIndex < items.length - 1) {
      currentIndex++;
      updateLightbox();
    }
  }

  function prev() {
    if (currentIndex > 0) {
      currentIndex--;
      updateLightbox();
    }
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeLightbox();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    }
  }

  triggers.forEach((btn) => {
    btn.addEventListener("click", () => {
      const group = btn.getAttribute("data-gallery");
      const idx = parseInt(btn.getAttribute("data-index") || "0", 10);
      openLightbox(group, idx);
    });
  });

  if (prevBtn) prevBtn.addEventListener("click", prev);
  if (nextBtn) nextBtn.addEventListener("click", next);
  closeEls.forEach((el) => el.addEventListener("click", closeLightbox));

  // Touch swipe: swipe left/right on the stage to navigate (mobile)
  (function initSwipe() {
    const stage = lightbox.querySelector(".lightbox__stage");
    if (!stage) return;
    let startX = null;
    let startY = null;
    stage.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    stage.addEventListener("touchend", (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      startX = null;
      startY = null;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) next();
      else prev();
    }, { passive: true });
  })();

  // Click on backdrop closes - but not clicks inside dialog
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox || e.target.classList.contains("lightbox__backdrop")) {
      closeLightbox();
    }
  });
})();
