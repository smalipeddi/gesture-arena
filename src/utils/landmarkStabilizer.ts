// OneEuroFilter for real-time jitter reduction and landmark stabilization
// Ref: https://cristal.univ-lille.fr/~casiez/1euro/

class LowPassFilter {
  private y: number = 0;
  private isFirst: boolean = true;

  public filter(value: number, alpha: number): number {
    if (this.isFirst) {
      this.y = value;
      this.isFirst = false;
    } else {
      this.y = this.y + alpha * (value - this.y);
    }
    return this.y;
  }
}

export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xFilter: LowPassFilter;
  private dxFilter: LowPassFilter;
  private lastTime: number = 0;

  constructor(minCutoff = 1.0, beta = 0.004, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.xFilter = new LowPassFilter();
    this.dxFilter = new LowPassFilter();
  }

  public filter(value: number, timestamp: number): number {
    if (this.lastTime === 0 || timestamp <= this.lastTime) {
      this.lastTime = timestamp;
      return value;
    }

    const dt = (timestamp - this.lastTime) / 1000.0;
    this.lastTime = timestamp;

    if (dt <= 0) return value;

    // Calculate derivative (speed of movement)
    const prevValue = this.xFilter.filter(value, 1.0); // estimate previous state
    const dx = (value - prevValue) / dt;
    const edx = this.dxFilter.filter(dx, this.alpha(dt, this.dCutoff));
    
    // Use speed to adapt the cutoff frequency
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xFilter.filter(value, this.alpha(dt, cutoff));
  }

  private alpha(dt: number, cutoff: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }
}

// Stabilizes a full set of 21 3D landmarks (x, y, z)
export class HandLandmarkStabilizer {
  private filtersX: OneEuroFilter[] = [];
  private filtersY: OneEuroFilter[] = [];
  private filtersZ: OneEuroFilter[] = [];

  constructor() {
    for (let i = 0; i < 21; i++) {
      this.filtersX.push(new OneEuroFilter(1.2, 0.005, 1.0));
      this.filtersY.push(new OneEuroFilter(1.2, 0.005, 1.0));
      this.filtersZ.push(new OneEuroFilter(1.2, 0.005, 1.0));
    }
  }

  public stabilize(landmarks: { x: number; y: number; z: number }[]): { x: number; y: number; z: number }[] {
    const now = Date.now();
    return landmarks.map((lm, idx) => {
      if (idx >= 21) return lm;
      return {
        x: this.filtersX[idx].filter(lm.x, now),
        y: this.filtersY[idx].filter(lm.y, now),
        z: this.filtersZ[idx].filter(lm.z, now)
      };
    });
  }

  public reset() {
    this.filtersX = [];
    this.filtersY = [];
    this.filtersZ = [];
    for (let i = 0; i < 21; i++) {
      this.filtersX.push(new OneEuroFilter(1.2, 0.005, 1.0));
      this.filtersY.push(new OneEuroFilter(1.2, 0.005, 1.0));
      this.filtersZ.push(new OneEuroFilter(1.2, 0.005, 1.0));
    }
  }
}
