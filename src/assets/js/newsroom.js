const root = document.querySelector("[data-newsroom]");

if (root) {
  const buttons = [...root.querySelectorAll("[data-filter]")];
  const rows = [...root.querySelectorAll("[data-story]")];
  const empty = root.querySelector("[data-filter-empty]");

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const name = button.getAttribute("data-filter");
      let shown = 0;
      for (const item of buttons) {
        item.setAttribute("aria-pressed", item === button ? "true" : "false");
      }
      for (const row of rows) {
        const match = name === "all" || row.getAttribute("data-category") === name;
        row.hidden = !match;
        if (match) shown += 1;
      }
      if (empty) empty.hidden = shown > 0;
    });
  }
}
