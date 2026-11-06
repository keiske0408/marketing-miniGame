class HapticService {
  private enabled = true;

  public setEnabled(val: boolean) {
    this.enabled = val;
  }

  private trigger(pattern: number | number[]) {
    if (!this.enabled) return;
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Silently ignore if permission denied or unsupported
      }
    }
  }

  public tick() {
    this.trigger(12);
  }

  public success() {
    this.trigger([30, 40, 60]);
  }

  public fail() {
    this.trigger([70, 50, 70]);
  }

  public countdown() {
    this.trigger(20);
  }
}

export const haptics = new HapticService();

