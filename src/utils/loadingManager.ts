import * as THREE from "three";

export const loadingManager = new THREE.LoadingManager();

loadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
  console.log(
    `Started loading file: ${url}.\nLoaded ${itemsLoaded} of ${itemsTotal} files.`
  );
};

loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
  const progress = (itemsLoaded / itemsTotal) * 100;
  console.log(`Loading file: ${url}.\nProgress: ${progress.toFixed(2)}%`);
  updateProgressBar(progress);
};

loadingManager.onLoad = () => {
  console.log("All resources loaded!");
  document.getElementById("loading-screen")?.remove();

  setTimeout(() => {
    const interfaceElement = document.getElementById("controls");
    if (interfaceElement) {
      interfaceElement.classList.remove("hidden");
    }
  }, 1000);
};

loadingManager.onError = (url) => {
  console.error(`There was an error loading ${url}`);
};

function updateProgressBar(progress: number) {
  const progressBar = document.getElementById("progress-bar");
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }
}
