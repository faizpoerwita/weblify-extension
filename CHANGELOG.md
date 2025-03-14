# Changelog

## v1.0.1.38 (03-05-2025)
- Perubahan ikon profil AI Agent dari "F" menjadi "W" untuk konsistensi branding weblify.id
- Penyesuaian visual pada avatar agent untuk mencerminkan identitas merek saat ini
- Standarisasi representasi AI assistant dalam interface chat

## v1.0.1.37 (03-05-2025)
- Penyeragaman background UI chat dengan background utama di App.tsx
- Pembaruan animasi background pada container chat dengan efek rotate dan float
- Penambahan layer background dengan radial gradient yang identik dengan App.tsx
- Standardisasi efek visual animasi untuk konsistensi UI di seluruh aplikasi
- Penyempurnaan transisi dan animasi untuk pengalaman yang lebih mulus
- Optimasi opacity dan ukuran blob animasi untuk visual yang lebih fluid

## v1.0.1.36 (03-05-2025)
- Peningkatan UI/UX komponen RecommendedTasks dengan desain glassmorphic yang lebih dinamis
- Peningkatan tampilan card task dengan efek backdrop filter (blur dan saturate) yang lebih ekstrem
- Implementasi animasi hover dengan transformasi skala dan translasi yang lebih responsif
- Penambahan efek floating background dengan animasi yang berbeda per card
- Optimasi warna dan gradient text berdasarkan mode gelap/terang
- Peningkatan ukuran dan detail ikon serta kontainer ikon
- Implementasi efek hover dengan gradient text untuk peningkatan feedback visual

## v1.0.1.35 (03-05-2025)
- Peningkatan UI/UX SidePanel dengan implementasi desain glassmorphic
- Penambahan background gradient animasi dengan efek flow dan rotate
- Implementasi card design dengan efek frosted glass dan bayangan
- Penambahan ikon untuk setiap section (FaGlobe, FaBrain, FaRobot)
- Peningkatan visual heading dengan gradient text untuk branding
- Optimasi responsivitas dan animasi untuk pengalaman yang lebih fluid
- Standardisasi warna dengan penggunaan useColorModeValue untuk dark/light mode

## v1.0.1.34 (03-05-2025)
- Peningkatan intensitas warna biru muda pada gradient background di seluruh aplikasi
- Penyesuaian animasi gradient-flow menjadi lebih dinamis dengan 4 keyframes
- Peningkatan visibilitas dengan mengatur backgroundSize menjadi 300% dan timing 18 detik
- Optimasi kontras dan saturasi warna untuk mendapatkan nuansa biru muda yang lebih cerah
- Peningkatan opacity pada animasi blob untuk efek visual yang lebih menonjol

## v1.0.1.33 (03-05-2025)
- Implementasi background gradient biru muda yang seamless di seluruh aplikasi
- Peningkatan konsistensi UI dengan gradient yang sama di App.tsx dan TaskUI.tsx
- Optimasi animasi gradient dengan efek flow dan float yang lebih halus
- Standardisasi warna dan gradient melalui variabel bersama untuk semua komponen
- Penyempurnaan animasi blob untuk memberikan kesan dinamis namun elegan

## v1.0.1.32 (03-05-2025)
- Implementasi Portal untuk TaskProgressBar menggunakan Chakra UI Portal
- Peningkatan visibilitas dengan merender TaskProgressBar langsung ke root DOM
- Penambahan animasi masuk (appear) untuk meningkatkan kejelasan visualnya
- Perbaikan struktur render untuk memastikan TaskProgressBar selalu muncul di atas komponen lain
- Mengadopsi pola desain yang sama dengan Chakra UI Toast untuk konsistensi UI

## v1.0.1.31 (03-05-2025)
- Peningkatan visibilitas TaskProgressBar dengan z-index super tinggi (100000)
- Perbesaran ukuran TaskProgressBar dengan transform scale(1.05)
- Penambahan maxWidth 700px untuk tampilan yang lebih lebar dan menonjol
- Peningkatan bayangan dengan boxShadow yang lebih kuat dan melebar
- Penyesuaian background transparan untuk tampilan yang lebih clean

