/**
 * Centralized notification utility for audio alerts and visual notifications
 * Provides a single source of truth for all notification sounds and toast messages
 */

class NotificationManager {
  private audioElement: HTMLAudioElement | null = null;
  private isInitialized = false;

  /**
   * Initialize the audio element
   * Should be called once during app initialization
   */
  initialize() {
    if (this.isInitialized) return;

    try {
      this.audioElement = new Audio("/notification.wav");
      this.audioElement.volume = 0.5;
      this.isInitialized = true;
    } catch (error) {
      console.warn("Failed to initialize notification audio:", error);
    }
  }

  /**
   * Play notification sound
   * Automatically resets to beginning for sequential plays
   */
  playSound() {
    if (!this.audioElement) {
      // console.log("🔊 Initializing audio on first play...");
      this.initialize();
    }

    if (this.audioElement) {
      this.audioElement.currentTime = 0;
      this.audioElement
        .play()
        .then(() => {
          // console.log("✅ Notification sound played successfully");
        })
        .catch((err) => {
          console.error("❌ Audio playback failed:", err);
          console.log(
            "💡 Tip: User interaction might be required to enable audio"
          );
        });
    } else {
      console.error("❌ Audio element not initialized");
    }
  }

  /**
   * Update volume (0.0 to 1.0)
   */
  setVolume(volume: number) {
    if (this.audioElement) {
      this.audioElement.volume = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Cleanup audio resources
   * Should be called on app unmount
   */
  cleanup() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
    this.isInitialized = false;
  }
}

// Export singleton instance
export const notificationManager = new NotificationManager();

// Auto-initialize on first import
if (typeof window !== "undefined") {
  notificationManager.initialize();
}
