(() => {
  const scene = document.getElementById("scene");
  const layers = [...document.querySelectorAll(".layer[data-depth]")];
  const navLinks = [...document.querySelectorAll(".nav-link")];
  const sectionButtons = [...document.querySelectorAll("[data-section]")];
  const panels = [...document.querySelectorAll(".section-panel")];
  const sectionStage = document.getElementById("sectionStage");
  const sectionClose = document.getElementById("sectionClose");
  const trackList = document.getElementById("trackList");
  const trackEmpty = document.getElementById("trackEmpty");
  const playBtn = document.getElementById("playBtn");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const trackTitle = document.getElementById("trackTitle");
  const audio = document.getElementById("audio");
  const player = document.querySelector(".player");

  let tracks = [];
  let currentIndex = 0;
  let activeSection = null;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let rafId = 0;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function titleFromFile(file) {
    return file
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function normalizeTracks(data) {
    if (!Array.isArray(data)) return [];

    return data
      .map((item) => {
        if (typeof item === "string") {
          return { file: item, title: titleFromFile(item) };
        }
        if (item && typeof item.file === "string") {
          return {
            file: item.file,
            title: item.title || titleFromFile(item.file),
          };
        }
        return null;
      })
      .filter(Boolean)
      .map((track) => ({
        ...track,
        src: `music/${encodeURIComponent(track.file).replace(/%2F/g, "/")}`,
      }));
  }

  function updatePlayerChrome() {
    const track = tracks[currentIndex];
    const hasTracks = tracks.length > 0;

    trackTitle.textContent = track ? track.title : "No tracks yet";
    playBtn.disabled = !hasTracks;
    prevBtn.disabled = !hasTracks;
    nextBtn.disabled = !hasTracks;

    if (track) {
      playBtn.setAttribute("aria-label", audio.paused ? `Play ${track.title}` : `Pause ${track.title}`);
    } else {
      playBtn.setAttribute("aria-label", "Play");
    }

    syncTrackListUI();
  }

  function syncTrackListUI() {
    if (!trackList) return;

    [...trackList.children].forEach((item, index) => {
      item.classList.toggle("is-current", index === currentIndex);
      item.classList.toggle("is-playing", index === currentIndex && !audio.paused);
    });
  }

  function setPlayingUI(isPlaying) {
    playBtn.classList.toggle("is-playing", isPlaying);
    player.classList.toggle("is-playing", isPlaying);
    updatePlayerChrome();
  }

  async function loadTrack(index, { autoplay = false } = {}) {
    if (!tracks.length) {
      audio.removeAttribute("src");
      audio.load();
      setPlayingUI(false);
      updatePlayerChrome();
      return;
    }

    currentIndex = (index + tracks.length) % tracks.length;
    const track = tracks[currentIndex];
    audio.src = track.src;
    audio.load();
    updatePlayerChrome();

    if (autoplay) {
      try {
        await audio.play();
        setPlayingUI(true);
      } catch {
        setPlayingUI(false);
      }
    } else {
      setPlayingUI(false);
    }
  }

  async function togglePlayback() {
    if (!tracks.length) return;

    try {
      if (audio.paused) {
        if (!audio.getAttribute("src")) {
          await loadTrack(currentIndex, { autoplay: true });
          return;
        }
        await audio.play();
        setPlayingUI(true);
      } else {
        audio.pause();
        setPlayingUI(false);
      }
    } catch {
      setPlayingUI(false);
    }
  }

  function renderTrackList() {
    trackList.innerHTML = "";

    if (!tracks.length) {
      trackEmpty.hidden = false;
      return;
    }

    trackEmpty.hidden = true;

    tracks.forEach((track, index) => {
      const li = document.createElement("li");
      li.className = "track-item";
      li.innerHTML = `
        <button class="track-item-play" type="button" aria-label="Play ${track.title}">
          <svg class="icon-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5L8 5.5z" /></svg>
          <svg class="icon-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7V5zm6.5 0H17v14h-3.5V5z" /></svg>
        </button>
        <span class="track-item-title"></span>
      `;
      li.querySelector(".track-item-title").textContent = track.title;

      li.querySelector(".track-item-play").addEventListener("click", async () => {
        if (index === currentIndex && !audio.paused) {
          audio.pause();
          setPlayingUI(false);
          return;
        }
        await loadTrack(index, { autoplay: true });
      });

      trackList.appendChild(li);
    });

    syncTrackListUI();
  }

  async function loadPlaylist() {
    // Prefer js/playlist.js so the site works when opened via file:// in Chrome.
    // Optional fallback: music/tracks.json when served over http(s).
    let raw = window.ENDLESS_PLAYLIST;

    if (!Array.isArray(raw) || raw.length === 0) {
      try {
        const response = await fetch("music/tracks.json", { cache: "no-store" });
        if (response.ok) raw = await response.json();
      } catch {
        raw = [];
      }
    }

    tracks = normalizeTracks(raw || []);
    renderTrackList();
    await loadTrack(0, { autoplay: false });
  }

  function openSection(name) {
    if (!name) return;

    if (activeSection === name) {
      closeSection();
      return;
    }

    activeSection = name;
    scene.classList.add("is-open");
    sectionStage.setAttribute("aria-hidden", "false");

    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link.dataset.section === name);
    });

    panels.forEach((panel) => {
      panel.hidden = panel.dataset.panel !== name;
    });
  }

  function closeSection() {
    activeSection = null;
    scene.classList.remove("is-open");
    sectionStage.setAttribute("aria-hidden", "true");
    navLinks.forEach((link) => link.classList.remove("is-active"));
    panels.forEach((panel) => {
      panel.hidden = true;
    });
  }

  sectionButtons.forEach((button) => {
    button.addEventListener("click", () => openSection(button.dataset.section));
  });

  sectionClose?.addEventListener("click", closeSection);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSection();
  });

  playBtn?.addEventListener("click", togglePlayback);
  prevBtn?.addEventListener("click", () => {
    if (!tracks.length) return;
    loadTrack(currentIndex - 1, { autoplay: true });
  });
  nextBtn?.addEventListener("click", () => {
    if (!tracks.length) return;
    loadTrack(currentIndex + 1, { autoplay: true });
  });

  audio?.addEventListener("ended", () => {
    if (!tracks.length) {
      setPlayingUI(false);
      return;
    }
    loadTrack(currentIndex + 1, { autoplay: true });
  });

  audio?.addEventListener("pause", () => {
    if (!audio.ended) setPlayingUI(false);
  });

  audio?.addEventListener("play", () => setPlayingUI(true));

  function onPointerMove(event) {
    const rect = scene.getBoundingClientRect();
    targetX = (event.clientX - rect.left) / rect.width - 0.5;
    targetY = (event.clientY - rect.top) / rect.height - 0.5;
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

  window.addEventListener("beforeunload", () => {
    if (rafId) cancelAnimationFrame(rafId);
  });

  loadPlaylist();
})();
