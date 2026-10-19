(() => {
  const canvas = document.getElementById("movieRadarCanvas");
  const radar = document.getElementById("movieRadar");
  const toggle = document.getElementById("movieRadarToggle");
  const status = document.getElementById("movieRadarStatus");
  const tooltip = document.getElementById("movieRadarTooltip");
  const tooltipTitle = document.getElementById("movieRadarTitle");
  const tooltipMeta = document.getElementById("movieRadarMeta");
  const trailerButton = document.getElementById("movieRadarTrailer");
  const catalogSection = document.getElementById("sectionCatalog");
  if (!canvas || !radar || !toggle || !status || typeof moviesDatabase === "undefined") return;

  const context = canvas.getContext("2d");
  if (!context) return;

  const movies = moviesDatabase.map(movie => ({
    movie,
    year: Number.parseInt(movie.year, 10),
    rating: Number.parseFloat(movie.rating)
  })).filter(point => Number.isInteger(point.year) && point.year >= 1888 &&
    Number.isFinite(point.rating) && point.rating >= 0 && point.rating <= 10);
  const missingCount = moviesDatabase.length - movies.length;
  const years = movies.map(point => point.year);
  const ratings = movies.map(point => point.rating);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const minRating = Math.max(0, Math.floor(Math.min(...ratings) - 1));
  const maxRating = 10;
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let panX = 0;
  let panY = 0;
  let pointerStart = null;
  let didDrag = false;
  let plot = null;
  let hoverPoint = null;

  status.textContent = `${movies.length} фильмов с годом и рейтингом · ${missingCount} без координатных данных. Перетаскивай карту, наведи на точку для карточки.`;

  const themeColor = () => {
    const values = getComputedStyle(document.body).getPropertyValue("--neon-rgb").split(",").map(Number);
    return values.length === 3 && values.every(Number.isFinite) ? values : [0, 180, 216];
  };

  const layout = () => {
    width = Math.max(280, canvas.clientWidth || radar.clientWidth || 600);
    height = Math.max(340, canvas.clientHeight || 460);
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    plot = { left: 54, right: width - 22, top: 24, bottom: height - 46 };
    draw();
  };

  const pointPosition = point => {
    const xRatio = maxYear === minYear ? .5 : (point.year - minYear) / (maxYear - minYear);
    const yRatio = maxRating === minRating ? .5 : (point.rating - minRating) / (maxRating - minRating);
    return {
      x: plot.left + xRatio * (plot.right - plot.left) + panX,
      y: plot.bottom - yRatio * (plot.bottom - plot.top) + panY
    };
  };

  const draw = () => {
    if (!plot || radar.hidden) return;
    const [red, green, blue] = themeColor();
    const plotWidth = plot.right - plot.left;
    const plotHeight = plot.bottom - plot.top;
    context.clearRect(0, 0, width, height);
    context.save();
    context.beginPath();
    context.rect(plot.left, plot.top, plotWidth, plotHeight);
    context.clip();
    context.font = "12px 'DM Sans', sans-serif";
    context.lineWidth = 1;
    const yearTicks = [];
    const ratingTicks = [];

    for (let index = 0; index <= 5; index++) {
      const ratio = index / 5;
      const x = plot.left + ratio * plotWidth + panX;
      const year = Math.round(minYear + ratio * (maxYear - minYear));
      context.strokeStyle = `rgba(${red}, ${green}, ${blue}, .16)`;
      context.beginPath();
      context.moveTo(x, plot.top);
      context.lineTo(x, plot.bottom);
      context.stroke();
      yearTicks.push({ value: String(year), x });
    }

    for (let rating = minRating; rating <= maxRating; rating++) {
      const ratio = (rating - minRating) / Math.max(1, maxRating - minRating);
      const y = plot.bottom - ratio * plotHeight + panY;
      context.strokeStyle = `rgba(${red}, ${green}, ${blue}, .13)`;
      context.beginPath();
      context.moveTo(plot.left, y);
      context.lineTo(plot.right, y);
      context.stroke();
      ratingTicks.push({ value: rating.toFixed(1), y });
    }

    movies.forEach(point => {
      const position = pointPosition(point);
      point.screenX = position.x;
      point.screenY = position.y;
      const isHovered = point === hoverPoint;
      context.beginPath();
      context.arc(position.x, position.y, isHovered ? 6 : 3.4, 0, Math.PI * 2);
      context.fillStyle = isHovered ? "#ffffff" : `rgba(${red}, ${green}, ${blue}, .88)`;
      context.shadowColor = `rgba(${red}, ${green}, ${blue}, .8)`;
      context.shadowBlur = isHovered ? 18 : 9;
      context.fill();
    });

    context.restore();
    context.font = "12px 'DM Sans', sans-serif";
    context.fillStyle = `rgba(${red}, ${green}, ${blue}, .8)`;
    context.textAlign = "center";
    context.textBaseline = "top";
    yearTicks.forEach(tick => context.fillText(tick.value, tick.x, plot.bottom + 12));
    context.textAlign = "right";
    context.textBaseline = "middle";
    ratingTicks.forEach(tick => context.fillText(tick.value, plot.left - 10, tick.y));
    context.strokeStyle = `rgba(${red}, ${green}, ${blue}, .45)`;
    context.beginPath();
    context.moveTo(plot.left, plot.top);
    context.lineTo(plot.left, plot.bottom);
    context.lineTo(plot.right, plot.bottom);
    context.stroke();
  };

  const showTooltip = point => {
    if (!point || !tooltip || !tooltipTitle || !tooltipMeta) return;
    hoverPoint = point;
    tooltipTitle.textContent = point.movie.title;
    tooltipMeta.textContent = `${point.year} год · ⭐ ${point.rating.toFixed(1)}`;
    tooltip.style.left = `${Math.min(Math.max(8, point.screenX + 14), Math.max(8, width - 256))}px`;
    tooltip.style.top = `${Math.min(Math.max(8, point.screenY - 24), Math.max(8, height - 132))}px`;
    tooltip.hidden = false;
    canvas.setAttribute("aria-label", `${point.movie.title}, ${point.year} год, рейтинг ${point.rating.toFixed(1)}. Перетаскивайте карту для перемещения.`);
    draw();
  };

  const hideTooltip = () => {
    hoverPoint = null;
    if (tooltip) tooltip.hidden = true;
    canvas.setAttribute("aria-label", "Карта фильмов: перетаскивайте для перемещения, наведите на точку для подробностей");
    draw();
  };

  const nearestPoint = (x, y) => {
    let nearest = null;
    let nearestDistance = 14;
    movies.forEach(point => {
      const distance = Math.hypot(point.screenX - x, point.screenY - y);
      if (distance < nearestDistance) {
        nearest = point;
        nearestDistance = distance;
      }
    });
    return nearest;
  };

  canvas.addEventListener("pointerdown", event => {
    pointerStart = { x: event.clientX, y: event.clientY, panX, panY };
    didDrag = false;
    canvas.setPointerCapture?.(event.pointerId);
    canvas.classList.add("is-dragging");
  });
  canvas.addEventListener("pointermove", event => {
    const bounds = canvas.getBoundingClientRect();
    if (pointerStart) {
      const deltaX = event.clientX - pointerStart.x;
      const deltaY = event.clientY - pointerStart.y;
      if (Math.hypot(deltaX, deltaY) > 3) didDrag = true;
      if (didDrag) {
        panX = Math.max(-width * .75, Math.min(width * .75, pointerStart.panX + deltaX));
        panY = Math.max(-height * .65, Math.min(height * .65, pointerStart.panY + deltaY));
        draw();
        return;
      }
    }
    const point = nearestPoint(event.clientX - bounds.left, event.clientY - bounds.top);
    if (point !== hoverPoint) {
      if (point) showTooltip(point);
      else hideTooltip();
    }
  });

  canvas.addEventListener("pointerup", event => {
    pointerStart = null;
    canvas.classList.remove("is-dragging");
    if (didDrag) {
      didDrag = false;
      hideTooltip();
      return;
    }
    const bounds = canvas.getBoundingClientRect();
    const point = nearestPoint(event.clientX - bounds.left, event.clientY - bounds.top);
    if (point) showTooltip(point);
  });
  canvas.addEventListener("pointercancel", () => {
    pointerStart = null;
    canvas.classList.remove("is-dragging");
  });
  canvas.addEventListener("pointerleave", event => {
    if (!pointerStart && !tooltip?.contains(event.relatedTarget)) hideTooltip();
  });
  canvas.addEventListener("keydown", event => {
    const step = event.shiftKey ? 80 : 32;
    if (event.key === "ArrowLeft") panX = Math.min(width * .75, panX + step);
    else if (event.key === "ArrowRight") panX = Math.max(-width * .75, panX - step);
    else if (event.key === "ArrowUp") panY = Math.min(height * .65, panY + step);
    else if (event.key === "ArrowDown") panY = Math.max(-height * .65, panY - step);
    else return;
    event.preventDefault();
    draw();
  });

  trailerButton?.addEventListener("click", () => {
    if (hoverPoint && typeof window.watchMovieTrailer === "function") window.watchMovieTrailer(hoverPoint.movie.id);
  });
  toggle.addEventListener("click", () => {
    const shouldShow = radar.hidden;
    radar.hidden = !shouldShow;
    catalogSection?.classList.toggle("radar-active", shouldShow);
    toggle.setAttribute("aria-pressed", String(shouldShow));
    toggle.textContent = shouldShow ? "📚 Список фильмов" : "🌌 Карта кино";
    if (shouldShow) requestAnimationFrame(layout);
  });

  window.addEventListener("resize", () => {
    if (!radar.hidden) layout();
  }, { passive: true });
  new MutationObserver(() => {
    if (!radar.hidden) draw();
  }).observe(document.body, {
    attributes: true,
    attributeFilter: ["data-theme", "data-flight-theme", "data-site-style"]
  });
})();