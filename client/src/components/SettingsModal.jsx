import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Radio,
  Copy,
  Check,
  Eye,
  EyeOff,
  Search,
  Server
} from 'lucide-react';
import { getServerUrl, setServerUrl, apiFetch } from '../utils/api';

export function SettingsModal({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  networkInfo
}) {
  const [formData, setFormData] = useState({
    rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2',
    streamKey: '',
    youtubeChannel: '',
    youtubeVideoId: '',
    resolution: '1280x720',
    fps: 30,
    videoBitrate: '3000k',
    audioBitrate: '128k',
    privacyText: 'STANDBY'
  });

  const [backendUrl, setBackendUrl] = useState(getServerUrl());
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [detectStatus, setDetectStatus] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData(prev => ({ ...prev, ...config }));
    }
  }, [config]);

  if (!isOpen) return null;

  const camUrl = networkInfo?.camUrlDev || (typeof window !== 'undefined' ? `${window.location.origin}/cam` : '');

  const handleCopyCamUrl = () => {
    if (!camUrl) return;
    navigator.clipboard.writeText(camUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDetectLive = async () => {
    if (!formData.youtubeChannel) {
      setDetectStatus('Masukkan handle YouTube terlebih dahulu');
      return;
    }
    setIsDetecting(true);
    setDetectStatus('Mencari siaran langsung...');
    try {
      const data = await apiFetch(`/api/youtube/auto-detect?channel=${encodeURIComponent(formData.youtubeChannel)}`);
      if (data.isLive && data.videoId) {
        setFormData(p => ({ ...p, youtubeVideoId: data.videoId }));
        setDetectStatus(`Siaran aktif ditemukan: ${data.videoId}`);
      } else {
        setDetectStatus('Tidak ada live stream yang sedang aktif di channel ini');
      }
    } catch (err) {
      setDetectStatus(`Gagal cek live: ${err.message}`);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setServerUrl(backendUrl);
    const payload = { ...formData };
    // Empty key field means "keep the stored key" (GET no longer returns it).
    // Type "test" for offline mock mode.
    if (!payload.streamKey || !payload.streamKey.trim()) {
      delete payload.streamKey;
    }
    delete payload.streamKeyMasked;
    onSaveConfig(payload);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0f0f0f] border border-[#272727] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#222222]">
          <span className="text-sm font-bold text-[#f1f1f1] uppercase tracking-wider">
            Pengaturan
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#aaaaaa] hover:text-[#f1f1f1] rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[75vh] text-xs">
          {/* Server Backend IP */}
          <div className="space-y-1.5 pb-3 border-b border-[#222222]">
            <div className="flex items-center justify-between">
              <label className="text-[#aaaaaa] font-medium flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-[#3ea6ff]" />
                <span>Alamat Server Komputer (Backend)</span>
              </label>
            </div>
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="http://192.168.100.11:5000"
              className="w-full bg-[#050505] border border-[#272727] rounded-lg px-3 py-2 text-[#f1f1f1] font-mono focus:outline-none focus:border-[#3ea6ff]"
            />
            <span className="text-[10px] text-[#717171] block">
              Alamat IP komputer laptop Anda yang menjalankan server `npm start`.
            </span>
          </div>

          {/* Phone Camera Pairing (QR) */}
          <div className="space-y-2 pb-3 border-b border-[#222222]">
            <label className="text-[#aaaaaa] font-medium block">
              Kamera HP Kedua (Scan QR)
            </label>
            {camUrl ? (
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-lg shrink-0">
                  <QRCodeSVG value={camUrl} size={96} />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-[10px] text-[#717171] font-mono break-all">
                    {camUrl}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyCamUrl}
                    className="px-3 py-1.5 bg-[#222222] hover:bg-[#333333] text-[#f1f1f1] rounded-lg font-medium flex items-center gap-1.5 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Disalin!' : 'Salin Tautan'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <span className="text-[10px] text-[#717171] block">
                Info jaringan belum tersedia. Pastikan backend aktif.
              </span>
            )}
            <span className="text-[10px] text-[#717171] block">
              HP dan laptop harus di Wi-Fi/hotspot yang sama. Buka di Chrome/Safari, tanpa install aplikasi.
            </span>
          </div>

          {/* YouTube Channel Handle (Auto-detect comments) */}
          <div className="space-y-1.5 pb-3 border-b border-[#222222]">
            <div className="flex items-center justify-between">
              <label className="text-[#aaaaaa] font-medium flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-[#cc0000]" />
                <span>Handle Channel YouTube (Otomatis Ambil Komen)</span>
              </label>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.youtubeChannel}
                onChange={(e) => setFormData(p => ({ ...p, youtubeChannel: e.target.value }))}
                placeholder="Contoh: @sansaks"
                className="flex-1 bg-[#050505] border border-[#272727] rounded-lg px-3 py-2 text-[#f1f1f1] font-mono focus:outline-none focus:border-[#cc0000]"
              />
              <button
                type="button"
                onClick={handleDetectLive}
                disabled={isDetecting}
                className="px-3 py-2 bg-[#222222] hover:bg-[#333333] text-[#f1f1f1] rounded-lg font-medium flex items-center gap-1.5 transition shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{isDetecting ? 'Mencari...' : 'Cek Live'}</span>
              </button>
            </div>
            {detectStatus && (
              <span className="text-[10px] text-[#3ea6ff] block font-mono">
                {detectStatus}
              </span>
            )}
            <span className="text-[10px] text-[#717171] block">
              Cukup masukkan handle channel sekali. Komentar live stream akan diambil otomatis tanpa input ID manual.
            </span>
          </div>

          {/* YouTube Stream Key */}
          <div className="space-y-1.5 pb-3 border-b border-[#222222]">
            <label className="text-[#aaaaaa] font-medium block">
              YouTube Stream Key (Kunci Streaming)
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={formData.streamKey}
                onChange={(e) => setFormData(p => ({ ...p, streamKey: e.target.value }))}
                placeholder={config?.streamKeyMasked ? `Tersimpan: ${config.streamKeyMasked} (kosongkan = tetap)` : 'xxxx-xxxx-xxxx-xxxx-xxxx'}
                className="w-full bg-[#050505] border border-[#272727] rounded-lg px-3 py-2 pr-9 text-[#f1f1f1] font-mono focus:outline-none focus:border-[#cc0000]"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#717171] hover:text-[#f1f1f1]"
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <span className="text-[10px] text-[#717171] block">
              Kosongkan untuk mempertahankan kunci tersimpan, atau isi "test" untuk uji coba lokal tanpa siaran sungguhan.
            </span>
          </div>

          {/* Resolusi & Bitrate */}
          <div className="grid grid-cols-2 gap-3 pb-3 border-b border-[#222222]">
            <div>
              <label className="text-[#aaaaaa] font-medium block mb-1">Resolusi</label>
              <select
                value={formData.resolution}
                onChange={(e) => setFormData(p => ({ ...p, resolution: e.target.value }))}
                className="w-full bg-[#050505] border border-[#272727] rounded-lg px-2.5 py-1.5 text-[#f1f1f1] focus:outline-none"
              >
                <option value="1280x720">720p HD</option>
                <option value="1920x1080">1080p FHD</option>
              </select>
            </div>
            <div>
              <label className="text-[#aaaaaa] font-medium block mb-1">Bitrate Video</label>
              <select
                value={formData.videoBitrate}
                onChange={(e) => setFormData(p => ({ ...p, videoBitrate: e.target.value }))}
                className="w-full bg-[#050505] border border-[#272727] rounded-lg px-2.5 py-1.5 text-[#f1f1f1] focus:outline-none"
              >
                <option value="2500k">2500 kbps (Hemat Kuota)</option>
                <option value="4000k">4000 kbps (Standar)</option>
                <option value="6000k">6000 kbps (Maksimal)</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#181818] hover:bg-[#252525] text-[#aaaaaa] rounded-lg text-xs transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#f1f1f1] hover:bg-white text-black rounded-lg text-xs font-bold transition"
            >
              {savedSuccess ? 'Tersimpan' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
