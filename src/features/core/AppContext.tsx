'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  clearScope,
  deletePhoto,
  deletePhotos,
  loadPhotos,
  metaDel,
  metaGet,
  metaSet,
  pruneScope,
} from './storage';
import {
  defaultLocation,
  defaultSettings,
  emptyStructuredReport,
  type AlertConfig,
  type AppSettings,
  type ConfirmConfig,
  type LoadingKind,
  type LoadingOverlayState,
  type LoadingStep,
  type ManualLocation,
  type MapModalState,
  type PhotoData,
  type StructuredReport,
} from './types';
import { getCategoryBySlug, MAX_PHOTOS, type CategoryDef, type FlowKind } from '@/lib/constants';
import { esc } from '@/lib/html';
import { preloadWatermarkLogo } from './watermark';
import { applyThemeToDOM, getStoredTheme, saveStoredTheme } from '@/lib/theme';

const SETTINGS_KEY = 'sipedas:v5:settings';
const SESSION_PREFIX = 'sipedas:v5:session:';
const DRAFT_PREFIX = 'sipedas:v5:draft:';
const TEXT_META_PREFIX = 'sipedas:v5:text:';

export interface AppContextValue {
  /* Kategori & alur */
  scope: string;
  category: CategoryDef;
  flow: FlowKind;

  /* Pengaturan perangkat */
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  toggleTheme: () => void;

  /* Data laporan terstruktur */
  report: StructuredReport;
  updateReport: (patch: Partial<StructuredReport>) => void;

  /* Lokasi manual (fallback watermark foto galeri) */
  location: ManualLocation;
  updateLocation: (patch: Partial<ManualLocation>) => void;
  coords: { lat: string; lng: string };
  updateCoords: (patch: Partial<{ lat: string; lng: string }>) => void;

  /* Data laporan pedestrian */
  reportText: string;
  setReportText: (text: string) => void;

  /* Foto */
  photos: PhotoData[];
  photoCount: number;
  addPhotos: (list: PhotoData[]) => void;
  patchPhoto: (id: string, patch: Partial<PhotoData>) => void;
  removePhoto: (id: string) => void;
  reorderPhotos: (from: number, to: number) => void;
  /** True bila masih ada foto yang diproses. */
  isProcessing: boolean;

  /* Draft server (khusus pedestrian) */
  activeDraftId: string | null;
  setActiveDraftId: (id: string | null) => void;

  /* UI */
  ready: boolean;
  online: boolean;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;

  alertConfig: AlertConfig | null;
  showAlert: (type: AlertConfig['type'], title: string, message: string) => void;
  closeAlert: () => void;

  confirmConfig: ConfirmConfig | null;
  showConfirm: (config: ConfirmConfig) => void;
  closeConfirm: () => void;

  viewerIdx: number | null;
  openViewer: (index: number) => void;
  closeViewer: () => void;
  navigateViewer: (direction: -1 | 1) => void;

  mapModal: MapModalState | null;
  openMapModal: (index: number) => void;
  closeMapModal: () => void;

  /** Modal pemilih koordinat (Leaflet) untuk laporan terstruktur. */
  mapPickerOpen: boolean;
  openMapPicker: () => void;
  closeMapPicker: () => void;

  loading: LoadingOverlayState;
  startLoading: (kind: LoadingKind, title: string, sub: string, steps: LoadingStep[]) => void;
  setProgress: (step: number, progress: number, sub?: string) => void;
  stopLoading: () => void;

  /* Aksi tingkat tinggi */
  resetReport: (options?: { silent?: boolean }) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function readSettings(): AppSettings {
  if (typeof window === 'undefined') return defaultSettings;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings, theme: getStoredTheme() };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      wmCam: parsed.wmCam ?? defaultSettings.wmCam,
      wmGal: parsed.wmGal ?? defaultSettings.wmGal,
      ocrGal: parsed.ocrGal ?? defaultSettings.ocrGal,
      minimap: parsed.minimap ?? defaultSettings.minimap,
      theme: getStoredTheme(),
    };
  } catch {
    return defaultSettings;
  }
}

