/**
 * Advanced performance analysis tool for 3D rendering optimization
 * Provides detailed metrics, bottleneck detection, and optimization recommendations
 */
export class PerformanceAnalyzer {
  private samples: PerformanceSample[] = [];
  private maxSamples: number = 300; // Keep 5 minutes at 60fps
  private analysisInterval: number = 2000; // Analyze every 2 seconds
  private lastAnalysis: number = 0;
  private startTime: number = performance.now();
  private readonly WARMUP_PERIOD: number = 5000; // Skip warnings for first 5 seconds

  // Performance thresholds
  private readonly THRESHOLDS = {
    GOOD_FPS: 55,
    ACCEPTABLE_FPS: 45,
    POOR_FPS: 30,
    GOOD_FRAME_TIME: 18,
    ACCEPTABLE_FRAME_TIME: 25,
    POOR_FRAME_TIME: 35
  };

  constructor() {
    this.startAnalysis();
  }

  // ============== DATA COLLECTION ==============
  
  recordFrame(frameTime: number, renderInfo: RenderInfo): void {
    const sample: PerformanceSample = {
      timestamp: performance.now(),
      frameTime,
      fps: 1000 / frameTime,
      ...renderInfo
    };
    
    this.samples.push(sample);
    
    // Keep only recent samples
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
    
    // Trigger analysis if needed
    const now = performance.now();
    if (now - this.lastAnalysis > this.analysisInterval) {
      this.analyzePerformance();
      this.lastAnalysis = now;
    }
  }

  // ============== PERFORMANCE ANALYSIS ==============
  
  private analyzePerformance(): void {
    if (this.samples.length < 30) return; // Need enough samples

    const analysis = this.generateAnalysis();
    const bottlenecks = this.detectBottlenecks(analysis);
    const recommendations = this.generateRecommendations(analysis, bottlenecks);

    // Skip warnings during warmup period (initial scene load)
    const timeSinceStart = performance.now() - this.startTime;
    const isWarmingUp = timeSinceStart < this.WARMUP_PERIOD;

    // Log significant findings (only after warmup)
    if (!isWarmingUp && analysis.averageFPS < this.THRESHOLDS.ACCEPTABLE_FPS) {
      console.warn('⚠️ Performance Alert:', {
        averageFPS: analysis.averageFPS.toFixed(1),
        bottlenecks,
        recommendations: recommendations.slice(0, 2) // Top 2 recommendations
      });
    }

    // Store latest analysis
    this.latestAnalysis = {
      ...analysis,
      bottlenecks,
      recommendations,
      timestamp: performance.now()
    };
  }
  
  private generateAnalysis(): PerformanceAnalysis {
    const recentSamples = this.samples.slice(-120); // Last 2 seconds at 60fps
    
    const frameTimes = recentSamples.map(s => s.frameTime);
    const fps = recentSamples.map(s => s.fps);
    const objectCounts = recentSamples.map(s => s.objectCount);
    const drawCalls = recentSamples.map(s => s.drawCalls);
    
    return {
      sampleCount: recentSamples.length,
      
      // Frame timing
      averageFrameTime: this.average(frameTimes),
      minFrameTime: Math.min(...frameTimes),
      maxFrameTime: Math.max(...frameTimes),
      frameTimeVariance: this.variance(frameTimes),
      
      // FPS metrics
      averageFPS: this.average(fps),
      minFPS: Math.min(...fps),
      maxFPS: Math.max(...fps),
      fpsStability: 1 - (this.variance(fps) / Math.pow(this.average(fps), 2)),
      
      // Render load
      averageObjectCount: this.average(objectCounts),
      maxObjectCount: Math.max(...objectCounts),
      averageDrawCalls: this.average(drawCalls),
      maxDrawCalls: Math.max(...drawCalls),
      
      // Trends
      fpsTrend: this.calculateTrend(fps),
      frameTimeTrend: this.calculateTrend(frameTimes),
      objectCountTrend: this.calculateTrend(objectCounts)
    };
  }
  
  private detectBottlenecks(analysis: PerformanceAnalysis): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    
    // CPU bottlenecks
    if (analysis.averageFrameTime > this.THRESHOLDS.POOR_FRAME_TIME) {
      bottlenecks.push({
        type: 'cpu',
        severity: analysis.averageFrameTime > this.THRESHOLDS.POOR_FRAME_TIME * 1.5 ? 'critical' : 'high',
        description: `High frame time: ${analysis.averageFrameTime.toFixed(1)}ms`,
        impact: 'Frame rate significantly affected'
      });
    }
    
