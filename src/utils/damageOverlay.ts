export function triggerDamageOverlay() {
  const overlay = document.getElementById("damage-overlay");
  if (!overlay) return;

  overlay.style.opacity = "1";

  setTimeout(() => {
    overlay.style.opacity = "0";
  }, 300);
}
