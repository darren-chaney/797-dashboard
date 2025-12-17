// bootstrap.js
function setActiveModule(moduleName) {
  document.querySelectorAll(".module-nav a").forEach(link => {
    link.classList.toggle(
      "active",
      link.dataset.module === moduleName
    );
  });
}
