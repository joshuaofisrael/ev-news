(function () {
  var current = document.querySelector(".topic-list a[aria-current='page']");
  if (current && current.scrollIntoView) {
    current.scrollIntoView({ inline: "center", block: "nearest", behavior: "auto" });
  }

  var toggle = document.getElementById("utility-menu");
  if (!toggle) return;
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && toggle.checked) {
      toggle.checked = false;
      toggle.focus();
    }
  });
})();
