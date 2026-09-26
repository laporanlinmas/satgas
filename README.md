# SIPEDAS

**Sistem Pelaporan Digital Satgas Linmas** — Ponorogo, Jawa Timur.

Aplikasi pelaporan lapangan untuk petugas Satgas Linmas. Enam kategori laporan
dengan dua alur kerja berbeda dalam satu basis kode:

| Kategori | Alur | Form | Tujuan |
| --- | --- | --- | --- |
| **Pedestrian** | `pedestrian` | Tempel teks laporan | Foto → **Google Drive**, data → **Spreadsheet** |
| **Poskamling** | `structured` | Form terstruktur | Foto → **Cloudinary**, data → **Firebase** |
| **Posyandu** | `structured` | Form terstruktur | Foto → **Cloudinary**, data → **Firebase** |
| **Kebencanaan** | `structured` | Form terstruktur | Foto → **Cloudinary**, data → **Firebase** |
| **Pelayanan Masyarakat** | `structured` | Form terstruktur | Foto → **Cloudinary**, data → **Firebase** |
| **Lainnya** | `structured` | Form terstruktur | Foto → **Cloudinary**, data → **Firebase** |

Tampilan, komponen, dan modul inti (konteks, penyimpanan, foto, watermark, modal)
satu untuk semua kategori. Yang berbeda hanya isi formulir dan backend tujuan.

---

## Menjalankan

```bash
npm install
npm run dev      # pengembangan (http://localhost:3000)
npm run build    # build produksi
npm start        # jalankan hasil build
npm run typecheck
npm run lint
```

Butuh Node.js 18.17+ (Next.js 14).

## Variabel lingkungan

Salin `.env.example` menjadi `.env` lalu isi. Nilai yang tidak ada akan menonaktifkan
fitur terkait dan terlihat di **Pengaturan → Info Sistem → Status server**.

| Variabel | Kegunaan | Wajib |
| --- | --- | --- |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Penyimpanan foto kategori terstruktur | Ya (5 kategori) |
| `FIREBASE_SERVICE_ACCOUNT` | JSON service account Firestore | Ya (5 kategori) |
| `GOOGLE_SHEET_ID` | Spreadsheet tujuan laporan pedestrian | Ya (pedestrian) |
| `FOLDER_UTAMA_ID` | Folder Drive induk (berkas & subfolder per bulan/tanggal) | Ya (pedestrian) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` | OAuth2 untuk Drive + Sheets | Sangat disarankan |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Cadangan bila OAuth2 tidak tersedia | Alternatif |
| `APPS_SCRIPT_URL` | Web App Apps Script (opsional, lebih cepat) | Tidak |
| `DEVELOPER_EMAIL` | Email yang diberi akses writer folder Drive | Tidak |
| `NEXT_PUBLIC_CCTV_URL` | Situs CCTV untuk `/cctv` | Tidak |

> Service account **tidak** punya kuota penyimpanan Drive. Untuk slider file yang
> aktif, pakai OAuth2 refresh token.

## Skema penyimpanan

### Google Sheets — sheet `INPUT`

| A | B | C | D | E | F | G | H | I | J | K | L | M–V |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Timestamp | No. SPT | Lokasi | Hari | Tanggal | Identitas | Personil | Danru | Nama Danru | Ket | Link folder | Jml foto | Link foto 1–10 |

Sheet `Detail Foto` mencatat satu baris per foto (sumber, GPS, alamat, tautan Drive).

### Google Drive

```
FOLDER_UTAMA_ID/
└── <Nama Bulan> <Tahun>/
    └── <Tanggal> <Nama Bulan> <Tahun>/
        ├── [KAMERA]_26 September 2026_Suyatno_1.jpg
        └── [GALERI]_26 September 2026_Suyatno_2.jpg