## v1.0.1.30 (03-05-2025)
- Modifikasi TaskProgressBar menjadi independen dari Chat UI dan selalu terlihat di layar
- Peningkatan posisi TaskProgressBar agar muncul sebagai notifikasi di layar
- Penyesuaian zIndex tinggi (9999) untuk memastikan TaskProgressBar selalu di atas komponen lain
- Optimasi responsivitas dengan width yang beradaptasi di berbagai ukuran layar
- Perbaikan posisi dan bayangan untuk memberikan tampilan yang lebih menonjol

## v1.0.1.29 (03-05-2025)
- Modifikasi TaskProgressBar agar posisinya fixed dan selalu terlihat saat scroll
- Peningkatan tampilan TaskProgressBar dengan efek frost glass yang lebih tebal
- Penambahan efek visual crystal glassmorphic untuk memberikan kesan premium
- Optimasi layout agar TaskProgressBar terlihat di tengah layar dan responsif
- Penyederhanaan struktur visual dengan mempertahankan estetika elegan

## v1.0.1.28 (03-05-2025)
- Peningkatan UI/UX seluruh ekstensi dengan implementasi desain glassmorphic modern
- Penambahan efek frosted glass konsisten dengan gradient biru di seluruh interface
- Peningkatan animasi dan transisi untuk pengalaman pengguna yang lebih fluid
- Optimasi tampilan pesan chat dengan desain bubble chat yang lebih modern
- Penyempurnaan tampilan input chat dengan efek glassmorphic dan highlight stylish
- Perubahan tampilan recommended tasks dengan card bergaya glassmorphic dan icon
- Peningkatan UI interaksi hover, focus, dan active untuk feedback visual yang lebih baik
- Implementasi background animasi dengan gradient bergerak untuk nuansa premium

## v1.0.1.27 (02-05-2025)
- Penghapusan tombol pause pada progress bar untuk meningkatkan kesederhanaan UI
- Penyederhanaan komponen TaskProgressBar dengan fokus pada fungsi stop
- Penyesuaian state management tanpa fitur pause/resume
- Optimasi penanganan running tasks tanpa interupsi sementara
- Penyederhanaan visual dengan mempertahankan styling dan UI/UX yang sudah ada 

## v1.0.1.16 (02-05-2025)
- Perbaikan implementasi inner glow murni tanpa outer glow
- Penggunaan teknik pseudo-element ::before dengan inset box-shadow
- Penerapan animasi pulse-inner-glow untuk efek berkedip secara dinamis
- Peningkatan intensitas dan ukuran glow untuk visibility yang lebih baik
- Penambahan gradient overlay dengan efek radial untuk fokus cahaya

## v1.0.1.15 (02-05-2025)
- Perbaikan implementasi inner glow dengan teknik box-shadow untuk efek visual yang lebih terlihat
- Penggunaan lapisan ganda dengan container glow dan content container
- Penambahan animasi pulse-glow untuk efek berkedip yang lebih dinamis
- Peningkatan kontras warna background dan opasitas untuk visibility yang lebih baik
- Penyesuaian ukuran dan intensitas glow untuk tampilan elegan

## v1.0.1.14 (02-05-2025)
- Perbaikan implementasi efek inner glow dengan animasi background gradient
- Penggunaan teknik pseudo-element _after untuk membuat efek glow di belakang card
- Penggantian animasi rotasi dengan animasi posisi background (slide gradient)
- Peningkatan efek blur dengan filter yang lebih lembut
- Penyesuaian warna background sesuai status running/paused/idle

## v1.0.1.13 (02-05-2025)
- Perbaikan implementasi efek gradient border yang berputar di sekitar progress bar
- Peningkatan efek visual dengan penggunaan WebkitMask dan mask composite
- Penambahan inner glow effect dengan gradient radial untuk memberikan kedalaman
- Optimasi kode CSS untuk kompatibilitas yang lebih baik dengan Chakra UI
- Perbaikan warna dan intensitas gradient untuk kontras visual yang lebih baik

## v1.0.1.12 (02-05-2025)
- Peningkatan UI dengan implementasi gradient inner glow yang lebih canggih
- Penerapan efek rotasi gradient conic dengan animasi 360 derajat
- Penggunaan teknik border-image dan filter blur untuk efek glow yang lebih elegan
- Perubahan warna gradient berdasarkan status task (running/paused/idle)

## v1.0.1.11 (02-05-2025)
- Penggantian visual loading bar dengan efek gradient glow dinamis di sekitar card
- Penggunaan animasi gradient flow untuk menandakan status tugas berjalan
- Penggunaan warna gradient yang berbeda untuk status running, paused, dan idle
- Penyesuaian UI card dengan shadow interior untuk tampilan yang lebih elegan

