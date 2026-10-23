const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

function revealTargets() {
  return document.querySelectorAll(".story-card, .desk-card, .story-figure, .category-art");
}

function showAll() {
  for (const node of revealTargets()) {
    node.classList.remove("reveal");
    node.classList.add("is-visible");
  }
}

function arm() {
  if (motion.matches || !("IntersectionObserver" in window)) {
    showAll();
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
  );
  const fold = window.innerHeight * 0.92;
  for (const node of revealTargets()) {
    if (node.getBoundingClientRect().top <= fold) {
      node.classList.add("is-visible");
      continue;
    }
    node.classList.add("reveal");
    observer.observe(node);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", arm, { once: true });
} else {
  arm();
}

motion.addEventListener("change", () => {
  if (motion.matches) showAll();
});
