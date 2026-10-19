(() => {
  const storageKey = "cineNavigatorUserRatings";
  const isRatingsObject = value => value && typeof value === "object" && !Array.isArray(value);
  let userRatings = {};

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    if (isRatingsObject(saved)) {
      Object.entries(saved).forEach(([id, value]) => {
        const rating = Number(value);
        if (id && Number.isInteger(rating) && rating >= 1 && rating <= 5) userRatings[id] = rating;
      });
    }
  } catch (_) {}
  window.userRatings = userRatings;

  const getRatings = () => isRatingsObject(window.userRatings) ? window.userRatings : userRatings;
  const getRating = id => {
    const rating = Number(getRatings()[id]);
    return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : 0;
  };

  const persistRatings = () => {
    userRatings = getRatings();
    try { localStorage.setItem(storageKey, JSON.stringify(userRatings)); } catch (_) {}
    if (typeof window.saveOnlineProfile === "function") {
      try { Promise.resolve(window.saveOnlineProfile()).catch(() => {}); } catch (_) {}
    }
  };

  const findMovieForCard = card => {
    if (typeof moviesDatabase === "undefined") return null;
    const title = card.querySelector(".car-title")?.textContent?.trim();
    return moviesDatabase.find(movie => movie.title === title) || null;
  };

  const renderRatingControls = () => {
    const grid = document.getElementById("moviesGrid");
    if (!grid || typeof moviesDatabase === "undefined") return;

    grid.querySelectorAll(".car-card").forEach(card => {
      const movie = findMovieForCard(card);
      const actions = card.querySelector(".movie-card-actions");
      if (!movie || !actions) return;

      let ratingRow = actions.querySelector(".personal-rating");
      if (!ratingRow) {
        ratingRow = document.createElement("div");
        ratingRow.className = "personal-rating";
        ratingRow.setAttribute("role", "group");
        actions.appendChild(ratingRow);
      }
      ratingRow.setAttribute("aria-label", `Ваша оценка фильма «${movie.title}»`);
      ratingRow.replaceChildren();

      const score = getRating(movie.id);
      const caption = document.createElement("span");
      caption.className = "personal-rating-label";
      caption.textContent = score ? `Ваша оценка: ${score}/5` : "Оцените фильм:";
      ratingRow.appendChild(caption);

      const stars = document.createElement("span");
      stars.className = "personal-rating-stars";
      for (let value = 1; value <= 5; value++) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `rating-star${value <= score ? " is-selected" : ""}`;
        button.dataset.movieId = String(movie.id);
        button.dataset.rating = String(value);
        button.textContent = "★";
        button.setAttribute("aria-label", `Оценить «${movie.title}» на ${value} из 5`);
        button.setAttribute("aria-pressed", String(value === score));
        stars.appendChild(button);
      }
      ratingRow.appendChild(stars);
    });
  };

  const sortCardsByPersonalRating = () => {
    const grid = document.getElementById("moviesGrid");
    if (!grid || typeof moviesDatabase === "undefined") return;
    const cards = [...grid.querySelectorAll(".car-card")];
    cards.sort((a, b) => {
      const movieA = findMovieForCard(a);
      const movieB = findMovieForCard(b);
      const scoreA = getRating(movieA?.id);
      const scoreB = getRating(movieB?.id);
      const catalogueA = Number.parseFloat(movieA?.rating) || 0;
      const catalogueB = Number.parseFloat(movieB?.rating) || 0;
      return scoreB - scoreA || catalogueB - catalogueA;
    });
    grid.append(...cards);
  };

  const baseRenderMovies = window.renderMovies;
  if (typeof baseRenderMovies === "function") {
    window.renderMovies = function () {
      const rendered = baseRenderMovies.apply(this, arguments);
      renderRatingControls();
      if (typeof currentSort !== "undefined" && currentSort === "personal") sortCardsByPersonalRating();
      return rendered;
    };
  }

  const baseSortMovies = window.sortMovies;
  if (typeof baseSortMovies === "function") {
    window.sortMovies = function (sortType) {
      if (sortType !== "personal") return baseSortMovies.apply(this, arguments);
      currentSort = "personal";
      document.querySelectorAll(".sort-btn").forEach(button => button.classList.remove("active"));
      document.getElementById("sort-personal")?.classList.add("active");
      if (typeof window.applyMovieFilters === "function") window.applyMovieFilters();
      else {
        renderRatingControls();
        sortCardsByPersonalRating();
      }
    };
  }

  document.getElementById("moviesGrid")?.addEventListener("click", event => {
    const button = event.target.closest(".rating-star");
    if (!button) return;
    const id = button.dataset.movieId;
    const rating = Number(button.dataset.rating);
    if (!id || !Number.isInteger(rating) || rating < 1 || rating > 5) return;

    const ratings = getRatings();
    ratings[id] = rating;
    userRatings = ratings;
    window.userRatings = ratings;
    persistRatings();
    renderRatingControls();
    if (typeof currentSort !== "undefined" && currentSort === "personal") sortCardsByPersonalRating();
    if (document.getElementById("personalRecommendation")?.textContent &&
        typeof window.recommendFromRatings === "function") window.recommendFromRatings();
  });

  window.recommendFromRatings = function () {
    const output = document.getElementById("personalRecommendation");
    if (!output || typeof moviesDatabase === "undefined") return;

    const rated = moviesDatabase
      .map(movie => ({ movie, rating: getRating(movie.id) }))
      .filter(item => item.rating > 0);
    if (!rated.length) {
      output.textContent = "Оцените несколько фильмов в каталоге — и система предложит похожие.";
      output.className = "result-placeholder result-error";
      return;
    }

    const genreStats = new Map();
    let totalRating = 0;
    rated.forEach(({ movie, rating }) => {
      totalRating += rating;
      if (!movie.genre) return;
      const entry = genreStats.get(movie.genre) || { total: 0, count: 0 };
      entry.total += rating;
      entry.count++;
      genreStats.set(movie.genre, entry);
    });
    const overallPreference = totalRating / rated.length;

    const watched = new Set();
    if (typeof watchedMovies !== "undefined" && Array.isArray(watchedMovies)) {
      watchedMovies.forEach(entry => {
        const value = entry && typeof entry === "object" ? (entry.id ?? entry.title) : entry;
        watched.add(String(value));
      });
    }

    const candidates = moviesDatabase
      .filter(movie => !getRating(movie.id) && !watched.has(String(movie.id)) &&
        !watched.has(String(movie.title)) &&
        (typeof isCompleteMovie !== "function" || isCompleteMovie(movie)))
      .map(movie => {
        const genre = genreStats.get(movie.genre);
        const genrePreference = genre ? genre.total / genre.count : overallPreference;
        const catalogueRating = Number.parseFloat(movie.rating);
        const popularity = Number.isFinite(catalogueRating) ? catalogueRating / 10 : 0;
        // Высокие оценки жанра повышают похожие фильмы, низкие — снижают их.
        const personalization = genre ? (genrePreference - 3) * 1.5 : (overallPreference - 3) * 0.35;
        return { movie, score: popularity + personalization, genrePreference, genreMatch: Boolean(genre) };
      })
      .sort((a, b) => b.score - a.score ||
        (Number.parseFloat(b.movie.rating) || 0) - (Number.parseFloat(a.movie.rating) || 0));

    const pick = candidates[0];
    if (!pick) {
      output.textContent = "Вы уже оценили или посмотрели все фильмы, доступные для рекомендации.";
      output.className = "result-placeholder";
      return;
    }

    output.textContent = pick.genreMatch && pick.genrePreference >= 3.5
      ? `✨ По вашим оценкам жанра «${pick.movie.genre}» вам может понравиться фильм «${pick.movie.title}» (${pick.movie.year} г.).`
      : `🎬 Возможно, вам понравится фильм «${pick.movie.title}» (${pick.movie.year} г.). Рекомендация учитывает ваши оценки и рейтинг каталога.`;
    output.className = "result-placeholder result-success";
  };

  const grid = document.getElementById("moviesGrid");
  if (grid) {
    renderRatingControls();
    new MutationObserver(renderRatingControls).observe(grid, { childList: true });
  }
  window.recommendFromRatings();
})();

