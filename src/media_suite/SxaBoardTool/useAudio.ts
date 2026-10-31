import { useCallback, useState, useRef } from 'react';

export function useAudio() {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const triggerAudioBeep = useCallback((freq: number, type: OscillatorType, duration: number) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = 0.15;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio not supported or blocked by browser policies
    }
  }, []);

  const playText = useCallback((text: string) => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance;
        
        utterance.onstart = () => {
          setIsPlayingAudio(true);
          setAudioProgress(0);
        };
        
        utterance.onend = () => {
          setIsPlayingAudio(false);
          setAudioProgress(100);
        };

        utterance.onerror = () => {
          setIsPlayingAudio(false);
        };

        window.speechSynthesis.speak(utterance);
      } else {
        // Fallback beep
        triggerAudioBeep(440, 'sine', 1.0);
      }
    } catch (e) {
      console.warn('Speech synthesis failed', e);
    }
  }, [triggerAudioBeep]);

  const stopText = useCallback(() => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
      setAudioProgress(0);
    } catch (e) {
      console.warn('Failed to stop speech synthesis', e);
    }
  }, []);

  return { triggerAudioBeep, playText, stopText, isPlayingAudio, audioProgress };
}
