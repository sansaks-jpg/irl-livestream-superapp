import { useState, useEffect, useRef, useCallback } from 'react';

export function useAudioProcessor(inputStream) {
  const [gainValue, setGainValue] = useState(1.0); // 0.0 - 2.0
  const [isMuted, setIsMuted] = useState(false);
  const [limiterEnabled, setLimiterEnabled] = useState(true);
  const [vuLevel, setVuLevel] = useState(0); // 0 - 100
  const [isClipping, setIsClipping] = useState(false);

  // 3-Band Studio EQ states (-12dB to +12dB)
  const [bass, setBass] = useState(0); // 150Hz
  const [mid, setMid] = useState(0);   // 1200Hz
  const [treble, setTreble] = useState(0); // 6000Hz

  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const gainNodeRef = useRef(null);
  const lowFilterRef = useRef(null);
  const midFilterRef = useRef(null);
  const highFilterRef = useRef(null);
  const compressorNodeRef = useRef(null);
  const analyserNodeRef = useRef(null);
  const destinationNodeRef = useRef(null);
  const animFrameRef = useRef(null);

  // Initialize Web Audio graph
  useEffect(() => {
    if (!inputStream || inputStream.getAudioTracks().length === 0) {
      setVuLevel(0);
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(inputStream);
      sourceNodeRef.current = source;

      // 1. Gain Node
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(gainValue, ctx.currentTime);
      gainNodeRef.current = gainNode;

      // 2. 3-Band EQ Filters
      const lowFilter = ctx.createBiquadFilter();
      lowFilter.type = 'lowshelf';
      lowFilter.frequency.setValueAtTime(150, ctx.currentTime);
      lowFilter.gain.setValueAtTime(bass, ctx.currentTime);
      lowFilterRef.current = lowFilter;

      const midFilter = ctx.createBiquadFilter();
      midFilter.type = 'peaking';
      midFilter.frequency.setValueAtTime(1200, ctx.currentTime);
      midFilter.Q.setValueAtTime(1.0, ctx.currentTime);
      midFilter.gain.setValueAtTime(mid, ctx.currentTime);
      midFilterRef.current = midFilter;

      const highFilter = ctx.createBiquadFilter();
      highFilter.type = 'highshelf';
      highFilter.frequency.setValueAtTime(6000, ctx.currentTime);
      highFilter.gain.setValueAtTime(treble, ctx.currentTime);
      highFilterRef.current = highFilter;

      // 3. DynamicsCompressor acts as studio limiter
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-6, ctx.currentTime);
      compressor.knee.setValueAtTime(10, ctx.currentTime);
      compressor.ratio.setValueAtTime(12, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.25, ctx.currentTime);
      compressorNodeRef.current = compressor;

      // 4. Analyser
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      analyserNodeRef.current = analyser;

      // 5. Destination for MediaRecorder stream
      const destination = ctx.createMediaStreamDestination();
      destinationNodeRef.current = destination;

      // Chain audio graph:
      // source -> gain -> lowFilter -> midFilter -> highFilter -> (compressor) -> analyser -> destination
      source.connect(gainNode);
      gainNode.connect(lowFilter);
      lowFilter.connect(midFilter);
      midFilter.connect(highFilter);

      if (limiterEnabled) {
        highFilter.connect(compressor);
        compressor.connect(analyser);
      } else {
        highFilter.connect(analyser);
      }
      analyser.connect(destination);

      // VU meter meter loop
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        if (!analyserNodeRef.current) return;
        analyserNodeRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((average / 128) * 100));

        setVuLevel(normalized);
        setIsClipping(normalized > 92);

        animFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();

      return () => {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
        }
        try {
          ctx.close();
        } catch (e) {
          // ignore
        }
      };
    } catch (err) {
      console.error('[AudioProcessor] Init error:', err);
    }
  }, [inputStream]);

  // Handle Gain change
  const setGain = useCallback((val) => {
    setGainValue(val);
    if (gainNodeRef.current && audioContextRef.current) {
      const target = isMuted ? 0 : val;
      gainNodeRef.current.gain.setTargetAtTime(target, audioContextRef.current.currentTime, 0.05);
    }
  }, [isMuted]);

  // Handle EQ changes
  const updateBass = useCallback((val) => {
    setBass(val);
    if (lowFilterRef.current && audioContextRef.current) {
      lowFilterRef.current.gain.setTargetAtTime(val, audioContextRef.current.currentTime, 0.05);
    }
  }, []);

  const updateMid = useCallback((val) => {
    setMid(val);
    if (midFilterRef.current && audioContextRef.current) {
      midFilterRef.current.gain.setTargetAtTime(val, audioContextRef.current.currentTime, 0.05);
    }
  }, []);

  const updateTreble = useCallback((val) => {
    setTreble(val);
    if (highFilterRef.current && audioContextRef.current) {
      highFilterRef.current.gain.setTargetAtTime(val, audioContextRef.current.currentTime, 0.05);
    }
  }, []);

  // Handle Mute toggle
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      if (gainNodeRef.current && audioContextRef.current) {
        const target = next ? 0 : gainValue;
        gainNodeRef.current.gain.setTargetAtTime(target, audioContextRef.current.currentTime, 0.05);
      }
      return next;
    });
  }, [gainValue]);

  // Handle Limiter toggle
  const toggleLimiter = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      setLimiterEnabled(prev => !prev);
      return;
    }
    setLimiterEnabled(prev => {
      const next = !prev;
      if (highFilterRef.current && analyserNodeRef.current && compressorNodeRef.current) {
        try {
          highFilterRef.current.disconnect();
          if (next) {
            highFilterRef.current.connect(compressorNodeRef.current);
            compressorNodeRef.current.connect(analyserNodeRef.current);
          } else {
            compressorNodeRef.current.disconnect();
            highFilterRef.current.connect(analyserNodeRef.current);
          }
        } catch (err) {
          console.warn('[AudioProcessor] Limiter reconnect error:', err);
        }
      }
      return next;
    });
  }, []);

  // Play soundboard effect through live stream destination AND local speaker.
  // Fetches remote URLs to a blob first: a cross-origin <audio> element routed
  // through createMediaElementSource without CORS headers outputs silence.
  const playSoundToStream = useCallback(async (audioUrl) => {
    const playLocalOnly = (url) => {
      const fallbackAudio = new Audio(url);
      fallbackAudio.play().catch(() => {});
    };
    try {
      const ctx = audioContextRef.current;
      if (!ctx || ctx.state === 'closed') {
        playLocalOnly(audioUrl);
        return;
      }
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch (e) {
          // ignore — will play locally below on failure
        }
      }

      let playUrl = audioUrl;
      let objectUrl = null;
      if (/^https?:\/\//.test(audioUrl)) {
        try {
          const res = await fetch(audioUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          objectUrl = URL.createObjectURL(blob);
          playUrl = objectUrl;
        } catch (e) {
          playLocalOnly(audioUrl);
          return;
        }
      }

      const audio = new Audio(playUrl);
      let source;
      try {
        source = ctx.createMediaElementSource(audio);
      } catch (err) {
        // Element already captured — fall back to local playback.
        playLocalOnly(playUrl);
        return;
      }

      const cleanup = () => {
        try {
          source.disconnect();
        } catch (e) {
          // ignore
        }
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
      audio.addEventListener('ended', cleanup);

      // Connect to local speakers so streamer hears it
      source.connect(ctx.destination);

      // Connect to destination node so live stream viewers hear it too
      if (destinationNodeRef.current) {
        source.connect(destinationNodeRef.current);
      }

      await audio.play().catch(() => {
        cleanup();
        playLocalOnly(playUrl);
      });
    } catch (err) {
      playLocalOnly(audioUrl);
    }
  }, []);

  // Shared live-audio graph handles for synth SFX (see Soundboard.jsx).
  // Oscillators must be created in THIS context to reach the stream mix.
  const getAudioGraph = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx || ctx.state === 'closed') return null;
    return { context: ctx, streamDestination: destinationNodeRef.current || null };
  }, []);

  // Return processed stream track
  const getProcessedStream = useCallback(() => {    if (!destinationNodeRef.current || !inputStream) return inputStream;
    const processedAudioTrack = destinationNodeRef.current.stream.getAudioTracks()[0];
    const videoTracks = inputStream.getVideoTracks();
    if (!processedAudioTrack) return inputStream;

    return new MediaStream([
      ...videoTracks,
      processedAudioTrack
    ]);
  }, [inputStream]);

  return {
    gain: gainValue,
    setGain,
    isMuted,
    toggleMute,
    limiterEnabled,
    toggleLimiter,
    bass,
    updateBass,
    mid,
    updateMid,
    treble,
    updateTreble,
    playSoundToStream,
    getAudioGraph,
    vuLevel: isMuted ? 0 : vuLevel,
    isClipping: isMuted ? false : isClipping,
    getProcessedStream
  };
}
