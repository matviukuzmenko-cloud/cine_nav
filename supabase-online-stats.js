(() => {
  const onlineNow = document.getElementById("siteOnlineNow");
  const onlineYesterday = document.getElementById("siteOnlineYesterday");
  const status = document.getElementById("siteOnlineStatus");
  const onlineCard = onlineNow?.closest(".live-stat");
  if (!onlineNow || !onlineYesterday || !status || !onlineCard) return;

  const config = window.PLIXAR_SUPABASE_CONFIG;
  const supabaseApi = window.supabase;
  if (!config?.url || !config?.anonKey) {
    status.textContent = "Подключите проект Supabase в supabase-online-stats-config.js, чтобы включить общий счётчик.";
    return;
  }
  if (!supabaseApi?.createClient) {
    status.textContent = "Не удалось загрузить библиотеку Supabase. Проверьте подключение к интернету.";
    return;
  }

  const getStoredId = (storage, key) => {
    let value = storage.getItem(key);
    if (!value) {
      if (!window.crypto?.randomUUID) throw new Error("Браузер не поддерживает безопасную генерацию идентификатора.");
      value = window.crypto.randomUUID();
      storage.setItem(key, value);
    }
    return value;
  };

  let visitorId;
  let tabId;
  try {
    visitorId = getStoredId(localStorage, "plixarOnlineVisitorId");
    tabId = getStoredId(sessionStorage, "plixarOnlineTabId");
  } catch (error) {
    status.textContent = `Счётчик не запущен: ${error.message}`;
    console.error("Не удалось подготовить идентификатор счётчика:", error);
    return;
  }

  let client;
  try {
    client = supabaseApi.createClient(config.url, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
  } catch (error) {
    status.textContent = "Проверьте URL и публичный ключ проекта в настройках Supabase.";
    console.error("Некорректная конфигурация Supabase:", error);
    return;
  }
  const channel = client.channel("plixar-site-online", {
    config: { presence: { key: tabId } }
  });
  let isTracking = false;

  const updateOnlineCount = () => {
    const visitors = new Set();
    Object.values(channel.presenceState()).flat().forEach(presence => {
      if (typeof presence.visitorId === "string") visitors.add(presence.visitorId);
    });
    if (isTracking && document.visibilityState === "visible") visitors.add(visitorId);
    onlineNow.textContent = String(visitors.size);
  };

  const updateYesterdayCount = async () => {
    const { data, error } = await client.rpc("record_site_visit", { p_visitor_id: visitorId });
    if (error) throw error;
    const count = Number(data);
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error("Сервер вернул некорректное число посетителей.");
    }
    onlineYesterday.textContent = String(count);
  };

  const trackTab = async () => {
    if (document.visibilityState !== "visible") return;
    const trackStatus = await channel.track({ visitorId });
    if (trackStatus !== "ok") {
      isTracking = false;
      updateOnlineCount();
      status.textContent = "Не удалось обновить список пользователей онлайн.";
      console.error("Ошибка обновления присутствия Supabase:", trackStatus);
      return;
    }
    isTracking = true;
    updateOnlineCount();
  };

  channel
    .on("presence", { event: "sync" }, updateOnlineCount)
    .on("presence", { event: "join" }, updateOnlineCount)
    .on("presence", { event: "leave" }, updateOnlineCount)
    .subscribe(async connectionStatus => {
      if (connectionStatus === "SUBSCRIBED") {
        onlineCard.classList.add("is-connected");
        status.textContent = "Счётчик подключён. Посетители определяются по анонимному идентификатору браузера.";
        await trackTab();
        updateOnlineCount();
        try {
          await updateYesterdayCount();
        } catch (error) {
          status.textContent = "Не удалось загрузить статистику за вчера. Проверьте настройку базы Supabase.";
          console.error("Ошибка загрузки дневной статистики Supabase:", error);
        }
      } else if (connectionStatus === "CHANNEL_ERROR" || connectionStatus === "TIMED_OUT") {
        isTracking = false;
        onlineCard.classList.remove("is-connected");
        onlineNow.textContent = "—";
        status.textContent = "Не удалось подключиться к счётчику Supabase.";
        console.error("Ошибка подключения канала присутствия Supabase:", connectionStatus);
      }
    });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      trackTab().catch(error => console.error("Не удалось обновить статус присутствия:", error));
    } else {
      isTracking = false;
      updateOnlineCount();
      channel.untrack().catch(error => console.error("Не удалось снять статус присутствия:", error));
    }
  });

  window.setInterval(() => {
    if (document.visibilityState === "visible") {
      trackTab().catch(error => console.error("Не удалось обновить статус присутствия:", error));
    }
  }, 30_000);
})();
