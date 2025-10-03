// Theme initialization script to prevent hydration mismatches and theme flash
(function () {
  try {
    const stored = localStorage.getItem("theme");
    const theme = stored || "system";
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const resolved = theme === "system" ? (media.matches ? "dark" : "light") : theme;
    const root = document.documentElement;

    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    root.style.colorScheme = resolved;

    // Ensure body is visible after theme is applied
    document.addEventListener("DOMContentLoaded", function () {
      document.body.style.visibility = "visible";
    });
  } catch (e) {
    // Fallback to light theme if localStorage is not available
    const root = document.documentElement;
    root.classList.add("light");
    root.style.colorScheme = "light";
    document.addEventListener("DOMContentLoaded", function () {
      document.body.style.visibility = "visible";
    });
  }
})();
