// FPS Monitor Class
export class FPSMonitor {
  constructor() {
    this.frameCount = 0;
    this.startTime = performance.now();
    this.lastTime = this.startTime;
    this.fps = 0;
    this.avgFps = 0;
    this.fpsHistory = [];
    this.maxHistorySize = 30;
    this.minAcceptableFps = 15;
    this.warningFps = 20;
  }

  update() {
    this.frameCount++;
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    
    this.fps = 1000 / deltaTime;
    
    this.fpsHistory.push(this.fps);
    if (this.fpsHistory.length > this.maxHistorySize) {
      this.fpsHistory.shift();
    }
    
    this.avgFps = this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
    
    this.lastTime = currentTime;
    
    return {
      fps: Math.round(this.fps),
      avgFps: Math.round(this.avgFps),
      isLowPerformance: this.avgFps < this.minAcceptableFps,
      showWarning: this.avgFps < this.warningFps,
      frameCount: this.frameCount
    };
  }

  reset() {
    this.frameCount = 0;
    this.startTime = performance.now();
    this.lastTime = this.startTime;
    this.fps = 0;
    this.avgFps = 0;
    this.fpsHistory = [];
  }
}