(() => {
  const STYLE_URLS = {
    light: "https://tiles.openfreemap.org/styles/positron",
    dark: "https://tiles.openfreemap.org/styles/dark"
  };
  const DEFAULT_CENTER = [100.646, 13.666];
  let libraryPromise;

  function loadLibrary() {
    if (!libraryPromise) {
      libraryPromise = import("./assets/vendor/maplibre-gl-6.1.0.mjs");
    }
    return libraryPromise;
  }

  function resolvedTheme(theme) {
    if (theme === "dark") return "dark";
    if (theme === "light") return "light";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function numericLocation(location) {
    const lat = Number(location?.lat);
    const lng = Number(location?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng)
      ? { ...location, lat, lng }
      : null;
  }

  function markerCode(location) {
    return location.id === "P00" ? "P" : String(location.id || "").replace(/^C/, "");
  }

  function create(options) {
    const container = options.container;
    const locations = (options.locations || []).map(numericLocation).filter(Boolean);
    const state = {
      map: null,
      maplibre: null,
      markers: new Map(),
      theme: options.theme || "system",
      selectedId: options.selectedId || locations[0]?.id || null,
      is3D: false,
      removed: false,
      ready: false,
      loadTimer: null,
      currentStyleUrl: null,
      inFlightStyleUrl: null,
      pendingStyleUrl: null
    };

    const styleUrl = () => STYLE_URLS[resolvedTheme(state.theme)];
    const locationById = (id) => locations.find((location) => location.id === id) || null;

    function emitStatus(status, detail = "") {
      options.onStatus?.(status, detail);
    }

    function armLoadTimer() {
      window.clearTimeout(state.loadTimer);
      state.loadTimer = window.setTimeout(() => {
        if (!state.ready) fail(new Error("แผนที่ใช้เวลาโหลดนานกว่าปกติ"));
      }, 15000);
    }

    function setSelected(id) {
      state.selectedId = id;
      state.markers.forEach((entry, markerId) => {
        const selected = markerId === id;
        entry.element.classList.toggle("is-selected", selected);
        entry.element.setAttribute("aria-pressed", String(selected));
        entry.element.style.zIndex = selected ? "5" : "2";
      });
    }

    function boundsForLocations() {
      if (!state.maplibre || !locations.length) return null;
      const bounds = new state.maplibre.LngLatBounds();
      locations.forEach((location) => bounds.extend([location.lng, location.lat]));
      return bounds;
    }

    function fitAll({ animate = true } = {}) {
      if (!state.map || !state.ready) return;
      const bounds = boundsForLocations();
      if (!bounds || bounds.isEmpty()) return;
      state.is3D = false;
      options.onModeChange?.(false);
      state.map.fitBounds(bounds, {
        padding: { top: 58, right: 54, bottom: 54, left: 54 },
        maxZoom: 12.25,
        duration: animate && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 700 : 0,
        pitch: 0,
        bearing: 0
      });
    }

    function focus(id, { close = false } = {}) {
      setSelected(id);
      const location = locationById(id);
      if (!state.map || !state.ready || !location) return;
      const currentZoom = Number(state.map.getZoom?.() || 0);
      const targetZoom = close ? Math.max(currentZoom, 15.4) : Math.max(currentZoom, 13.7);
      state.map.easeTo({
        center: [location.lng, location.lat],
        zoom: Math.min(targetZoom, 17),
        pitch: state.is3D ? 48 : 0,
        bearing: state.is3D ? -18 : 0,
        duration: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : 650
      });
    }

    function set3D(active) {
      state.is3D = Boolean(active);
      options.onModeChange?.(state.is3D);
      if (!state.map || !state.ready) return;
      if (state.is3D) {
        focus(state.selectedId || locations[0]?.id, { close: true });
      } else {
        state.map.easeTo({
          pitch: 0,
          bearing: 0,
          duration: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : 500
        });
      }
    }

    function setTheme(theme) {
      state.theme = theme || "system";
      if (!state.map) return;
      const targetStyleUrl = styleUrl();
      if (!state.ready) {
        state.pendingStyleUrl = targetStyleUrl;
        emitStatus("loading", "กำลังปรับสีแผนที่ให้ตรงกับหน้าเว็บ");
        return;
      }
      if (state.currentStyleUrl === targetStyleUrl) return;
      requestStyle(targetStyleUrl);
    }

    function requestStyle(targetStyleUrl) {
      state.ready = false;
      state.inFlightStyleUrl = targetStyleUrl;
      emitStatus("loading", "กำลังปรับสีแผนที่ให้ตรงกับหน้าเว็บ");
      armLoadTimer();
      try {
        state.map.setStyle(targetStyleUrl);
      } catch (error) {
        fail(error);
      }
    }

    function addMarkers() {
      locations.forEach((location) => {
        const element = document.createElement("button");
        element.type = "button";
        element.className = `competitor-map-marker${location.id === "P00" ? " parc" : ""}`;
        element.dataset.mapLocation = location.id;
        element.setAttribute("aria-label", `เลือก ${location.name} บนแผนที่`);
        element.setAttribute("aria-pressed", "false");
        const dot = document.createElement("span");
        dot.className = "competitor-map-marker-dot";
        dot.textContent = markerCode(location);
        const label = document.createElement("span");
        label.className = "competitor-map-marker-label";
        label.textContent = location.shortName || location.name;
        element.append(dot, label);
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          setSelected(location.id);
          options.onSelect?.(location.id);
        });
        const marker = new state.maplibre.Marker({ element, anchor: "center" })
          .setLngLat([location.lng, location.lat])
          .addTo(state.map);
        state.markers.set(location.id, { marker, element });
      });
      setSelected(state.selectedId);
    }

    function fail(error) {
      if (state.removed) return;
      window.clearTimeout(state.loadTimer);
      emitStatus("error", error?.message || "โหลดแผนที่จริงไม่สำเร็จ");
    }

    async function initialize() {
      if (!container || !locations.length) {
        fail(new Error("ไม่มีพิกัดที่ยืนยันแล้วสำหรับแผนที่"));
        return;
      }
      emitStatus("loading", "กำลังโหลดแผนที่จริงและวางหมุดตามพิกัด");
      armLoadTimer();
      try {
        state.maplibre = await loadLibrary();
        if (state.removed) return;
        const initialStyleUrl = styleUrl();
        state.inFlightStyleUrl = initialStyleUrl;
        state.map = new state.maplibre.Map({
          container,
          style: initialStyleUrl,
          center: DEFAULT_CENTER,
          zoom: 11,
          attributionControl: { compact: true },
          cooperativeGestures: true,
          localIdeographFontFamily: '"IBM Plex Sans Thai Looped", Tahoma, sans-serif',
          canvasContextAttributes: { antialias: true }
        });
        state.map.setMissingStyleImageResolver((id) => {
          if (id !== "wood-pattern" || state.map.hasImage(id)) return;
          const rgba = resolvedTheme(state.theme) === "dark"
            ? [32, 43, 39, 255]
            : [232, 229, 221, 255];
          state.map.addImage(id, {
            width: 1,
            height: 1,
            data: new Uint8Array(rgba)
          });
        });
        state.map.addControl(new state.maplibre.NavigationControl({ visualizePitch: true }), "top-right");
        state.map.on("style.load", () => {
          if (state.removed) return;
          state.currentStyleUrl = state.inFlightStyleUrl;
          state.ready = true;
          window.clearTimeout(state.loadTimer);
          if (state.pendingStyleUrl && state.pendingStyleUrl !== state.currentStyleUrl) {
            const pendingStyleUrl = state.pendingStyleUrl;
            state.pendingStyleUrl = null;
            requestStyle(pendingStyleUrl);
            return;
          }
          state.pendingStyleUrl = null;
          if (!state.markers.size) addMarkers();
          emitStatus("ready", "แผนที่จริงพร้อมใช้งาน");
          if (!state.is3D && !state.map.__parcInitialFitDone) {
            state.map.__parcInitialFitDone = true;
            fitAll({ animate: false });
          }
        });
        state.map.on("error", (event) => {
          if (!state.ready) fail(event?.error || new Error("โหลดข้อมูลแผนที่ไม่สำเร็จ"));
        });
      } catch (error) {
        fail(error);
      }
    }

    const controller = {
      setSelected,
      focus,
      fitAll,
      set3D,
      setTheme,
      is3D: () => state.is3D,
      remove() {
        state.removed = true;
        window.clearTimeout(state.loadTimer);
        state.markers.forEach(({ marker }) => marker.remove());
        state.markers.clear();
        state.map?.remove();
        state.map = null;
      }
    };

    initialize();
    return controller;
  }

  window.PARC_MAP_ENGINE = {
    create,
    resolvedTheme,
    styleUrls: { ...STYLE_URLS },
    libraryVersion: "6.1.0"
  };
})();
