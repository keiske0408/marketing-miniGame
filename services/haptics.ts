export type HapticResult = 'sent' | 'disabled' | 'unsupported' | 'failed';

export class HapticService {
  private enabled = true;

  public setEnabled(val: boolean) {
    this.enabled = val;
  }

  private trigger(pattern: number | number[]): HapticResult {
    if (!this.enabled) return 'disabled';
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return 'unsupported';
    try {
      return navigator.vibrate(pattern) ? 'sent' : 'failed';
    } catch (error) {
      console.warn('Vibration request failed:', error);
      return 'failed';
    }
  }

  public tick() {
    this.trigger(40);
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

  public test(): HapticResult {
    return this.trigger(200);
  }
}

export const haptics = new HapticService();

