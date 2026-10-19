(() => {
  const bingoGrid = document.getElementById("movieBingoGrid");
  const bingoStatus = document.getElementById("movieBingoStatus");
  const bingoNew = document.getElementById("movieBingoNew");
  const bingoKey = "cineNavigatorMovieBingo";
  const bingoGenreSelect = document.getElementById("movieBingoGenre");
  const bingoGenreKey = "cineNavigatorMovieBingoGenre";
  const moments = [
    "Неожиданный поворот", "Кто-то говорит «Я же предупреждал»", "Погоня", "Дождь в важный момент",
    "Злодей объясняет свой план", "Кто-то спасает день в последний миг", "Знакомая цитата", "Смешной друг героя",
    "Таинственный незнакомец", "Очень драматичный взгляд", "Герой нарушает правила", "Всё было не так",
    "Кто-то звонит не вовремя", "Красивый кадр замедляют", "Герой остаётся один", "План идёт не по плану",
    "Неожиданная дружба", "Музыка подсказывает эмоцию", "Предмет важнее, чем кажется", "Намёк на продолжение"
  ];
  const momentsByGenre = {
    horror: [
      "Внезапный скример", "В кадре гаснет свет", "Герой слышит странный звук", "Дверь сама открывается",
      "Герои решают разделиться", "Телефон не ловит сеть", "Монстр появляется в отражении", "Кто-то шепчет из темноты",
      "Герой говорит: «Здесь кто-нибудь есть?»", "Неожиданное появление за спиной"
    ],
    action: [
      "Взрыв автомобиля", "Начинается погоня", "Пафосная фраза перед дракой", "Эффектная перезарядка оружия",
      "Герой прыгает с высоты", "Уклонение в последнюю секунду", "Взрыв на фоне героя", "Драка в узком коридоре",
      "План идёт не по плану", "Кто-то спасает день в последний миг"
    ],
    "sci-fi": [
      "Появляется голограмма", "Робот спорит с человеком", "Герой смотрит на чужую планету", "Искусственный интеллект нарушает приказ",
      "Обнаруживается новая технология", "Корабль терпит аварию", "Кто-то задаёт вопрос о времени", "Не всё оказалось реальностью",
      "В кадре появляется инопланетянин", "Герои обсуждают судьбу человечества"
    ],
    comedy: [
      "Неудачная попытка выглядеть круто", "Шутка прозвучала не вовремя", "Герой попадает в неловкую ситуацию", "Кто-то путает имена",
      "Серьёзное лицо не выдерживает", "Забавное падение", "План идёт не по плану", "Кто-то случайно говорит правду",
      "Неожиданное примирение", "Повторяется старая шутка"
    ],
    detective: [
      "Подозреваемый меняет показания", "Найденная улика всё меняет", "Сыщик замечает мелкую деталь", "Кто-то скрывает важную информацию",
      "Герой строит теорию на месте", "Неожиданный свидетель", "Обвинение падает не на того", "Запись или фото становятся уликой",
      "Появляется тайный мотив", "Финальная версия собирает всё воедино"
    ],
    drama: [
      "Трудный разговор откладывают", "Герой возвращается в родной дом", "Старое фото вызывает воспоминание", "Кто-то просит прощения",
      "Семейный ужин становится напряжённым", "Герой делает непростой выбор", "Друг узнаёт правду", "Долгое молчание говорит больше слов",
      "Звучит важное обещание", "Неожиданная поддержка меняет настроение"
    ],
    romance: [
      "Герои случайно встречаются взглядами", "Признание прерывают", "Начинается неловкое свидание", "Кто-то ревнует",
      "Герои спорят из-за мелочи", "Появляется любовное письмо или сообщение", "Признание в любви откладывают", "Случается романтический жест",
      "Герои мирятся под музыку", "Кто-то признаётся в чувствах"
    ]
  };
  const centerMoment = "🍿 Можно отметить";
  let bingoCells = [];
  const currentBingoGenre = () => bingoGenreSelect?.value || "all";
  const getBingoMoments = () => momentsByGenre[currentBingoGenre()] || moments;
  const shuffle = items => {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  };

  const criticMovieInput = document.getElementById("criticMovieInput");
  const criticMovieOptions = document.getElementById("criticMovieOptions");
  const criticStoryScore = document.getElementById("criticStoryScore");
  const criticActingScore = document.getElementById("criticActingScore");
  const criticVisualScore = document.getElementById("criticVisualScore");
  const criticStrength = document.getElementById("criticStrength");
  const criticConcern = document.getElementById("criticConcern");
  const criticAudience = document.getElementById("criticAudience");
  const criticCompose = document.getElementById("criticCompose");
  const criticDraftOutput = document.getElementById("criticDraftOutput");
  const criticCopyDraft = document.getElementById("criticCopyDraft");
  const criticClearDraft = document.getElementById("criticClearDraft");
  const criticDraftStatus = document.getElementById("criticDraftStatus");
  const promptInput = document.getElementById("philipMoviePrompt");
  const findMovieButton = document.getElementById("findSimilarMovie");
  const matchResult = document.getElementById("philipMatchResult");
  if (criticMovieInput && criticMovieOptions && criticStoryScore && criticActingScore && criticVisualScore && criticStrength && criticConcern && criticAudience && criticCompose && criticDraftOutput && criticCopyDraft && criticClearDraft && criticDraftStatus) {
    const draftsStorageKey = "cineNavigatorCriticDrafts";
    const readDrafts = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(draftsStorageKey) || "{}");
        return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
      } catch (_) {
        return {};
      }
    };
    const drafts = readDrafts();
    let activeMovieId = null;
    const getSelectedMovie = () => moviesDatabase.find(movie => movie.title === criticMovieInput.value.trim()) || null;
    const persistDrafts = () => {
      try {
        localStorage.setItem(draftsStorageKey, JSON.stringify(drafts));
        criticDraftStatus.textContent = "Черновик сохранён в профиле.";
      } catch (_) {
        criticDraftStatus.textContent = "Не удалось сохранить черновик в браузере.";
      }
    };
    const saveCurrentDraft = () => {
      if (activeMovieId === null) return;
      drafts.currentMovieId = activeMovieId;
      drafts[activeMovieId] = {
        story: criticStoryScore.value,
        acting: criticActingScore.value,
        visuals: criticVisualScore.value,
        strength: criticStrength.value,
        concern: criticConcern.value,
        audience: criticAudience.value,
        draft: criticDraftOutput.value
      };
      persistDrafts();
    };
    const loadMovieDraft = movie => {
      activeMovieId = movie.id;
      criticMovieInput.value = movie.title;
      const saved = drafts[movie.id] || {};
      criticStoryScore.value = saved.story || "3";
      criticActingScore.value = saved.acting || "3";
      criticVisualScore.value = saved.visuals || "3";
      criticStrength.value = saved.strength || "";
      criticConcern.value = saved.concern || "";
      criticAudience.value = saved.audience || "";
      criticDraftOutput.value = saved.draft || "";
      criticDraftStatus.textContent = saved.draft ? "Сохранённый черновик открыт." : "Новый черновик сохранится в профиле.";
    };
    [...moviesDatabase].sort((first, second) => first.title.localeCompare(second.title, "ru")).forEach(movie => {
      const option = document.createElement("option");
      option.value = movie.title;
      criticMovieOptions.appendChild(option);
    });
    const savedMovie = moviesDatabase.find(movie => String(movie.id) === String(drafts.currentMovieId));
    if (savedMovie) loadMovieDraft(savedMovie);

    criticMovieInput.addEventListener("input", () => {
      const movie = getSelectedMovie();
      if (movie && movie.id !== activeMovieId) loadMovieDraft(movie);
    });
    [criticStoryScore, criticActingScore, criticVisualScore, criticStrength, criticConcern, criticAudience, criticDraftOutput].forEach(control => {
      control.addEventListener("input", saveCurrentDraft);
      control.addEventListener("change", saveCurrentDraft);
    });
    criticCompose.addEventListener("click", () => {
      const movie = getSelectedMovie();
      if (!movie) {
        criticDraftStatus.textContent = "Выберите фильм из списка каталога.";
        criticMovieInput.focus();
        return;
      }
      if (movie.id !== activeMovieId) loadMovieDraft(movie);

      const scores = [Number(criticStoryScore.value), Number(criticActingScore.value), Number(criticVisualScore.value)];
      const rating = (scores.reduce((sum, score) => sum + score, 0) / scores.length * 2).toFixed(1);
      const year = Number.parseInt(movie.year, 10);
      const title = `«${movie.title}»${Number.isInteger(year) && year >= 1888 ? ` (${year})` : ""}`;
      const lines = [`${title} — ${rating}/10. История: ${scores[0]}/5, актёрская игра: ${scores[1]}/5, визуальный стиль: ${scores[2]}/5.`];
      if (criticStrength.value.trim()) lines.push(`Особенно удалось: ${criticStrength.value.trim()}.`);
      if (criticConcern.value.trim()) lines.push(`Спорный момент: ${criticConcern.value.trim()}.`);
      if (criticAudience.value.trim()) lines.push(`Рекомендация: ${criticAudience.value.trim()}.`);
      criticDraftOutput.value = lines.join("\n\n");
      saveCurrentDraft();
    });
    criticCopyDraft.addEventListener("click", async () => {
      if (!criticDraftOutput.value.trim()) {
        criticDraftStatus.textContent = "Сначала соберите черновик рецензии.";
        return;
      }
      try {
        await navigator.clipboard.writeText(criticDraftOutput.value);
        criticDraftStatus.textContent = "Рецензия скопирована.";
      } catch (_) {
        criticDraftOutput.focus();
        criticDraftOutput.select();
        criticDraftStatus.textContent = document.execCommand("copy") ? "Рецензия скопирована." : "Выделите текст черновика и скопируйте его вручную.";
      }
    });
    criticClearDraft.addEventListener("click", () => {
      criticStoryScore.value = "3";
      criticActingScore.value = "3";
      criticVisualScore.value = "3";
      criticStrength.value = "";
      criticConcern.value = "";
      criticAudience.value = "";
      criticDraftOutput.value = "";
      if (activeMovieId !== null) {
        delete drafts[activeMovieId];
        drafts.currentMovieId = activeMovieId;
        persistDrafts();
      } else {
        criticDraftStatus.textContent = "Поля очищены.";
      }
    });

  }
  if (promptInput && findMovieButton && matchResult) {
    const reviews = {
      "Интерстеллар": "Космос здесь не декорация, а самый строгий начальник смены: не опоздаешь на минуту, а потеряешь годы. Нолан собирает научную фантастику, семейную драму и задачу по физике в один большой сеанс. Иногда фильм так увлекается масштабом, что хочется выдать ему пропуск на сверхурочную работу. Но финальный эмоциональный удар попадает точно в цель.",
      "Начало": "Ограбление сна, где каждый этаж сложнее предыдущего, а инструкция по технике безопасности занимает весь хронометраж. Монтаж работает как швейцарские часы, только часы эти летят в разные стороны. После просмотра хочется проверить, не идёт ли у тебя в коридоре замедленное время. Умный блокбастер, который не просит отключать голову, а выдаёт ей абонемент.",
      "Побег из Шоушенка": "Это кино не повышает голос, потому что ему не нужно. Оно терпеливо собирает историю из маленьких решений, дружбы и надежды, а потом оставляет зрителя с редким ощущением: хороший финал действительно заработан. Рецензентская оговорка: после просмотра обычная стена может вызвать подозрительное уважение к инженерному планированию.",
      "Крёстный отец": "Семейный ужин, на котором каждое молчание весит больше длинного монолога. Коппола снимает власть как наследство с очень дорогим обслуживанием: отказаться трудно, пользоваться опасно. Ни одного лишнего жеста, зато целый учебник по тому, как не превращать семейный чат в совет директоров. Классика, которая до сих пор держит зал без спецэффектов.",
      "Матрица": "Фильм, после которого зритель начинает подозрительно смотреть на обычный будильник. Экшен тут не для украшения: каждая сцена двигает идею о свободе выбора и цене пробуждения. Кожа конца девяностых, код в воздухе и философия, которая не забыла взять с собой зрелище. Красная таблетка необязательна, но пересмотреть хочется.",
      "Тёмный рыцарь": "Готэм выглядит так, будто городская смета ушла на дождь, бетон и моральные дилеммы, и это было правильное решение. Джокер ломает не только планы героев, но и привычную супергеройскую формулу. Напряжение растёт без кнопки «пауза», а центральный конфликт не помещается в простое «кто сильнее». Суровый киносеанс с отличной точностью попадания.",
      "Бойцовский клуб": "Сначала это кажется инструкцией по выходу из скучной жизни, потом выясняется, что мелкий шрифт договора никто не прочитал. Фильм ловко меняет тон и заставляет пересобрать увиденное, но его главный трюк не в повороте, а в вопросах о потреблении и самообмане. Рекомендация Филиппа: не принимать киногероев за карьерного консультанта.",
      "Назад в будущее": "Идеальная машина времени: ни одной лишней кнопки, каждая шутка возвращается в нужный момент, а сюжет разгоняется без пробуксовки. Это приключение знает, что зрителю нужны не лекции о временных парадоксах, а герои, за которых приятно переживать. Редкий случай, когда прошлое смотрится свежее половины сегодняшних новинок.",
      "Зелёная миля": "Тихая история о сострадании, которая не торгуется за эмоции и всё равно получает их с процентами. Том Хэнкс играет человека, которому приходится каждый день выбирать между правилами и совестью. Филипп предупреждает: запас салфеток лучше проверить до финальных титров. Фильм тяжёлый, но его человечность остаётся надолго.",
      "Остров проклятых": "Мрачный детектив с атмосферой, где даже коридоры явно что-то недоговаривают. Скорсезе ведёт расследование аккуратно, подбрасывая улики и сомнения в одинаково подозрительных упаковках. Пересмотр меняет не только ответ, но и смысл деталей. Совет кинокритика: не гуглить развязку, если хочешь сохранить удовольствие от поездки.",
      "Джентльмены": "Криминальный бизнес здесь напоминает шахматную партию, которую ведут люди, слишком уверенные в собственных правилах. Ричи нарезает сюжет быстро, диалоги подаются с сухой улыбкой, а каждый новый участник уверен, что именно он держит ситуацию. Стильный фильм для тех, кто любит, когда хаос хотя бы хорошо одет.",
      "Леон": "Необычная история двух одиночеств, снятая без попытки сделать мир удобнее, чем он есть. Контраст между молчаливым профессионализмом Леона и энергией Матильды держит фильм крепче любого экшен-монтажа. Красивые кадры не отменяют тяжёлых тем, а помогают внимательнее смотреть на героев. После титров хочется немного тишины."
    };
    const movieSearchHints = {
      "Интерстеллар": "отец папа дочь девочка семейная история любовь астронавт космос время гравитация планета спасение",
      "Марсианин": "астронавт марс выживание ботаник одиночество спасательная миссия экипаж",
      "Назад в будущее": "подросток машина времени прошлое родители путешествие будущее",
      "Зелёная миля": "тюрьма надзиратель заключенный дар исцеление чудо сострадание",
      "Побег из Шоушенка": "тюрьма заключенный побег дружба надежда банкир",
      "Начало": "сон сновидение подсознание ограбление идея команда время",
      "Матрица": "виртуальная реальность машины код выбор пробуждение симуляция",
      "Титаник": "корабль любовь девушка парень океан катастрофа путешествие",
      "Леон": "киллер девочка дружба одиночество защита наёмный убийца",
      "Бойцовский клуб": "бессонница драки подпольный клуб личность самообман потребление"
    };
    const stopWords = new Set([
        "а", "без", "бы", "был", "была", "были", "быть", "в", "во", "весь", "вернуться", "возвращаться", "для", "до", "его", "ее", "если", "же", "за", "и", "из", "или", "к", "как", "когда", "который", "летит", "летят", "лететь", "ли", "между", "мне", "много", "на", "над", "не", "но", "о", "об", "от", "по", "под", "после", "при", "про", "с", "со", "так", "то", "у", "уже", "хочет", "ищет", "пытается", "через", "что", "чтобы", "это", "этот", "эта", "there", "with", "from", "about", "the", "and", "for", "into", "that", "this", "movie", "film"
      ]);
      const conceptGroups = [
        ["space", ["космос", "космич", "галактик", "планет", "астронавт", "марс", "space", "planet", "astronaut", "galaxy"]],
        ["father", ["отц", "пап", "father", "dad"]],
        ["daughter", ["доч", "девоч", "daughter", "girl"]],
        ["son", ["сын", "son"]],
        ["family", ["семь", "семейн", "мам", "родител", "family"]],
        ["dream", ["сон", "сновид", "подсозн", "dream", "sleep"]],
        ["time", ["врем", "прошл", "будущ", "путешеств", "машин", "time", "past", "future", "travel"]],
        ["prison", ["тюрьм", "заключ", "побег", "камер", "prison", "escape", "jail"]],
        ["friendship", ["друж", "друг", "напарник", "friend", "buddy"]],
        ["mystery", ["детектив", "расслед", "загад", "тайн", "улиц", "сыщик", "mystery", "detective", "investigat"]],
        ["crime", ["кримин", "преступ", "мафи", "гангстер", "ограб", "вор", "crime", "gangster", "heist", "thief"]],
        ["hero", ["геро", "злод", "бэтмен", "супергер", "hero", "villain", "superhero"]],
        ["action", ["боевик", "погон", "драк", "экшен", "войн", "action", "chase", "fight", "war"]],
        ["comedy", ["комед", "смешн", "юмор", "весел", "comedy", "funny", "humor"]],
        ["romance", ["любов", "роман", "влюб", "love", "romance"]],
        ["survival", ["выжив", "выжить", "одинок", "ресурс", "еда", "растен", "survive", "survival", "stranded"]],
        ["rescue", ["спас", "эваку", "возвращ", "поиск", "rescue", "return", "save"]],
        ["disaster", ["катастроф", "крушен", "шторм", "буря", "авари", "кризис", "disaster", "crash", "storm"]],
        ["justice", ["справедлив", "суд", "приговор", "обвин", "правосуд", "justice", "trial", "verdict"]],
        ["identity", ["памят", "воспомин", "личност", "репликант", "memory", "identity", "clone"]],
        ["alien", ["иноплан", "чуж", "пришел", "alien", "extraterrestrial"]],
        ["technology", ["робот", "андроид", "искусствен", "технолог", "robot", "android", "technology"]],
        ["revenge", ["мест", "отомст", "revenge", "vengeance"]],
        ["sports", ["спорт", "спортсмен", "гонк", "соревн", "sports", "race", "racing"]],
        ["music", ["музык", "пев", "песн", "танц", "music", "singer", "dance"]],
        ["magic", ["маг", "волшеб", "заклин", "магическ", "magic", "wizard", "spell"]]
      ];
      const normalizeToken = token => {
        const normalized = token.toLocaleLowerCase("ru").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const concept = conceptGroups.find(([, prefixes]) => prefixes.some(prefix => normalized.startsWith(prefix)));
        if (concept) return concept[0];
        return normalized
          .replace(/(иями|ями|ами|ого|его|ому|ему|ыми|ими|ая|яя|ое|ее|ые|ие|ый|ий|ой|ых|их|ую|юю|ов|ев|ом|ем|ам|ям|ах|ях|ing|ed|es|s|а|я|ы|и|о|е|у|ю)$/i, "")
          .replace(/ё/g, "е");
      };
      const getTokens = text => [...new Set(
        String(text).match(/[a-zа-яё0-9]+/gi)?.map(rawToken => {
          const raw = rawToken.toLocaleLowerCase("ru").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ё/g, "е");
          return stopWords.has(raw) ? "" : normalizeToken(raw);
        }).filter(token => token.length > 2 && !stopWords.has(token)) || []
      )];

      const findSimilarMovie = () => {
        const queryLabels = new Map();
        String(promptInput.value).match(/[a-zа-яё0-9]+/gi)?.forEach(rawToken => {
          const raw = rawToken.toLocaleLowerCase("ru").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ё/g, "е");
          const token = stopWords.has(raw) ? "" : normalizeToken(raw);
          if (token.length > 2 && !stopWords.has(token) && !queryLabels.has(token)) queryLabels.set(token, rawToken.toLocaleLowerCase("ru"));
        });
        const queryTokens = [...queryLabels.keys()];
        if (!queryTokens.length) {
          matchResult.textContent = "Добавь пару деталей о сюжете, героях или настроении фильма.";
          matchResult.classList.add("has-result");
          return;
        }

        const database = typeof moviesDatabase === "undefined" ? [] : moviesDatabase;
        const conceptNames = new Set(conceptGroups.map(([name]) => name));
        const documents = database.map(movie => ({
          movie,
          titleTokens: new Set(getTokens(movie.title)),
          tokens: new Set(getTokens(`${movie.title} ${movie.genre} ${movie.desc || ""} ${movie.longDesc || movie.description || ""} ${reviews[movie.title] || ""} ${movieSearchHints[movie.title] || ""}`))
        }));
        const documentFrequency = new Map();
        documents.forEach(document => document.tokens.forEach(token => {
          documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
        }));

        const weights = new Map(queryTokens.map(token => [
          token,
          1 + Math.log((documents.length + 1) / ((documentFrequency.get(token) || 0) + 1))
        ]));
        const totalWeight = [...weights.values()].reduce((sum, weight) => sum + weight, 0);
        const ranked = documents.map(document => {
          const matched = queryTokens.filter(token => document.tokens.has(token));
          const titleMatches = matched.filter(token => document.titleTokens.has(token));
          const matchedWeight = matched.reduce((sum, token) => sum + weights.get(token), 0);
          const titleWeight = titleMatches.reduce((sum, token) => sum + weights.get(token), 0);
          const matchedConcepts = new Set(matched.filter(token => conceptNames.has(token)));
          const conceptBreadth = Math.min(.24, Math.max(0, matchedConcepts.size - 1) * .08);
          const score = totalWeight ? matchedWeight / totalWeight + titleWeight / totalWeight * .2 + conceptBreadth : 0;
          return { ...document, matched, score };
        }).filter(result => result.matched.length).sort((first, second) => second.score - first.score);

        const best = ranked[0];
        if (!best) {
          matchResult.textContent = "Не нашёл совпадений. Попробуй добавить жанр, героя или заметную деталь сюжета.";
          matchResult.classList.add("has-result");
          return;
        }

        const matchedWords = best.matched.slice(0, 5).map(token => queryLabels.get(token)).join(", ");
        matchResult.replaceChildren();
        const summary = document.createElement("span");
        summary.textContent = `Ближе всего: «${best.movie.title}». Совпали детали: ${matchedWords}.`;
        matchResult.appendChild(summary);
        const openButton = document.createElement("button");
        openButton.type = "button";
        openButton.className = "sort-btn philip-open-match";
        openButton.textContent = "Открыть в каталоге";
        openButton.addEventListener("click", () => {
          if (typeof window.switchSection === "function") window.switchSection("catalog");
          const search = document.getElementById("movieSearch");
          if (!search) return;
          search.value = best.movie.title;
          search.dispatchEvent(new Event("input", { bubbles: true }));
        });
        matchResult.appendChild(openButton);
        matchResult.classList.add("has-result");
      };

      findMovieButton.addEventListener("click", findSimilarMovie);
      promptInput.addEventListener("keydown", event => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") findSimilarMovie();
      });
  }

  const mindScanStart = document.getElementById("mindScanStart");
  const mindScanQuiz = document.getElementById("mindScanQuiz");
  const mindScanProgress = document.getElementById("mindScanProgress");
  const mindScanQuestion = document.getElementById("mindScanQuestion");
  const mindScanOptions = document.getElementById("mindScanOptions");
  const mindScanResult = document.getElementById("mindScanResult");
  if (mindScanStart && mindScanQuiz && mindScanProgress && mindScanQuestion && mindScanOptions && mindScanResult) {
    const questions = [
      {
        prompt: "Что сейчас за окном?",
        answers: [
          { label: "🌧 Дождь и тишина", type: "pilot" },
          { label: "☀️ Солнечный горизонт", type: "dreamer" },
          { label: "🌃 Неоновые огни", type: "adventurer" }
        ]
      },
      {
        prompt: "Какая кнопка на панели манит?",
        answers: [
          { label: "🛟 Красная кнопка: взять паузу", type: "pilot" },
          { label: "🚀 Гипердвигатель", type: "adventurer" },
          { label: "💌 Отправить письмо в ночь", type: "dreamer" }
        ]
      },
      {
        prompt: "Какой звук подходит этому вечеру?",
        answers: [
          { label: "🤫 Спокойная тишина", type: "pilot" },
          { label: "✈️ Рёв турбин перед взлётом", type: "adventurer" },
          { label: "🎹 Тихое фортепиано", type: "dreamer" }
        ]
      },
      {
        prompt: "Куда отправимся на время фильма?",
        answers: [
          { label: "🏡 Домой, где можно выдохнуть", type: "pilot" },
          { label: "🪐 На неизведанную планету", type: "adventurer" },
          { label: "🌙 В город под луной", type: "dreamer" }
        ]
      }
    ];
    const profiles = {
      pilot: {
        name: "Уставший пилот",
        note: "Похоже, сейчас важнее мягкая посадка, спокойный ритм и немного человеческого тепла.",
        genres: ["comedy", "drama", "romance"],
        titles: ["Амели", "1+1 (Неприкасаемые)", "Зелёная книга", "Рататуй", "Назад в будущее"]
      },
      adventurer: {
        name: "Кибер-авантюрист",
        note: "Тебе может подойти история с движением, загадкой и ощущением, что впереди ещё целая галактика.",
        genres: ["sci-fi", "action", "detective"],
        titles: ["Начало", "Марсианин", "Грань будущего", "Дюна", "Тёмный рыцарь"]
      },
      dreamer: {
        name: "Романтичный мечтатель",
        note: "Похоже, хочется красивой истории, сильных чувств или повода посмотреть на знакомый мир иначе.",
        genres: ["romance", "drama", "sci-fi"],
        titles: ["Ла-Ла Ленд", "Титаник", "Вечное сияние чистого разума", "Дневник памяти", "Интерстеллар"]
      }
    };
    const score = { pilot: 0, adventurer: 0, dreamer: 0 };
    let questionIndex = 0;

    const showQuestion = () => {
      const question = questions[questionIndex];
      mindScanProgress.textContent = `ВОПРОС ${questionIndex + 1} ИЗ ${questions.length}`;
      mindScanQuestion.textContent = question.prompt;
      mindScanOptions.replaceChildren();
      question.answers.forEach(answer => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "mind-scan-answer";
        button.textContent = answer.label;
        button.addEventListener("click", () => {
          score[answer.type]++;
          questionIndex++;
          if (questionIndex < questions.length) showQuestion();
          else finishMindScan();
        });
        mindScanOptions.appendChild(button);
      });
    };

    const finishMindScan = () => {
      const winner = Object.keys(score).sort((first, second) => score[second] - score[first])[0];
      const profile = profiles[winner];
      const normalize = text => String(text).toLocaleLowerCase("ru").replace(/ё/g, "е").replace(/[^\p{L}\p{N}]+/gu, "");
      const ranked = moviesDatabase.map(movie => {
        const titleIndex = profile.titles.findIndex(title => normalize(title) === normalize(movie.title));
        const genreIndex = profile.genres.indexOf(movie.genre);
        const rating = Number.parseFloat(movie.rating);
        return { movie, score: titleIndex >= 0 ? 100 - titleIndex : genreIndex >= 0 ? 10 - genreIndex + (Number.isFinite(rating) ? rating / 10 : 0) : -1 };
      }).filter(item => item.score >= 0).sort((first, second) => second.score - first.score);

      mindScanQuiz.hidden = true;
      mindScanResult.replaceChildren();
      const heading = document.createElement("h4");
      heading.textContent = profile.name;
      const description = document.createElement("p");
      description.textContent = profile.note;
      const list = document.createElement("ol");
      ranked.slice(0, 3).forEach(({ movie }) => {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "mind-scan-movie";
        button.textContent = `🎬 ${movie.title}${movie.rating && movie.rating !== "—" ? ` · ⭐ ${movie.rating}` : ""}`;
        button.addEventListener("click", () => window.openMovieDescription?.(movie.id));
        item.appendChild(button);
        list.appendChild(item);
      });
      const disclaimer = document.createElement("p");
      disclaimer.className = "mind-scan-disclaimer";
      disclaimer.textContent = "Это игровой кино-профиль, не психологическая оценка.";
      mindScanResult.append(heading, description, list, disclaimer);
      mindScanResult.hidden = false;
      mindScanStart.textContent = "↻ Пройти снова";
    };

    mindScanStart.addEventListener("click", () => {
      score.pilot = 0;
      score.adventurer = 0;
      score.dreamer = 0;
      questionIndex = 0;
      mindScanResult.hidden = true;
      mindScanQuiz.hidden = false;
      mindScanStart.textContent = "Заново начать скан";
      showQuestion();
    });
  }

  const saveBingo = () => {
    try { localStorage.setItem(bingoKey, JSON.stringify(bingoCells)); } catch (_) {}
    try { localStorage.setItem(bingoGenreKey, currentBingoGenre()); } catch (_) {}
  };
  const hasBingo = cells => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    return lines.some(line => line.every(index => cells[index]?.marked));
  };
  const renderBingo = () => {
    if (!bingoGrid) return;
    bingoGrid.replaceChildren();
    bingoCells.forEach((cell, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "movie-bingo-cell";
      button.textContent = cell.label;
      button.setAttribute("aria-pressed", String(cell.marked));
      button.disabled = index === 4;
      if (cell.marked) button.classList.add("is-marked");
      button.addEventListener("click", () => {
        cell.marked = !cell.marked;
        button.classList.toggle("is-marked", cell.marked);
        button.setAttribute("aria-pressed", String(cell.marked));
        const won = hasBingo(bingoCells);
        if (bingoStatus) {
          bingoStatus.textContent = won
            ? "🎉 Собран ряд из трёх отметок!"
            : `Отмечено: ${bingoCells.filter(item => item.marked).length} из 9.`;
          bingoStatus.classList.toggle("result-success", won);
        }
        saveBingo();
      });
      bingoGrid.appendChild(button);
    });
  };
  const makeBingo = () => {
    const shuffled = shuffle(getBingoMoments()).slice(0, 8);
    bingoCells = shuffled.slice(0, 4).map(label => ({ label, marked: false }));
    bingoCells.push({ label: centerMoment, marked: true });
    bingoCells.push(...shuffled.slice(4).map(label => ({ label, marked: false })));
    if (bingoStatus) {
      const genreName = bingoGenreSelect?.selectedOptions[0]?.textContent?.toLocaleLowerCase("ru");
      bingoStatus.textContent = genreName && currentBingoGenre() !== "all"
        ? `Карточка для жанра «${genreName}». Центральная клетка уже отмечена.`
        : "Карточка для любого жанра. Центральная клетка уже отмечена.";
      bingoStatus.classList.remove("result-success");
    }
    saveBingo();
    renderBingo();
  };
  if (bingoGrid && bingoNew && bingoStatus) {
    let savedGenre = "all";
    try { savedGenre = localStorage.getItem(bingoGenreKey) || "all"; } catch (_) {}
    if (bingoGenreSelect && [...bingoGenreSelect.options].some(option => option.value === savedGenre)) {
      bingoGenreSelect.value = savedGenre;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(bingoKey) || "null");
      if (Array.isArray(saved) && saved.length === 9 && saved[4]?.label === centerMoment) bingoCells = saved;
    } catch (_) {}
    if (bingoCells.length) {
      bingoStatus.textContent = hasBingo(bingoCells)
        ? "🎉 Собран ряд из трёх отметок!"
        : `Отмечено: ${bingoCells.filter(cell => cell.marked).length} из 9.`;
      if (hasBingo(bingoCells)) bingoStatus.classList.add("result-success");
      renderBingo();
    } else {
      makeBingo();
    }
    bingoNew.addEventListener("click", makeBingo);
    bingoGenreSelect?.addEventListener("change", makeBingo);
  }

  const durationSelect = document.getElementById("breakTimerMinutes");
  const timerDisplay = document.getElementById("breakTimerDisplay");
  const toggleButton = document.getElementById("breakTimerToggle");
  const resetButton = document.getElementById("breakTimerReset");
  if (!durationSelect || !timerDisplay || !toggleButton || !resetButton) return;

  let remaining = Number(durationSelect.value) * 60;
  let intervalId = 0;
  const formatTime = seconds => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const renderTimer = () => { timerDisplay.textContent = formatTime(remaining); };
  const stopTimer = () => {
    window.clearInterval(intervalId);
    intervalId = 0;
    toggleButton.textContent = "▶ Продолжить перерыв";
    toggleButton.setAttribute("aria-pressed", "false");
  };
  const resetTimer = () => {
    stopTimer();
    remaining = Number(durationSelect.value) * 60;
    timerDisplay.classList.remove("is-finished");
    renderTimer();
    timerDisplay.setAttribute("aria-label", `Осталось ${formatTime(remaining)}`);
  };
  durationSelect.addEventListener("change", resetTimer);
  toggleButton.addEventListener("click", () => {
    if (intervalId) {
      stopTimer();
      return;
    }
    if (remaining <= 0) resetTimer();
    timerDisplay.classList.remove("is-finished");
    toggleButton.textContent = "⏸ Пауза";
    toggleButton.setAttribute("aria-pressed", "true");
    intervalId = window.setInterval(() => {
      remaining = Math.max(0, remaining - 1);
      renderTimer();
      timerDisplay.setAttribute("aria-label", remaining ? `Осталось ${formatTime(remaining)}` : "Перерыв окончен");
      if (remaining === 0) {
        stopTimer();
        toggleButton.textContent = "↻ Начать снова";
        timerDisplay.classList.add("is-finished");
        timerDisplay.textContent = "Готово! 🎬";
      }
    }, 1000);
  });
  resetButton.addEventListener("click", resetTimer);
  renderTimer();
})();
