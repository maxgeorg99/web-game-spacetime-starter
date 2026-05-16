type MusicKey = "title" | "main" | "boss" | "ambient" | "none";

interface AudioState {
  current: MusicKey;
  isPlaying: boolean;
  volume: number;
}

let state: AudioState = {
  current: "none",
  isPlaying: false,
  volume: 0.6,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let currentSound: any = null;

function getTrackKey(music: MusicKey): string | null {
  switch (music) {
    case "title": return "music-title";
    case "main": return "music-main";
    case "boss": return "music-boss";
    case "ambient": return "music-main";
    default: return null;
  }
}

export function getAudioManager(scene: Phaser.Scene) {
  return {
    get current(): MusicKey { return state.current; },
    get volume(): number { return state.volume; },

    transitionTo(key: MusicKey): void {
      if (key === state.current) return;

      const newTrackKey = getTrackKey(key);
      if (!newTrackKey || !scene.cache.audio.exists(newTrackKey)) return;

      // Crossfade: fade out current, fade in new
      if (currentSound && currentSound.isPlaying) {
        const old = currentSound;
        scene.tweens.add({
          targets: old,
          volume: 0,
          duration: 500,
          onComplete: () => {
            old.stop();
            old.destroy();
          },
        });
      }

      currentSound = scene.sound.add(newTrackKey, { loop: true, volume: 0 });
      currentSound.play();
      scene.tweens.add({
        targets: currentSound,
        volume: state.volume,
        duration: 500,
      });

      state.current = key;
      state.isPlaying = true;
    },

    playAmbient(scene: Phaser.Scene): void {
      const key = "music-title";
      if (!scene.cache.audio.exists(key)) return;
      if (currentSound && currentSound.isPlaying) return;

      currentSound = scene.sound.add(key, { loop: true, volume: state.volume });
      currentSound.play();
      state.current = "ambient";
      state.isPlaying = true;
    },

    stopAll(): void {
      if (currentSound) {
        currentSound.stop();
        currentSound.destroy();
        currentSound = null;
      }
      state.current = "none";
      state.isPlaying = false;
    },

  setVolume(vol: number): void {
    state.volume = Phaser.Math.Clamp(vol, 0, 1);
    if (currentSound && currentSound.isPlaying) {
      (currentSound as any).volume = state.volume;
    }
  },

    playSfx(scene: Phaser.Scene, key: string): void {
      if (scene.cache.audio.exists(key)) {
        scene.sound.play(key, { volume: state.volume * 0.8 });
      }
    },
  };
}
