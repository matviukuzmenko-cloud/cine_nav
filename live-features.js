(() => {
  const sections = ["about", "catalog", "tools", "guide"];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarsePointer = window.matchMedia("(pointer: coarse)");
  const phone = window.matchMedia("(max-width: 768px)");

  const cinemaNowTime = document.getElementById("cinemaNowTime");
  const cinemaNowVibe = document.getElementById("cinemaNowVibe");
  const liveStatMovies = document.getElementById("liveStatMovies");
  const liveStatMood = document.getElementById("liveStatMood");
  const sessionSheet = document.getElementById("sessionSheet");
  const sessionTitle = document.getElementById("sessionTitle");
  const sessionMeta = document.getElementById("sessionMeta");
  const sessionCopy = document.getElementById("sessionCopy");
  const sessionTimer = document.getElementById("sessionTimer");
  const fxLayer = document.getElementById("fxLayer");

  let currentSection = "about";
  let sessionMovie = null;
  let sessionEndsAt = 0;
  let sessionTick = 0;
  let lastShake = 0;
  let lastAccel = { x: 0, y: 0, z: 0 };
  let shakeArmed = false;

  const haptic = pattern => {
    if (!coarsePointer.matches) return;
    try { navigator.vibrate?.(pattern); } catch (_) {}
  };

  const pad = value => String(value).padStart(2, "0");

  const sessionSlot = (date = new Date()) => {
    const hour = date.getHours();
    if (hour >= 5 && hour < 11) {
      return {
        key: "morning",
        label: "Утренний сеанс",
        mood: "Мягкий свет",
        copy: "Для утреннего просмотра подойдут короткие и лёгкие фильмы.",
        genres: ["comedy", "romance", "drama"]
      };
    }
    if (hour >= 11 && hour < 17) {
      return {
        key: "day",
        label: "Дневной зал",
        mood: "Время для размышлений",
        copy: "Днём можно посмотреть детектив, драму или фантастический фильм.",
        genres: ["detective", "drama", "sci-fi"]
      };
    }
    if (hour >= 17 && hour < 22) {
      return {
        key: "prime",
        label: "Вечерний сеанс",
        mood: "Время для фильма",
        copy: "Вечером подойдут зрелищные фильмы с интересным сюжетом.",
        genres: ["action", "sci-fi", "comedy"]
      };
    }
    return {
      key: "night",
      label: "Поздний сеанс",
      mood: "Спокойный вечер",
      copy: "Для позднего просмотра подойдут фантастика, детектив или драма.",
      genres: ["sci-fi", "detective", "drama"]
    };
  };

  const eligibleMovies = () => {
    const list = typeof moviesDatabase !== "undefined" ? moviesDatabase : [];
    return list.filter(movie => typeof isCompleteMovie === "function" ? isCompleteMovie(movie) : movie?.title);
  };

  const pickForSlot = () => {
    const slot = sessionSlot();
    const movies = eligibleMovies();
    const watched = typeof watchedMovies !== "undefined" ? watchedMovies : [];
    const byMood = movies.filter(movie => slot.genres.includes(movie.genre) && !watched.includes(movie.id));
    const pool = byMood.length ? byMood : movies.filter(movie => !watched.includes(movie.id));
    const source = pool.length ? pool : movies;
    if (!source.length) return null;
    const scored = source
      .map(movie => ({ movie, rating: Number.parseFloat(movie.rating) || 0 }))
      .sort((a, b) => b.rating - a.rating);
    const top = scored.slice(0, Math.min(12, scored.length));
    return top[Math.floor(Math.random() * top.length)]?.movie || null;
  };

  const updateClock = () => {
    const now = new Date();
    const slot = sessionSlot(now);
    if (cinemaNowTime) cinemaNowTime.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    if (cinemaNowVibe) cinemaNowVibe.textContent = `${slot.label} · ${slot.mood}`;
    if (liveStatMood) liveStatMood.textContent = slot.mood;
    const movies = eligibleMovies();
    if (liveStatMovies) liveStatMovies.textContent = moviesDatabase.length ? String(moviesDatabase.length) : "—";
  };

  const burstPopcorn = (x = window.innerWidth / 2, y = window.innerHeight * 0.42) => {
    if (!fxLayer || reducedMotion.matches) return;
    const emojis = ["🍿", "✨", "🎬", "⭐", "💫"];
    for (let index = 0; index < 14; index++) {
      const crumb = document.createElement("span");
      crumb.className = "fx-crumb";
      crumb.textContent = emojis[index % emojis.length];
      const angle = (Math.PI * 2 * index) / 14;
      const distance = 70 + Math.random() * 90;
      crumb.style.left = `${x}px`;
      crumb.style.top = `${y}px`;
      crumb.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
      crumb.style.setProperty("--dy", `${Math.sin(angle) * distance - 40}px`);
      fxLayer.appendChild(crumb);
      window.setTimeout(() => crumb.remove(), 900);
    }
  };

  const openSession = (movie, source = "tonight") => {
    if (!movie || !sessionSheet) return;
    sessionMovie = movie;
    const slot = sessionSlot();
    const duration = typeof getMovieDuration === "function" ? getMovieDuration(movie) : movie.duration;
    const cleanTitle = String(movie.title).replace(/^«+|»+$/g, "");
    sessionTitle.textContent = `«${cleanTitle}»`;
    sessionMeta.textContent = `${movie.year} · ⭐ ${movie.rating} · ${duration} мин.`;
    sessionCopy.textContent = source === "shake"
      ? `Фильм выбран случайным образом. ${slot.copy}`
      : slot.copy;
    sessionSheet.classList.add("is-open");
    sessionSheet.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    haptic([18, 40, 18]);
    burstPopcorn();
  };

  const closeSession = () => {
    sessionSheet?.classList.remove("is-open");
    sessionSheet?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  };

  const formatRemain = ms => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return hours > 0
      ? `${hours}:${pad(minutes)}:${pad(seconds)}`
      : `${minutes}:${pad(seconds)}`;
  };

  const startSessionTimer = () => {
    if (!sessionMovie || !sessionTimer) return;
    const duration = typeof getMovieDuration === "function" ? getMovieDuration(sessionMovie) : Number(sessionMovie.duration);
    if (!Number.isFinite(duration) || duration <= 0) {
      sessionTimer.hidden = false;
      sessionTimer.textContent = "Длительность фильма неизвестна. Приятного просмотра!";
      return;
    }
    sessionEndsAt = Date.now() + duration * 60 * 1000;
    sessionTimer.hidden = false;
    const tick = () => {
      const remain = sessionEndsAt - Date.now();
      if (remain <= 0) {
        sessionTimer.textContent = "Фильм закончился. Спасибо за просмотр!";
        window.clearInterval(sessionTick);
        return;
      }
      sessionTimer.textContent = `До титров: ${formatRemain(remain)}`;
    };
    window.clearInterval(sessionTick);
    tick();
    sessionTick = window.setInterval(tick, 1000);
    haptic(24);
  };

  const goSection = name => {
    if (typeof window.switchSection === "function") window.switchSection(name);
    currentSection = name;
    haptic(10);
  };

  const triggerLuck = () => {
    goSection("catalog");
    window.setTimeout(() => {
      if (typeof window.pickRandomMovie === "function") window.pickRandomMovie();
    }, 40);
  };

  document.getElementById("mobileDock")?.addEventListener("click", event => {
    const button = event.target.closest("[data-dock]");
    if (!button) return;
    const action = button.dataset.dock;
    if (action === "luck") {
      button.classList.add("is-firing");
      window.setTimeout(() => button.classList.remove("is-firing"), 420);
      triggerLuck();
      return;
    }
    goSection(action);
  });

  document.getElementById("tonightPickBtn")?.addEventListener("click", () => {
    const movie = pickForSlot();
    if (!movie) return;
    openSession(movie, "tonight");
  });

  document.getElementById("sessionClose")?.addEventListener("click", closeSession);
  sessionSheet?.addEventListener("click", event => {
    if (event.target === sessionSheet) closeSession();
  });
  document.getElementById("sessionAgain")?.addEventListener("click", () => {
    const movie = pickForSlot();
    if (movie) openSession(movie, "tonight");
  });
  document.getElementById("sessionStart")?.addEventListener("click", startSessionTimer);
  document.getElementById("sessionTrailer")?.addEventListener("click", () => {
    if (sessionMovie && typeof window.watchMovieTrailer === "function") {
      closeSession();
      window.watchMovieTrailer(sessionMovie.id);
    }
  });

  document.addEventListener("cine:section-change", event => {
    currentSection = event.detail?.section || currentSection;
  });

  document.addEventListener("cine:lucky-pick", event => {
    const movie = event.detail?.movie;
    if (!movie) return;
    sessionMovie = movie;
    haptic([12, 30, 18]);
    burstPopcorn(window.innerWidth / 2, 180);
    const card = document.querySelector(`[data-movie-id="${movie.id}"]`);
    if (card) {
      card.classList.add("is-lucky-hit");
      window.setTimeout(() => card.classList.remove("is-lucky-hit"), 1400);
    }
    if (phone.matches && event.detail?.source !== "silent") openSession(movie, event.detail?.source || "catalog");
  });

  const maybeShakePick = event => {
    const acc = event.accelerationIncludingGravity;
    if (!acc) return;
    const delta = Math.abs(acc.x - lastAccel.x) + Math.abs(acc.y - lastAccel.y) + Math.abs(acc.z - lastAccel.z);
    lastAccel = { x: acc.x || 0, y: acc.y || 0, z: acc.z || 0 };
    if (delta < 28 || Date.now() - lastShake < 1400) return;
    lastShake = Date.now();
    triggerLuck();
  };

  const armShake = async () => {
    if (shakeArmed || reducedMotion.matches) return;
    try {
      if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
        const state = await DeviceMotionEvent.requestPermission();
        if (state !== "granted") return;
      }
      window.addEventListener("devicemotion", maybeShakePick, { passive: true });
      shakeArmed = true;
      const hint = document.getElementById("shakeHint");
      if (hint) hint.textContent = "Готово: встряхните телефон, чтобы выбрать фильм.";
    } catch (_) {}
  };

  document.getElementById("shakeHint")?.addEventListener("click", armShake);
  document.getElementById("mobileDock")?.addEventListener("click", armShake, { once: true });
  document.getElementById("tonightPickBtn")?.addEventListener("click", armShake, { once: true });

  let touchStartX = 0;
  let touchStartY = 0;
  document.addEventListener("touchstart", event => {
    if (!phone.matches || event.touches.length !== 1) return;
    const target = event.target;
    if (target.closest("input, textarea, select, .cinema-radio, .movie-modal, .session-sheet, .mobile-dock")) return;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
  }, { passive: true });

  document.addEventListener("touchend", event => {
    if (!phone.matches || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - touchStartX;
    const dy = event.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < 72 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    const index = sections.indexOf(currentSection);
    if (index < 0) return;
    const next = dx < 0 ? sections[index + 1] : sections[index - 1];
    if (next) goSection(next);
  }, { passive: true });

  document.addEventListener("click", event => {
    if (event.target.closest(".action-btn, .lucky-pick-btn, .dock-luck, .nav-btn, .tab-btn")) haptic(8);
  });

  if (phone.matches) {
    const radio = document.getElementById("cinemaRadio");
    const collapseButton = document.getElementById("radioCollapse");
    radio?.classList.add("is-collapsed");
    if (collapseButton) {
      collapseButton.textContent = "+";
      collapseButton.setAttribute("aria-expanded", "false");
      collapseButton.setAttribute("aria-label", "Развернуть кино-радио");
    }
  }

  const plannerTime = document.getElementById("aboutPlannerTime");
  const plannerGenre = document.getElementById("aboutPlannerGenre");
  const plannerResult = document.getElementById("aboutPlannerResult");
  const plannerPick = document.getElementById("aboutPlannerPick");
  const plannerOpen = document.getElementById("aboutPlannerOpen");
  let plannerMovie = null;

  const getWatchedIds = () => {
    const ids = new Set();
    try {
      if (typeof watchedMovies === "undefined" || !Array.isArray(watchedMovies)) return ids;
      watchedMovies.forEach(entry => {
        const value = entry && typeof entry === "object" ? (entry.id ?? entry.title) : entry;
        const movie = moviesDatabase.find(item => String(item.id) === String(value) || item.title === String(value));
        if (movie) ids.add(movie.id);
      });
    } catch (_) {}
    return ids;
  };

  plannerPick?.addEventListener("click", () => {
    if (!plannerTime || !plannerGenre || !plannerResult) return;
    const limit = Number(plannerTime.value);
    const genre = plannerGenre.value;
    const complete = eligibleMovies().filter(movie => {
      const duration = typeof getMovieDuration === "function" ? getMovieDuration(movie) : Number(movie.duration);
      return Number.isFinite(duration) && duration <= limit && (genre === "all" || movie.genre === genre);
    });
    const watched = getWatchedIds();
    const unseen = complete.filter(movie => !watched.has(movie.id));
    const pool = unseen.length ? unseen : complete;
    if (!pool.length) {
      plannerMovie = null;
      plannerOpen.hidden = true;
      plannerResult.classList.remove("has-result");
      plannerResult.textContent = "Не нашлось фильмов с указанными условиями. Попробуйте увеличить время или выбрать другой жанр.";
      return;
    }
    const topPicks = pool
      .map(movie => ({ movie, rating: Number.parseFloat(movie.rating) || 0 }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, Math.min(5, pool.length));
    plannerMovie = topPicks[Math.floor(Math.random() * topPicks.length)].movie;
    const duration = typeof getMovieDuration === "function" ? getMovieDuration(plannerMovie) : Number(plannerMovie.duration);
    const alreadyWatched = !unseen.length;
    plannerResult.textContent = `🎬 Рекомендуем «${plannerMovie.title}» — ${duration} минут, оценка ${Number.parseFloat(plannerMovie.rating).toFixed(1)} из 10. ${alreadyWatched ? "Вы уже отметили все подходящие фильмы как просмотренные — возможно, этот стоит пересмотреть." : ""}`;
    plannerResult.classList.remove("has-result");
    void plannerResult.offsetWidth;
    plannerResult.classList.add("has-result");
    plannerOpen.hidden = false;
    haptic(12);
  });

  plannerOpen?.addEventListener("click", () => {
    if (!plannerMovie) return;
    goSection("catalog");
    window.setTimeout(() => {
      if (typeof window.filterGenre === "function") window.filterGenre("all");
      const hideWatched = document.getElementById("hideWatchedToggle");
      if (hideWatched?.checked && typeof window.toggleWatchedFilter === "function") {
        hideWatched.checked = false;
        window.toggleWatchedFilter(false);
      }
      const search = document.getElementById("movieSearch");
      if (search) {
        search.value = plannerMovie.title;
        if (typeof window.applyMovieFilters === "function") window.applyMovieFilters();
      }
      const card = document.querySelector(`[data-movie-id="${plannerMovie.id}"]`);
      card?.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "center" });
    }, 60);
  });

  updateClock();
  window.setInterval(updateClock, 15000);
})();