## v1.0.1.10 (02-05-2025)
- Perbaikan fungsionalitas tombol Stop pada progress bar
- Implementasi integrasi dengan fungsi interrupt task dari state manager
- Penambahan notifikasi toast saat task dihentikan

## v1.0.1.9 (02-05-2025)
- Perbaikan UI progress bar dengan desain elegan melalui gradien warna biru-ungu
- Penambahan indikator status dinamis yang menampilkan tindakan yang sedang dilakukan (navigate, click, dll)
- Perbaikan tombol kontrol dengan menambahkan pencegahan event bubbling dan tooltip
- Penyempurnaan animasi progress bar untuk memberikan visual yang lebih baik saat tugas berjalan
- Pengaturan ulang ukuran, warna, dan kontras untuk meningkatkan keterbacaan

## v1.0.1.8 (01-05-2025)
- Peningkatan UI progress bar dengan tampilan fixed floating
- Penambahan fitur auto-hide progress bar saat scrolling ke bawah
- Peningkatan keterbacaan teks tugas dengan ukuran font lebih besar
- Penambahan indikator status tugas (sedang diproses/dijeda)
- Perbaikan tombol kontrol dengan tampilan lebih modern dan responsif

## v1.0.1.7 (01-05-2025)
- Peningkatan tampilan UI progress bar menyerupai card berwarna biru muda
- Penambahan efek animasi pulsing pada indikator status tugas berjalan
- Pembaruan desain tombol pause dan stop untuk UX yang lebih baik
- Penambahan tombol close (X) pada progress bar

## v1.0.1.6 (01-05-2025)
- Pembaruan halaman Popup dengan judul "🌐 weblify.id"
- Penambahan tagline "From Browsing to Automation" di halaman Popup
- Penyesuaian tampilan UI untuk halaman Popup

## v1.0.1.5 (01-05-2025)
- Penyederhanaan logo menjadi hanya emoji globe (🌐) tanpa teks tambahan

## v1.0.1.4 (01-05-2025)
- Perubahan logo menjadi emoji globe (🌐)
- Perubahan tagline menjadi "From Browsing to Automation"
- Pembaruan deskripsi di package.json

## v1.0.1.3 (01-05-2025)
- Perbaikan nama aplikasi di manifest.js dan package.json
- Pembaruan konfigurasi manifest untuk memastikan nama dan deskripsi benar di chrome://extensions/

## v1.0.1.2 (01-05-2025)
- Perubahan branding dari "Fuji" menjadi "weblify.id" di seluruh ekstensi
- Pembaruan teks dan referensi interface untuk mencerminkan identitas brand baru

## v1.0.1.1 (01-05-2025)
- Implementasi API Key default (AIzaSyCtGDhlUfVKCIFBY1scaXfDQD0aHH7PeJc) agar pengguna tidak perlu memasukkan API Key saat pertama kali menginstall
- Konfigurasi popup default di manifest.json agar pengguna langsung diarahkan ke halaman Popup.tsx
- Modifikasi SidePanel.tsx untuk menangani kasus dimana API Key tidak tersedia dengan mengisi otomatis 

## v1.0.1.17 (02-05-2025)
- Menambahkan efek inner glow yang lebih dinamis dan sleek pada progress bar
- Mengimplementasikan animasi morph-glow dengan multi-layer efek
- Menambahkan efek shimmer dan plasma untuk tampilan yang lebih modern
- Meningkatkan responsivitas animasi dengan cubic-bezier timing functions
- Menambahkan animasi appear dan disappear untuk card container 

## v1.0.1.18 (02-05-2025)
- Perbaikan implementasi inner glow agar lebih jelas terlihat
- Menggunakan teknik box-shadow inset langsung dengan nilai yang lebih tinggi
- Menambahkan animasi pulse-glow dengan perubahan intensitas box-shadow
- Meningkatkan opacity pada efek shimmer dan radial overlay
- Menyederhanakan struktur lapisan untuk performa dan kejelasan visual 

## v1.0.1.19 (02-05-2025)
- Pengubahan desain progress bar menjadi glass material modern
- Perubahan warna inner glow menjadi putih dengan intensitas yang lebih halus
- Penambahan efek backdrop-filter blur untuk efek glass morphism
- Penyesuaian gradient background dengan efek transparan
- Optimasi animasi highlight dan shimmer untuk tampilan yang lebih elegan 