// Add mood tags to the existing catalogue without changing its movie records.
(() => {
  if (typeof moviesDatabase === "undefined") return;

  const moodPatterns = {
    cry: /слез|любов|семь|семь[еийю]|потер|надежд|дружб|памят|жизнь прекрасна|титаник|достучаться до небес/i,
    adrenaline: /погон|битв|войн|пилот|самолет|самолёт|гонк|боев|экшен|спас|побег|авиатор|топ ган|экипаж|гудзон|салют-7|время первых/i,
    mind: /сон|сознани|реальност|тайн|загад|расслед|психолог|парадокс|врем|память|иллюзи|престиж|остров проклятых|матриц|начало/i
  };
  const moodGenres = {
    cry: new Set(["drama", "romance"]),
    adrenaline: new Set(["action"]),
    mind: new Set(["sci-fi", "detective"])
  };

  moviesDatabase.forEach(movie => {
    const searchable = `${movie.title || ""} ${movie.desc || ""} ${movie.longDesc || ""}`;
    movie.mood = Object.keys(moodPatterns).filter(mood =>
      moodGenres[mood].has(movie.genre) || moodPatterns[mood].test(searchable)
    );
  });

  window.pickBlindMood = mood => {
    const output = document.getElementById("blindMoodResult");
    if (!output) return;
    const candidates = moviesDatabase.filter(movie =>
      Array.isArray(movie.mood) && movie.mood.includes(mood) && movie.title
    );
    if (!candidates.length) {
      output.textContent = "Для выбранного настроения пока не нашлось подходящего фильма. Выберите другой вариант.";
      output.className = "result-placeholder result-error";
      return;
    }

    const movie = candidates[Math.floor(Math.random() * candidates.length)];
    const description = String(movie.desc || movie.longDesc || "").trim();
    output.textContent = `🎬 Рекомендуем фильм «${movie.title}»${description ? ` — ${description}` : ""}`;
    output.className = "result-placeholder result-success";
  };

  document.querySelectorAll("[data-blind-mood]").forEach(button => {
    button.addEventListener("click", () => window.pickBlindMood(button.dataset.blindMood));
  });
})();