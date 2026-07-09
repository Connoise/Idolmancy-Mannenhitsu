import { useCallback, useEffect, useRef, useState } from 'react';
import { audioEngine } from '../core/audio';
import type { PlaySequence } from '../core/events';

/**
 * Wraps the shared audio engine for one view. Starting playback anywhere
 * stops whatever else was playing (single global transport).
 */
export function usePlayback() {
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(0);
  const rafRef = useRef(0);

  const stop = useCallback(() => {
    audioEngine.stop();
  }, []);

  const play = useCallback((seq: PlaySequence, bpm: number, loop: boolean) => {
    setPlaying(true);
    setBeat(0);
    audioEngine.play(seq, bpm, {
      loop,
      onBeat: (b) => {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => setBeat(b));
      },
      onEnd: () => {
        setPlaying(false);
        setBeat(0);
      },
    });
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return { playing, beat, play, stop };
}
