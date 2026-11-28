import { traceHitbox, wallDistance } from "./weapons.js";

const bulletRange = 320;
const bulletInterval = 1.15;
const rocketInterval = 7;
const rocketTurnRate = 3.2;

export function createHostileFire(state, player, hitPlayer, burst, shock) {
  function arm(robot, { rockets = true, delay = 0.55 } = {}) {
    robot.nextBullet = state.time + delay;
    if (rockets) robot.nextRocket = state.time + rocketInterval;
  }

  function fire(robot, gap) {
    const angle = Math.atan2(player.y - robot.y, player.x - robot.x);
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const x = robot.x;
    const y = robot.y - 9;
    const clear = gap <= bulletRange && wallDistance(x, y + 9, dx, dy, gap) === gap;

    if (clear && state.time >= robot.nextBullet) {
      robot.nextBullet = state.time + bulletInterval;
      state.hostileBullets.push({ x, y, dx, dy, damage: 10, speed: 450, life: bulletRange / 450 });
      burst(x + dx * 7, y + dy * 7, ["#ffdc99", "#ff966b"], 4, 57);
    }
    if (robot.nextRocket !== undefined && state.time >= robot.nextRocket) {
      robot.nextRocket += rocketInterval;
      state.hostileRockets.push({
        x, y, angle, dx, dy, kind: "homingRocket", name: "Ракета", color: "#ff9e8a", eye: 0,
        hp: 50, maxHp: 50, damage: 25, speed: 138, life: 7,
      });
      burst(x + dx * 8, y + dy * 8, ["#ffb08b", "#ffecb4"], 12, 72);
    }
    return clear;
  }

  function advance(projectile, elapsed, homing = false) {
    const { x, y } = projectile;
    const duration = Math.min(elapsed, projectile.life);
    if (homing && !state.dead) {
      const targetAngle = Math.atan2(player.y - 9 - y, player.x - x);
      const difference = targetAngle - projectile.angle;
      const turn = Math.atan2(Math.sin(difference), Math.cos(difference));
      const maxTurn = rocketTurnRate * duration;
      projectile.angle += Math.max(-maxTurn, Math.min(maxTurn, turn));
      projectile.dx = Math.cos(projectile.angle);
      projectile.dy = Math.sin(projectile.angle);
    }

    const { dx, dy } = projectile;
    const distance = projectile.speed * duration;
    const clear = wallDistance(x, y + 9, dx, dy, distance);
    const padding = homing ? 3 : 0;
    const hit = state.dead ? null : traceHitbox(projectile,
      player.x - x - 7 - padding, player.y - y - 20 - padding,
      player.x - x + 7 + padding, player.y - y + 2 + padding, clear);
    projectile.x += dx * (hit ?? clear);
    projectile.y += dy * (hit ?? clear);
    projectile.life -= duration;
    if (hit === null && clear === distance && projectile.life > 0) return true;
    if (hit !== null) hitPlayer(projectile.damage);
    if (homing) {
      shock(projectile.x, projectile.y, 24, "#ff9d86", 0.35);
      burst(projectile.x, projectile.y, ["#fff0ba", "#ff966b", "#a65e56"], 23, 110);
    } else if (hit !== null || clear < distance) {
      burst(projectile.x, projectile.y, ["#ffcfaa", "#bc7657"], 5, 75);
    }
    return false;
  }

  function update(elapsed) {
    state.hostileBullets = state.hostileBullets.filter(bullet => advance(bullet, elapsed));
    state.hostileRockets = state.hostileRockets.filter(rocket => advance(rocket, elapsed, true));
  }

  return { arm, fire, update };
}
