# IRL Stream Master — Livestream Superapp Monitor

Aplikasi superapp pemantau dan pengendali livestream IRL (In-Real-Life) kustom berbasis web. Dirancang khusus untuk streamer bergerak di lapangan dengan kontrol multi-perangkat via jaringan lokal/hotspot HP.

---

## Fitur Utama

1. **Preview Video & Remote Phone Camera (WebRTC):**
   - Mendukung input kamera nirkabel dari HP kedua melalui WebRTC latensi ultra-rendah (<200ms).
   - Dilengkapi **QR Code Pairing** di dashboard: HP kamera cukup scan QR Code tanpa perlu download aplikasi (buka di browser Chrome/Safari di URL `/cam`).
   - Kontrol kamera HP: Flip kamera depan/belakang, toggle senter (torch), dan monitor persentase baterai HP.
   - Pilihan opsi beralih ke Webcam/Capture card laptop/PC secara instan.

2. **Kontrol Broadcast (Mulai / Akhiri Stream):**
   - Tombol **GO LIVE / AKHIRI STREAM** terintegrasi dengan proteksi konfirmasi.
   - Pipeline encoding backend **FFmpeg** langsung melakukan RTMP push ke YouTube Live (`rtmp://a.rtmp.youtube.com/live2`).
   - Monitor telemetri siaran real-time: Durasi Live (Uptime clock), Bitrate RTMP (kbps), dan Framerate (FPS).
   - Opsi mode **Test/Mock** untuk menguji siaran tanpa harus live publik ke YouTube.

3. **Panel YouTube Live Realtime:**
   - Panel YouTube Live Chat dengan badge (Moderator, Member, Saweran/Superchat, Streamer).
   - Counter penonton aktif (*Live Viewers*) dan jumlah *Likes*.
   - **TTS (Text-to-Speech) Chat Reader Earphone:** Membaca chat penonton secara otomatis ke earphone/TWS streamer dalam bahasa Indonesia sehingga streamer tidak perlu menunduk menatap layar saat berjalan.
   - Input kirim chat langsung dari dashboard.
   - Tombol **Simulasi Chat Realtime** untuk menguji tampilan chat dan fungsi TTS saat offline.

4. **Audio Gain Mixer Dinamis:**
   - Slider Level Gain kustom (0% s.d. 250% / +6dB boost) berbasis Web Audio API.
   - **Stereo VU Meter 60FPS** real-time dengan peringatan Clipping merah.
   - **Dynamic Limiter / Compressor Anti-Pecah:** Mencegah suara audio pecah/merusak telinga penonton saat ada suara bising mendadak (misal: klakson kendaraan atau teriakan di jalan).
   - Tombol cepat **Mute Mic**.

5. **Fitur Darurat & IRL Streamer Toolkit:**
   - **Privacy / BRB Shield:** Tombol darurat 1-klik untuk menutup tampilan layar dengan banner *"BRB / Sinyal Gangguan"* dan otomatis melakukan mute mikrofon saat berada di area privasi/ATM/transaksi.
   - **Soundboard Cepat:** Efek suara no-copyright instan (Air Horn, Saweran Ding, Tepuk Tangan, Notifikasi, Zonk) yang disintesis langsung via Web Audio.

---

## Cara Menjalankan

### 1. Menjalankan Aplikasi (Mode Standar / Siap Pakai)
Buka terminal PowerShell di folder proyek dan jalankan:
```bash
npm start
```
Server akan aktif di:
- **Dashboard Utama (Laptop/PC/HP Pengendali):** `http://localhost:5000` atau `http://<IP-Lokal>:5000`
- **HP Pengirim Kamera:** `http://<IP-Lokal>:5000/cam`

*(Catatan: HP dan Laptop/PC harus terhubung ke Wi-Fi atau Hotspot yang sama)*

### 2. Mode Pengembangan (Development)
Jika ingin mengubah kode frontend/backend secara live:
- Terminal 1 (Backend):
  ```bash
  npm run server:dev
  ```
- Terminal 2 (Frontend Vite):
  ```bash
  npm run client:dev
  ```

---

## Menghubungkan ke YouTube Live

1. Buka YouTube Studio (`studio.youtube.com`) -> **Buat** -> **Live Streaming**.
2. Salin **Kunci Streaming (Stream Key)** YouTube Anda.
3. Buka Dashboard Superapp, klik tombol **Koneksi HP & Settings** di pojok kanan atas.
4. Tempelkan Stream Key ke kolom **YouTube Stream Key**, lalu klik **Simpan Pengaturan**.
5. Klik tombol besar **MULAI LIVE STREAM** di dashboard untuk siaran langsung!