## v1.0.1.20 (02-05-2025)
- Peningkatan efek glass material pada progress bar dengan gradient yang lebih kaya
- Penambahan multi-layer gradient dan radial highlight untuk efek dimensional
- Peningkatan blur dari 10px menjadi 15px untuk efek glass yang lebih nyata
- Implementasi border gradient yang beranimasi untuk sentuhan premium
- Penggunaan enhanced shimmer effect dengan variasi opacity dan blur
- Optimasi animasi transisi dengan filter blur 

## v1.0.1.21 (02-05-2025)
- Implementasi teknik neo-morphism pada glass effect untuk kesan tiga dimensi
- Penambahan surface texture untuk efek glass yang lebih realistis
- Peningkatan efek pencahayaan dengan dynamic light reflection yang bergerak
- Penggunaan frosted glass effect dengan backdrop-filter blur(20px) dan saturate(110%)
- Penambahan animasi natural shimmer dengan gerakan diagonal untuk kesan high-end
- Optimasi visual dengan multi-layer gradient dan radial highlight 

## v1.0.1.22 (02-05-2025)
- Peningkatan efek frosted glass dengan backdrop-filter blur(40px) dari sebelumnya 20px
- Penambahan saturasi pada backdrop-filter menjadi 120% untuk kompensasi blur yang lebih kuat
- Penurunan opasitas pada gradient background untuk efek transparansi yang lebih tinggi
- Peningkatan filter blur pada radial gradient dari 10px menjadi 15px
- Optimasi inner glow dengan intensitas yang lebih rendah dan spread yang lebih luas
- Penambahan subtle background tint untuk mendukung efek frosted glass 

## v1.0.1.23 (02-05-2025)
- Peningkatan efek frosted glass menjadi sangat ekstrem dengan backdrop-filter blur(60px) dari sebelumnya 40px
- Peningkatan saturasi pada backdrop-filter menjadi 140% dan contrast 90% untuk efek lebih frosted
- Penggunaan multi-layer frosting dengan lapisan tambahan dengan blur(15px)
- Penurunan drastis opasitas pada gradient background menjadi 0.05-0.2 
- Penambahan filter pada noise texture dengan blur(1px) dan contrast(120%)
- Penambahan efek brightness dan contrast pada lapisan frosted teratas 

## v1.0.1.24 (02-05-2025)
- Implementasi frosted glass ultra ekstrem dengan backdrop-filter blur(75px) dari sebelumnya 60px
- Peningkatan saturasi ke 160% dan pengaturan contrast dan brightness untuk efek es yang autentik
- Penambahan crystalline texture layer dengan efek noise pattern yang lebih nyata
- Penambahan prism effect dengan border gradient animasi untuk kesan spektrum cahaya
- Implementasi crystal highlights dengan titik-titik cahaya yang berkilau secara alami
- Penambahan animasi crystal-shimmer untuk kesan kristal es yang bergerak
- Penurunan opasitas gradient background hingga 0.04-0.14 untuk transparansi ekstrem 

## v1.0.1.25 (02-05-2025)
- Peningkatan gradient pada background utama card dengan variasi warna yang lebih kaya
- Penambahan backdrop-filter blur(30px) langsung pada background card untuk efek frosted yang merata
- Implementasi lapisan gradient radial dengan warna lebih terlihat (opacity 0.25-0.3)
- Penambahan frosted overlay dengan linear gradient dan border subtle
- Implementasi animasi frost-pulse untuk efek frosted yang bergerak dan berubah intensitas
- Penggunaan boxShadow untuk kedalaman visual yang lebih dramatis
- Optimasi animasi dengan keyframes yang lebih halus dan alami 

## v1.0.1.26 (02-05-2025)
- Perbaikan fungsi tombol pause pada progress bar
- Implementasi state manager untuk mendukung pause/resume task
- Penambahan transitioning state pada eksekusi task untuk pause/resume
- Integrasi UI dengan state manager untuk sinkronisasi status task
- Implementasi penyimpanan context eksekusi saat pause untuk lanjutkan saat resume
- Peningkatan visual feedback saat task di-pause
- Optimasi loop eksekusi untuk mendukung pause/resume tanpa kehilangan state 