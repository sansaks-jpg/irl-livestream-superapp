import { useState, useEffect, useRef, useCallback } from 'react';

export function useAudioProcessor(inputStream) {
  const [gainValue, setGainValue] = useState(1.0); // 0.0 - 2.5
  const [isMuted, setIsMuted] = useState(false);
  const [limiterEnabled, setLimiterEnabled] = useState(true);
  const [vuLevel, setVuLevel] = useState(0); // 0 - 100
  const [isClipping, setIsClipping] = useState(false);

  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const gainNodeRef = useRef(null);
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

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(gainValue, ctx.currentTime);
      gainNodeRef.current = gainNode;

      // DynamicsCompressor acts as limiter
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-6, ctx.currentTime);
      compressor.knee.setValueAtTime(10, ctx.currentTime);
      compressor.ratio.setValueAtTime(12, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.25, ctx.currentTime);
      compressorNodeRef.current = compressor;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      analyserNodeRef.current = analyser;

      const destination = ctx.createMediaStreamDestination();
      destinationNodeRef.current = destination;

      // Connect nodes
      source.connect(gainNode);
      if (limiterEnabled) {
        gainNode.connect(compressor);
        compressor.connect(analyser);
      } else {
        gainNode.connect(analyser);
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
    setLimiterEnabled(prev => {
      const next = !prev;
      if (gainNodeRef.current && analyserNodeRef.current && compressorNodeRef.current) {
        try {
          gainNodeRef.current.disconnect();
          if (next) {
            gainNodeRef.current.connect(compressorNodeRef.current);
            compressorNodeRef.current.connect(analyserNodeRef.current);
          } else {
            compressorNodeRef.current.disconnect();
            gainNodeRef.current.connect(analyserNodeRef.current);
          }
        } catch (err) {
          console.warn('[AudioProcessor] Limiter reconnect error:', err);
        }
      }
      return next;
    });
  }, []);

  // Return processed stream track
  const getProcessedStream = useCallback(() => {
    if (!destinationNodeRef.current || !inputStream) return inputStream;
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
    vuLevel: isMuted ? 0 : vuLevel,
    isClipping: isMuted ? false : isClipping,
    getProcessedStream
  };
}
