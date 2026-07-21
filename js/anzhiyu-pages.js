(function () {
  function initAnzhiyuPages() {
    const shells = document.querySelectorAll(".az-page-shell");
    if (!shells.length) return;

    shells.forEach((shell) => {
      if (shell.dataset.azInit === "1") return;
      shell.dataset.azInit = "1";

      const bars = shell.querySelectorAll(".az-progress-bar[data-value]");
      bars.forEach((bar) => {
        const value = Number(bar.getAttribute("data-value") || 0);
        const safeValue = Math.max(0, Math.min(100, value));
        requestAnimationFrame(() => {
          bar.style.width = safeValue + "%";
        });
      });

      shell.addEventListener("mousemove", (event) => {
        if (window.innerWidth < 900) return;
        const rect = shell.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        shell.style.transform = "rotateX(" + -y * 2 + "deg) rotateY(" + x * 2 + "deg)";
      });

      shell.addEventListener("mouseleave", () => {
        shell.style.transform = "rotateX(0deg) rotateY(0deg)";
      });
    });
  }

  document.addEventListener("DOMContentLoaded", initAnzhiyuPages);
  document.addEventListener("pjax:complete", initAnzhiyuPages);
})();
