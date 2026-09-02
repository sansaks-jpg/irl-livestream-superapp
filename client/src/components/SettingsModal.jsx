import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  X, 
  Settings, 
  Key, 
  Radio, 
  Smartphone, 
  Copy, 
  Check, 
  Tv, 
  Sliders, 
  Eye, 
  EyeOff, 
  Save,
  HelpCircle
} from 'lucide-react';

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
    youtubeVideoId: '',
    resolution: '1280x720',
    fps: 30,
    videoBitrate: '3000k',
    audioBitrate: '128k',
    privacyText: 'BRB - SINYAL GANGGUAN / SEGERA KEMBALI',
    obsEnabled: false,
    obsUrl: 'ws://localhost:4455',
    obsPassword: ''
  });

  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData(prev => ({ ...prev, ...config }));
    }
  }, [config]);

  if (!isOpen) return null;

  const camUrl = networkInfo?.camUrlDev || (typeof window !== 'undefined' ? `${window.location.origin}/cam` : '');

  const handleCopyCamUrl = () => {
    navigator.clipboard.writeText(camUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveConfig(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Pengaturan Superapp IRL</h2>
              <p className="text-xs text-slate-400">Konfigurasi YouTube Live, Remote Cam HP, dan Broadcast</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Section: Remote HP Camera Pairing */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row gap-4 items-center">
            <div className="bg-white p-2.5 rounded-xl shadow-md shrink-0">
              <QRCodeSVG value={camUrl} size={118} />
            </div>
            <div className="space-y-2 flex-1 text-left">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
                <Smartphone className="w-4 h-4" />
                <span>Hubungkan HP Kamera (Phone Cam)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Scan QR Code ini menggunakan HP kamera Anda atau buka alamat di bawah pada browser HP (Chrome/Safari) untuk streaming video & audio nirkabel latensi sangat rendah:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={camUrl}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyCamUrl}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section: YouTube RTMP & Stream Key */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs uppercase tracking-wider">
              <Radio className="w-4 h-4" />
              <span>Target Broadcast YouTube Live</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  RTMP Server URL
                </label>
                <input
                  type="text"
                  value={formData.rtmpUrl}
                  onChange={(e) => setFormData(p => ({ ...p, rtmpUrl: e.target.value }))}
                  placeholder="rtmp://a.rtmp.youtube.com/live2"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    YouTube Stream Key
                  </label>
                  <span className="text-[10px] text-slate-500">
                    *Kosongkan atau isi "test" untuk uji coba offline tanpa live sungguhan
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={formData.streamKey}
                    onChange={(e) => setFormData(p => ({ ...p, streamKey: e.target.value }))}
                    placeholder="xxxx-xxxx-xxxx-xxxx-xxxx"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 pr-10 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  YouTube Live Video ID / URL (Untuk Live Chat Realtime)
                </label>
                <input
                  type="text"
                  value={formData.youtubeVideoId}
                  onChange={(e) => setFormData(p => ({ ...p, youtubeVideoId: e.target.value }))}
                  placeholder="Contoh: dQw4w9WgXcQ atau https://www.youtube.com/watch?v=..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section: Stream Quality & Bitrate */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
              <Sliders className="w-4 h-4" />
              <span>Resolusi & Bitrate Encoding FFmpeg</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Preset Resolusi</label>
                <select
                  value={formData.resolution}
                  onChange={(e) => setFormData(p => ({ ...p, resolution: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="1280x720">720p HD (16:9)</option>
                  <option value="1920x1080">1080p FHD (16:9)</option>
                  <option value="720x1280">720x1280 Portrait (Shorts/TikTok)</option>
                  <option value="1080x1920">1080x1920 Portrait FHD</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Framerate (FPS)</label>
                <select
                  value={formData.fps}
                  onChange={(e) => setFormData(p => ({ ...p, fps: parseInt(e.target.value, 10) }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="30">30 FPS (Hemat Kuota IRL)</option>
                  <option value="60">60 FPS (Super Smooth)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Video Bitrate</label>
                <select
                  value={formData.videoBitrate}
                  onChange={(e) => setFormData(p => ({ ...p, videoBitrate: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="2000k">2000 kbps (Sinyal Lemah)</option>
                  <option value="3000k">3000 kbps (Standar 720p)</option>
                  <option value="4500k">4500 kbps (Bagus 1080p)</option>
                  <option value="6000k">6000 kbps (Ultra 60FPS)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Text Privacy Shield */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Teks Layar Darurat BRB / Sinyal Gangguan
            </label>
            <input
              type="text"
              value={formData.privacyText}
              onChange={(e) => setFormData(p => ({ ...p, privacyText: e.target.value }))}
              placeholder="BRB - SINYAL GANGGUAN / SEGERA KEMBALI"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-indigo-900/30"
            >
              <Save className="w-4 h-4" />
              <span>{savedSuccess ? 'Tersimpan!' : 'Simpan Pengaturan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
