# TaskUI Component

Komponen TaskUI adalah komponen utama untuk antarmuka tugas di weblify.id extension. Komponen ini telah direfaktor untuk meningkatkan maintainability dan reusability.

## Struktur Folder

```
src/common/components/TaskUI/
├── constants/
│   ├── actionConstants.ts    # Konstanta dan tipe data untuk aksi
│   └── chatTypes.ts          # Interface untuk komponen chat
├── components/
│   ├── ChatMessage.tsx       # Komponen untuk menampilkan pesan chat
│   ├── JsonViewer.tsx        # Komponen untuk menampilkan data JSON
│   ├── MessageContent.tsx    # Komponen untuk menampilkan konten pesan
│   ├── StatusIndicator.tsx   # Komponen untuk menampilkan status aksi
│   └── TaskProgressBar.tsx   # Komponen untuk menampilkan progress bar
├── utils/
│   ├── statusHelpers.ts      # Fungsi utilitas untuk status
│   └── urlHelpers.ts         # Fungsi utilitas untuk URL
├── TaskUI.tsx                # Komponen utama
├── index.tsx                 # File indeks untuk ekspor
└── README.md                 # Dokumentasi
```

## Komponen

### TaskUI

Komponen utama yang menampilkan antarmuka tugas. Komponen ini mengelola state dan logika untuk menampilkan riwayat tugas, input pengguna, dan status tugas.

### ChatMessage

Komponen untuk menampilkan pesan chat, baik dari pengguna maupun asisten. Komponen ini menampilkan avatar, konten pesan, dan status aksi.

### MessageContent

Komponen untuk menampilkan konten pesan dengan format khusus. Komponen ini dapat menampilkan teks biasa, kode, dan data JSON.

### StatusIndicator

Komponen untuk menampilkan status aksi. Komponen ini menampilkan ikon dan teks status yang sesuai dengan aksi yang sedang dilakukan.

### TaskProgressBar

Komponen untuk menampilkan progress bar saat tugas sedang berjalan. Komponen ini menampilkan deskripsi tugas dan tombol untuk menghentikan tugas.

### JsonViewer

Komponen untuk menampilkan data JSON dengan format yang menarik dan dapat di-expand/collapse.

## Utilitas

### statusHelpers

Fungsi utilitas untuk mengelola status aksi, seperti mendapatkan warna status.

### urlHelpers

Fungsi utilitas untuk memproses URL, seperti mendapatkan domain, path, dan favicon.

## Penggunaan

```tsx
import TaskUI from './common/components/TaskUI';

const App = () => {
  return (
    <div>
      <TaskUI />
    </div>
  );
};
``` 