const EMPTY_COORDS = { lat: '', lng: '' };

/** Isi sesi per kategori: form terstruktur + lokasi manual pedestrian. */
interface SessionSnapshot {
  report?: Partial<StructuredReport>;
  location?: Partial<ManualLocation>;
  coords?: Partial<{ lat: string; lng: string }>;
}

export function AppProvider({
  children,
  scope,
}: {
  children: ReactNode;
  scope: string;
}) {
  const category = useMemo(() => getCategoryBySlug(scope)!, [scope]);
  const flow = category.flow;

  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [report, setReport] = useState<StructuredReport>({
    ...emptyStructuredReport,
    kegiatan: category.name,
  });
  const [reportText, setReportTextState] = useState('');
  const [location, setLocation] = useState<ManualLocation>(defaultLocation);
  const [coords, setCoords] = useState<{ lat: string; lng: string }>(EMPTY_COORDS);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [activeDraftId, setActiveDraftIdState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);
  const [viewerIdx, setViewerIdx] = useState<number | null>(null);
  const [mapModal, setMapModal] = useState<MapModalState | null>(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [loading, setLoading] = useState<LoadingOverlayState>({
    show: false,
    kind: 'generic',
    title: '',
    sub: '',
    progress: 0,
    step: -1,
    steps: [],
  });

  const bootstrapped = useRef(false);
  const textSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photosRef = useRef<PhotoData[]>([]);
  photosRef.current = photos;

  /* ── Pemuatan awal (idempoten, aman untuk StrictMode) ─────────── */
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    setSettings(readSettings());
    preloadWatermarkLogo();
    setOnline(navigator.onLine);

    let cancelled = false;

    void (async () => {
      const sessionKey = SESSION_PREFIX + scope;
      const draftKey = DRAFT_PREFIX + scope;
      const textKey = TEXT_META_PREFIX + scope;

      try {
        const raw = sessionStorage.getItem(sessionKey);
        if (raw && !cancelled) {
          const parsed = JSON.parse(raw) as SessionSnapshot;
          if (flow === 'structured') {
            setReport(previous => ({ ...previous, ...parsed.report, kegiatan: category.name }));
          }
          setLocation(previous => ({ ...previous, ...parsed.location }));
          setCoords(previous => ({ ...previous, ...parsed.coords }));
          const draftId = sessionStorage.getItem(draftKey);
          if (draftId) setActiveDraftIdState(draftId);
        }
      } catch {
        /* abaikan session rusak */
      }

      if (flow === 'pedestrian') {
        const savedText = await metaGet<string>(textKey);
        if (savedText && !cancelled) setReportTextState(savedText);
      }

      const saved = await loadPhotos(scope, MAX_PHOTOS);
      if (!cancelled && saved.length) setPhotos(saved.slice(0, MAX_PHOTOS));
      void pruneScope(scope, MAX_PHOTOS + 2);
      if (!cancelled) setReady(true);
    })();

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      cancelled = true;
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [scope, flow, category.name]);

  /* ── Persistensi Tema & Tampilan ───────────────────────────────── */
  useEffect(() => {
    applyThemeToDOM(settings.theme);
  }, [settings.theme]);

  // Sinkronkan bila tema diubah dari komponen lain (misal di halaman menu kategori)
  useEffect(() => {
    const handleSync = () => {
      const stored = getStoredTheme();
      setSettings(previous => (previous.theme !== stored ? { ...previous, theme: stored } : previous));
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('themechange', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('themechange', handleSync);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* kuota penuh — abaikan */
    }
  }, [settings]);

  useEffect(() => {
    if (!ready || typeof window === 'undefined') return;
    const timer = setTimeout(() => {
      try {
        const snapshot: SessionSnapshot = { report, location, coords };
        sessionStorage.setItem(SESSION_PREFIX + scope, JSON.stringify(snapshot));
      } catch {
        /* abaikan */
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [ready, scope, report, location, coords]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings(previous => {
      const next = { ...previous, ...patch };
      if (patch.theme) {
        applyThemeToDOM(patch.theme);
        saveStoredTheme(patch.theme);
        window.dispatchEvent(new Event('themechange'));
      }
      return next;
    });
  }, []);

  const updateLocation = useCallback((patch: Partial<ManualLocation>) => {
    setLocation(previous => ({ ...previous, ...patch }));
  }, []);

  const updateCoords = useCallback((patch: Partial<{ lat: string; lng: string }>) => {
    setCoords(previous => ({ ...previous, ...patch }));
  }, []);

  const toggleTheme = useCallback(() => {
    setSettings(previous => {
      const nextTheme = previous.theme === 'dark' ? 'light' : 'dark';
      applyThemeToDOM(nextTheme);
      saveStoredTheme(nextTheme);
      window.dispatchEvent(new Event('themechange'));
      return { ...previous, theme: nextTheme };
    });
  }, []);

  const updateReport = useCallback((patch: Partial<StructuredReport>) => {
    setReport(previous => ({ ...previous, ...patch }));
  }, []);

  const setReportText = useCallback(
    (text: string) => {
      setReportTextState(text);
      const key = TEXT_META_PREFIX + scope;
      if (textSaveTimer.current) clearTimeout(textSaveTimer.current);
      textSaveTimer.current = setTimeout(() => {
        if (text.trim()) void metaSet(key, text);
        else void metaDel(key);
      }, 500);
    },
    [scope],
  );

  const setActiveDraftId = useCallback(
    (id: string | null) => {
      setActiveDraftIdState(id);
      try {
        const key = DRAFT_PREFIX + scope;
        if (id) sessionStorage.setItem(key, id);
        else sessionStorage.removeItem(key);
      } catch {
        /* abaikan */
      }
    },
    [scope],
  );

  /* ── Aksi foto ─────────────────────────────────────────────────── */
  const addPhotos = useCallback((list: PhotoData[]) => {
    setPhotos(previous => [...previous, ...list].map((photo, index) => ({ ...photo, order: index })));
  }, []);

  const patchPhoto = useCallback((id: string, patch: Partial<PhotoData>) => {
    setPhotos(previous => {
      const index = previous.findIndex(item => item.id === id);
      if (index === -1) return previous;
      const next = previous.slice();
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  const removePhoto = useCallback((id: string) => {
    setPhotos(previous => previous.filter(photo => photo.id !== id));
    void deletePhoto(id);
  }, []);

  const reorderPhotos = useCallback(
    (from: number, to: number) => {
      setPhotos(previous => {
        if (from === to || from < 0 || to < 0 || from >= previous.length || to >= previous.length) {
          return previous;
        }
        const next = previous.slice();
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next.map((photo, index) => ({ ...photo, order: index }));
      });
    },
    [],
  );

  /* ── Modal & overlay ───────────────────────────────────────────── */
  const showAlert = useCallback((type: AlertConfig['type'], title: string, message: string) => {
    setAlertConfig({ type, title, message });
  }, []);
  const closeAlert = useCallback(() => setAlertConfig(null), []);

  const showConfirm = useCallback((config: ConfirmConfig) => setConfirmConfig(config), []);
  const closeConfirm = useCallback(() => setConfirmConfig(null), []);

  const openViewer = useCallback((index: number) => setViewerIdx(index), []);
  const closeViewer = useCallback(() => setViewerIdx(null), []);
  const navigateViewer = useCallback((direction: -1 | 1) => {
    setViewerIdx(previous => {
      if (previous === null) return null;
      const next = previous + direction;
      if (next < 0 || next >= photosRef.current.length) return previous;
      if (photosRef.current[next]?.processing) return previous;
      return next;
    });
  }, []);

  const openMapModal = useCallback((index: number) => {
    const photo = photosRef.current[index];
    if (!photo?.exif?.gps) return;
    const { lat, lng } = photo.exif.gps;
    const address = photo.exifAddr?.full;
    const info = address
      ? `Foto ${index + 1} &middot; <b>${esc(address)}</b>`
      : `Foto ${index + 1} &middot; <b>Koordinat EXIF</b>`;
    setMapModal({ lat, lng, info });
  }, []);
  const closeMapModal = useCallback(() => setMapModal(null), []);

  const openMapPicker = useCallback(() => setMapPickerOpen(true), []);
  const closeMapPicker = useCallback(() => setMapPickerOpen(false), []);

  const startLoading = useCallback(
    (kind: LoadingKind, title: string, sub: string, steps: LoadingStep[]) => {
      setLoading({ show: true, kind, title, sub, progress: 0, step: steps.length ? 0 : -1, steps });
    },
    [],
  );
  const setProgress = useCallback((step: number, progress: number, sub?: string) => {
    setLoading(previous => ({
      ...previous,
      step,
      progress: Math.max(0, Math.min(100, progress)),
      sub: sub ?? previous.sub,
    }));
  }, []);
  const stopLoading = useCallback(() => {
    setLoading(previous => ({ ...previous, show: false }));
  }, []);

  /* ── Reset ─────────────────────────────────────────────────────── */
  const resetReport = useCallback(
    async (options?: { silent?: boolean }) => {
      const current = photosRef.current;
      await clearScope(scope);
      void deletePhotos(current.map(photo => photo.id));
      if (flow === 'pedestrian') void metaDel(TEXT_META_PREFIX + scope);

      try {
        sessionStorage.removeItem(SESSION_PREFIX + scope);
        sessionStorage.removeItem(DRAFT_PREFIX + scope);
      } catch {
        /* abaikan */
      }

      setPhotos([]);
      setReportTextState('');
      setActiveDraftIdState(null);
      setViewerIdx(null);
      setLocation(defaultLocation);
      setCoords(EMPTY_COORDS);
      if (flow === 'structured') {
        setReport({ ...emptyStructuredReport, kegiatan: category.name });
      }

      if (!options?.silent) {
        showAlert('success', 'Laporan Direset', 'Semua data laporan dan foto telah dikosongkan.');
      }
    },
    [scope, flow, category.name, showAlert],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      scope,
      category,
      flow,
      settings,
      updateSettings,
      toggleTheme,
      report,
      updateReport,
      location,
      updateLocation,
      coords,
      updateCoords,
      reportText,
      setReportText,
      photos,
      addPhotos,
      patchPhoto,
      removePhoto,
      reorderPhotos,
      photoCount: photos.length,
      isProcessing: photos.some(photo => photo.processing),
      activeDraftId,
      setActiveDraftId,
      ready,
      online,
      showSettings,
      setShowSettings,
      alertConfig,
      showAlert,
      closeAlert,
      confirmConfig,
      showConfirm,
      closeConfirm,
      viewerIdx,
      openViewer,
      closeViewer,
      navigateViewer,
      mapModal,
      openMapModal,
      closeMapModal,
      mapPickerOpen,
      openMapPicker,
      closeMapPicker,
      loading,
      startLoading,
      setProgress,
      stopLoading,
      resetReport,
    }),
    [
      scope, category, flow, settings, updateSettings, toggleTheme, report, updateReport,
      location, updateLocation, coords, updateCoords, reportText, setReportText,
      photos, addPhotos, patchPhoto, removePhoto, reorderPhotos,
      activeDraftId, setActiveDraftId, ready,
      online, showSettings, alertConfig, showAlert, closeAlert, confirmConfig, showConfirm,
      closeConfirm, viewerIdx, openViewer, closeViewer, navigateViewer, mapModal,
      openMapModal, closeMapModal, mapPickerOpen, openMapPicker, closeMapPicker,
      loading, startLoading, setProgress, stopLoading, resetReport,
    ],
  );

  useEffect(() => {
    return () => {
      if (textSaveTimer.current) clearTimeout(textSaveTimer.current);
    };
  }, []);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp harus dipakai di dalam <AppProvider>.');
  return context;
}

/** Alias kompatibilitas dengan penamaan lama. */
export const useAppContext = useApp;
