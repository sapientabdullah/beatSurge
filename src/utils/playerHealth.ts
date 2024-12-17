import { endGame } from "../main";

export let playerHealth = 100;
export const maxHealth = 100;
export const healthDecreaseAmount = 10;
export const collisionDamageCooldown = 1000;

export function decreasePlayerHealth(amount: number) {
  playerHealth -= amount;
  if (playerHealth < 0) {
    playerHealth = 0;
    endGame();
  }
  updateHealthBar();
}

export function updateHealthBar() {
  const healthBar = document.getElementById("health-bar");
  if (healthBar) {
    const healthPercentage = (playerHealth / maxHealth) * 100;
    healthBar.style.width = `${healthPercentage}%`;
  }
}

export function resetPlayerHealth() {
  playerHealth = maxHealth;
  updateHealthBar();
}
