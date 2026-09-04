(() => {
  const scene = document.getElementById("scene");
  const layers = [...document.querySelectorAll(".layer[data-depth]")];
  const playBtn = document.getElementById("playBtn");
  const audio = document.getElementById("audio");
  const player = document.querySelector(".player");

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let rafId = 0;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function onPointerMove(event) {
    const rect = scene.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    targetX = x;
    targetY = y;
  }

  function onPointerLeave() {
    targetX = 0;
    targetY = 0;
  }

  function render() {
    currentX += (targetX - currentX) * 0.06;
    currentY += (targetY - currentY) * 0.06;

    for (const layer of layers) {
      const depth = Number(layer.dataset.depth) || 0;
      const moveX = currentX * depth * -120;
      const moveY = currentY * depth * -80;
      const extra = layer.classList.contains("layer-moon") ? "translateX(-50%) " : "";
      layer.style.transform = `${extra}translate3d(${moveX}px, ${moveY}px, 0)`;
    }

    rafId = requestAnimationFrame(render);
  }

  if (!reduceMotion && scene) {
    scene.addEventListener("pointermove", onPointerMove);
    scene.addEventListener("pointerleave", onPointerLeave);
    rafId = requestAnimationFrame(render);
  }

  async function togglePlayback() {
    if (!audio) return;

    if (audio.error || !audio.getAttribute("src")) {
      playBtn.classList.toggle("is-playing");
      player.classList.toggle("is-playing");
      return;
    }

    try {
      if (audio.paused) {
        await audio.play();
        playBtn.classList.add("is-playing");
        player.classList.add("is-playing");
        playBtn.setAttribute("aria-label", "Pause Moon Over Silent Water");
      } else {
        audio.pause();
        playBtn.classList.remove("is-playing");
        player.classList.remove("is-playing");
        playBtn.setAttribute("aria-label", "Play Moon Over Silent Water");
      }
    } catch {
      // No track file yet — still animate UI so layout can be checked.
      playBtn.classList.toggle("is-playing");
      player.classList.toggle("is-playing");
    }
  }

  playBtn?.addEventListener("click", togglePlayback);

  audio?.addEventListener("ended", () => {
    playBtn.classList.remove("is-playing");
    player.classList.remove("is-playing");
    playBtn.setAttribute("aria-label", "Play Moon Over Silent Water");
  });

  window.addEventListener("beforeunload", () => {
    if (rafId) cancelAnimationFrame(rafId);
  });
})();