    // Object count bottlenecks
    if (analysis.averageObjectCount > 500) {
      bottlenecks.push({
        type: 'object_count',
        severity: analysis.averageObjectCount > 1000 ? 'high' : 'medium',
        description: `High object count: ${Math.round(analysis.averageObjectCount)}`,
        impact: 'Increased CPU overhead for scene traversal'
      });
    }
    
    // Draw call bottlenecks
    if (analysis.averageDrawCalls > 200) {
      bottlenecks.push({
        type: 'draw_calls',
        severity: analysis.averageDrawCalls > 500 ? 'high' : 'medium',
        description: `High draw calls: ${Math.round(analysis.averageDrawCalls)}`,
        impact: 'GPU bottleneck, consider batching'
      });
    }
    
    // Performance instability
    if (analysis.fpsStability < 0.8) {
      bottlenecks.push({
        type: 'instability',
        severity: analysis.fpsStability < 0.6 ? 'high' : 'medium',
        description: `Unstable performance: ${(analysis.fpsStability * 100).toFixed(0)}% stability`,
        impact: 'Jerky animation and poor user experience'
      });
    }
    
    return bottlenecks.sort((a, b) => this.getSeverityScore(b.severity) - this.getSeverityScore(a.severity));
  }
  
  private generateRecommendations(analysis: PerformanceAnalysis, bottlenecks: Bottleneck[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // FPS-based recommendations
    if (analysis.averageFPS < this.THRESHOLDS.POOR_FPS) {
      recommendations.push({
        priority: 'high',
        category: 'quality',
        action: 'Enable adaptive quality',
        description: 'Automatically reduce quality when performance drops',
        expectedImprovement: 'Up to 30% FPS improvement'
      });
      
      recommendations.push({
        priority: 'high',
        category: 'culling',
        action: 'Enable frustum culling',
        description: 'Only render objects visible to camera',
        expectedImprovement: 'Reduce unnecessary render operations'
      });
    }
    
    // Object count recommendations
    if (analysis.averageObjectCount > 300) {
      recommendations.push({
        priority: 'medium',
        category: 'optimization',
        action: 'Implement object pooling',
        description: 'Reuse objects instead of creating new ones',
        expectedImprovement: 'Reduce memory allocation overhead'
      });
      
      recommendations.push({
        priority: 'medium',
        category: 'culling',
        action: 'Implement LOD system',
        description: 'Use lower detail models for distant objects',
        expectedImprovement: 'Reduce polygon count and draw calls'
      });
    }
    
    // Frame time variance recommendations
    if (analysis.frameTimeVariance > 50) {
      recommendations.push({
        priority: 'medium',
        category: 'optimization',
        action: 'Implement frame time smoothing',
        description: 'Spread work across multiple frames',
        expectedImprovement: 'More consistent frame times'
      });
    }
    
    // Memory pressure recommendations
    const memoryBottlenecks = bottlenecks.filter(b => b.type === 'object_count');
    if (memoryBottlenecks.length > 0) {
      recommendations.push({
        priority: 'low',
        category: 'memory',
        action: 'Implement periodic cleanup',
        description: 'Regular garbage collection and resource cleanup',
        expectedImprovement: 'Prevent memory leaks and reduce pressure'
      });
    }
    
    return recommendations.sort((a, b) => this.getPriorityScore(b.priority) - this.getPriorityScore(a.priority));
  }

  // ============== UTILITY METHODS ==============
  
  private average(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
  
  private variance(values: number[]): number {
    const avg = this.average(values);
    const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
    return this.average(squaredDiffs);
  }
  
  private calculateTrend(values: number[]): number {
    if (values.length < 10) return 0;
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = this.average(firstHalf);
    const secondAvg = this.average(secondHalf);
    
    // Return normalized trend (-1 to 1)
    const change = (secondAvg - firstAvg) / firstAvg;
    return Math.max(-1, Math.min(1, change));
  }
  
  private getSeverityScore(severity: 'low' | 'medium' | 'high' | 'critical'): number {
    switch (severity) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }
  
  private getPriorityScore(priority: 'low' | 'medium' | 'high'): number {
    switch (priority) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  // ============== PUBLIC API ==============
  
  private latestAnalysis: PerformanceReport | null = null;
  
  getLatestReport(): PerformanceReport | null {
    return this.latestAnalysis;
  }
  
  getDetailedMetrics(): DetailedMetrics {
    const recent = this.samples.slice(-60); // Last second
    
    return {
      currentFPS: recent.length > 0 ? recent[recent.length - 1].fps : 0,
      averageFPS: recent.length > 0 ? this.average(recent.map(s => s.fps)) : 0,
      frameTimeP99: recent.length > 0 ? this.percentile(recent.map(s => s.frameTime), 0.99) : 0,
      frameTimeP95: recent.length > 0 ? this.percentile(recent.map(s => s.frameTime), 0.95) : 0,
      objectCount: recent.length > 0 ? recent[recent.length - 1].objectCount : 0,
      memoryUsage: this.estimateMemoryUsage(),
      qualityLevel: this.getCurrentQualityLevel()
    };
  }
  
  private percentile(values: number[], p: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.floor(p * sorted.length);
    return sorted[index] || 0;
  }
  
  private estimateMemoryUsage(): number {
    // Rough estimation based on object counts
    const recent = this.samples.slice(-10);
    if (recent.length === 0) return 0;
    
    const avgObjects = this.average(recent.map(s => s.objectCount));
    // Estimate ~1KB per object (very rough)
    return avgObjects * 1024;
  }
  
  private getCurrentQualityLevel(): number {
    // This would come from the render manager
    return 1.0;
  }
  
  private startAnalysis(): void {
    // Background analysis runs periodically
    setInterval(() => {
      if (this.samples.length > 30) {
        this.analyzePerformance();
      }
    }, this.analysisInterval);
  }
  
  // Reset analysis (useful for testing different scenarios)
  reset(): void {
    this.samples = [];
    this.latestAnalysis = null;
  }
  
  // Get performance grade (A-F)
  getPerformanceGrade(): string {
    const analysis = this.latestAnalysis;
    if (!analysis) return 'N/A';
    
    const fps = analysis.averageFPS;
    if (fps >= this.THRESHOLDS.GOOD_FPS) return 'A';
    if (fps >= this.THRESHOLDS.ACCEPTABLE_FPS) return 'B';
    if (fps >= this.THRESHOLDS.POOR_FPS) return 'C';
    if (fps >= 20) return 'D';
    return 'F';
  }
}

// ============== TYPE DEFINITIONS ==============

interface PerformanceSample {
  timestamp: number;
  frameTime: number;
  fps: number;
  objectCount: number;
  drawCalls: number;
  memoryUsage?: number;
  culledObjects?: number;
  qualityLevel?: number;
}

interface RenderInfo {
  objectCount: number;
  drawCalls: number;
  memoryUsage?: number;
  culledObjects?: number;
  qualityLevel?: number;
}

interface PerformanceAnalysis {
  sampleCount: number;
  averageFrameTime: number;
  minFrameTime: number;
  maxFrameTime: number;
  frameTimeVariance: number;
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  fpsStability: number;
  averageObjectCount: number;
  maxObjectCount: number;
  averageDrawCalls: number;
  maxDrawCalls: number;
  fpsTrend: number;
  frameTimeTrend: number;
  objectCountTrend: number;
}

interface Bottleneck {
  type: 'cpu' | 'gpu' | 'memory' | 'object_count' | 'draw_calls' | 'instability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
}

interface Recommendation {
  priority: 'low' | 'medium' | 'high';
  category: 'quality' | 'culling' | 'optimization' | 'memory';
  action: string;
  description: string;
  expectedImprovement: string;
}

interface PerformanceReport {
  timestamp: number;
  averageFPS: number;
  fpsStability: number;
  bottlenecks: Bottleneck[];
  recommendations: Recommendation[];
  averageFrameTime: number;
  frameTimeVariance: number;
  fpsTrend: number;
}

interface DetailedMetrics {
  currentFPS: number;
  averageFPS: number;
  frameTimeP99: number;
  frameTimeP95: number;
  objectCount: number;
  memoryUsage: number;
  qualityLevel: number;
}

// Singleton instance
export const performanceAnalyzer = new PerformanceAnalyzer();