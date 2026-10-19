(() => {
  const downloadButton = document.getElementById("profileBackupDownload");
  const uploadButton = document.getElementById("profileBackupUpload");
  const fileInput = document.getElementById("profileBackupFile");
  const status = document.getElementById("profileBackupStatus");
  if (!downloadButton || !uploadButton || !fileInput || !status) return;

  const profileName = () => localStorage.getItem("cineNavigatorNickname")?.trim() || "guest";
  const profilePrefix = () => `cineNavigatorProfile:${encodeURIComponent(profileName().toLocaleLowerCase("ru"))}:`;
  const isSupportedKey = key => key !== "cineNavigatorNickname" &&
    (/^cineNavigator[A-Z]/.test(key) || /^cineNavigatorMovieNote:\d+$/.test(key));
  const getProfileEntries = () => {
    const prefix = profilePrefix();
    const entries = {};
    for (let index = 0; index < localStorage.length; index++) {
      const storedKey = localStorage.key(index);
      if (!storedKey?.startsWith(prefix)) continue;
      const key = storedKey.slice(prefix.length);
      if (!isSupportedKey(key)) continue;
      const value = localStorage.getItem(key);
      if (value !== null) entries[key] = value;
    }
    return entries;
  };
  const removeProfileEntries = () => {
    const prefix = profilePrefix();
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const storedKey = localStorage.key(index);
      if (!storedKey?.startsWith(prefix)) continue;
      const key = storedKey.slice(prefix.length);
      if (isSupportedKey(key)) localStorage.removeItem(key);
    }
  };
  const setStatus = (message, isError = false) => {
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  };

  downloadButton.addEventListener("click", () => {
    const entries = getProfileEntries();
    const backup = {
      app: "CINE-NAVIGATOR",
      version: 1,
      createdAt: new Date().toISOString(),
      profile: profileName(),
      entries
    };
    const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `cine-navigator-${profileName().replace(/[^\p{L}\p{N}-]+/gu, "-")}-backup.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    setStatus(`Бэкап создан. Сохранено записей: ${Object.keys(entries).length}.`);
  });

  uploadButton.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setStatus("Файл бэкапа больше 5 МБ.", true);
      return;
    }

    let backup;
    try {
      backup = JSON.parse(await file.text());
    } catch {
      setStatus("Не удалось прочитать JSON-файл.", true);
      return;
    }
    if (backup?.app !== "CINE-NAVIGATOR" || backup.version !== 1 || !backup.entries || typeof backup.entries !== "object" || Array.isArray(backup.entries)) {
      setStatus("Формат бэкапа не распознан.", true);
      return;
    }

    const entries = Object.entries(backup.entries);
    if (entries.length > 1000 || entries.some(([key, value]) => !isSupportedKey(key) || typeof value !== "string" || value.length > 100000) || new Blob([JSON.stringify(backup.entries)]).size > 5 * 1024 * 1024) {
      setStatus("В бэкапе есть неподдерживаемые или слишком большие записи.", true);
      return;
    }
    if (!window.confirm(`Заменить данные профиля «${profileName()}» данными из бэкапа?`)) return;

    const previousEntries = getProfileEntries();
    try {
      removeProfileEntries();
      entries.forEach(([key, value]) => localStorage.setItem(key, value));
      setStatus("Бэкап восстановлен. Перезагружаю профиль…");
      window.setTimeout(() => window.location.reload(), 350);
    } catch {
      try {
        removeProfileEntries();
        Object.entries(previousEntries).forEach(([key, value]) => localStorage.setItem(key, value));
      } catch (_) {}
      setStatus("Не удалось восстановить бэкап. Прежние данные профиля сохранены.", true);
    }
  });
})();