```

Folder dibuat otomatis, dibagikan publik (reader), dan diberi akses writer ke
`DEVELOPER_EMAIL` agar bisa dipakai Apps Script.

### Firebase Firestore

| Koleksi | Isi |
| --- | --- |
| `laporan` | Satu dokumen per laporan kategori terstruktur |
| `draft-laporan` | Draft pedestrian (dihapus setelah dimuat atau dikirim) |

Dokumen `laporan` memakai `requestId` dari klien sebagai ID, sehingga pengiriman
ulangi tidak membuat duplikat.

---

## Endpoint

| Rute | Metode | Fungsi |
| --- | --- | --- |
| `/api/reports` | POST | Simpan laporan kategori terstruktur |
| `/api/sign` | GET | Tanda tangan unggah Cloudinary + status konfigurasi |
| `/api/upload` | POST | Cadangan unggah multipart ke Cloudinary |
| `/api/pedestrian` | POST | Aksi pedestrian (`uploadFoto`, `submitLaporan`, `ping`) |
| `/api/drafts` | GET/POST | Daftar draft, create, append, load, delete |
| `/api/health` | GET | Diagnostik konfigurasi server |
| `/api/proxy` | POST | Alias lama → `/api/pedestrian` |

Foto kategori terstruktur **diunggah langsung dari peramban** ke Cloudinary
(tanda tangan dibuat server), sehingga tidak melewati batas 4,5 MB fungsi
server. Bila penandatanganan tidak tersedia, otomatis beralih ke `/api/upload`.

---

## Struktur

```
src/
├── app/                    # Rute App Router + API Route Handler
│   ├── [category]/         # 5 kategori terstruktur (SSG)
│   ├── pedestrian/         # Alur tempel teks
│   ├── cctv/               # Penampil CCTV
│   └── api/                # reports, sign, upload, pedestrian, drafts, health
├── components/             # Komponen yang dipakai semua kategori
│   └── ui/                 # DatePicker, SearchableSelect
├── features/
│   ├── core/               # AppContext, storage, watermark, exif, geocoding, upload
│   ├── structured/         # Form + submit kategori terstruktur
│   └── pedestrian/         # Form, draft, OCR, submit pedestrian
├── lib/
│   ├── constants.ts        # Kategori, batas, identitas aplikasi
│   ├── pedestrianParser.ts # Parser laporan (dipakai client & server)
│   └── server/             # Firebase, Cloudinary, Google Drive/Sheets
└── styles/globals.css      # Design system
```

## Fitur foto

- **Kamera** — baca EXIF (GPS + waktu), cari nama jalan via OpenStreetMap, tempel
  watermark berisi nama, waktu, alamat, koordinat, dan QR ke Google Maps.
- **Galeri** — kompresi ke ≤ 400 KB, watermark opsional, deteksi koordinat lewat
  OCR (Tesseract, dimuat hanya saat diaktifkan).
- Orientasi EXIF dihormati, kompresi adaptif biner, dan kurus batasan 10 foto.
- Foto diproses satu per satu agar label progres akurat dan antrean tidak
  membekukan antarmuka.

## Penyimpanan lokal

IndexedDB `sipedas` (v3) dengan pemisahan per kategori, sehingga foto dari satu
kategori tidak pernah muncul di kategori lain. Database lama `sipedas_cam_v1`
dibuang otomatis. Teks pedestrian disimpan terpisah per sesi.

## Pengaturan aplikasi

Tersimpan di `localStorage` (`sipedas:v5:settings`): tema, watermark kamera,
watermark galeri, OCR galeri, dan peta lokasi. Panel Pengaturan juga menyediakan
lokasi manual (khusus pedestrian), panduan per kategori, dan pemeriksaan koneksi
server.

## Catatan rilis

**v5.0.0** — satu codebase. Codebase sebelumnya punya dua pohon duplikat
(`src/` dan `src/pedestrian/`) dengan dua design system yang saling menimpa.
Perubahan utama:

- Penyimpanan lokal dipisah per kategori (sebelumnya foto antar kategori bercampur).
- Unggah Cloudinary langsung dari peramban, bukan melalui body server.
- Parser laporan dipakai bersama client dan server.
- Nama berkas Drive dan baris spreadsheet dibangun lewat fungsi murni.
- Satu design system; `/cctv` dan alur Drive/Sheets tetap milik pedestrian.
