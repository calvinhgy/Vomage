/**
 * 音频处理工具函数
 */

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  /**
   * 初始化录音器
   */
  async initialize(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      });
    } catch (error) {
      throw new Error('无法访问麦克风，请检查权限设置');
    }
  }

  /**
   * 开始录音
   */
  startRecording(onDataAvailable?: (chunk: Blob) => void): void {
    if (!this.stream) {
      throw new Error('录音器未初始化');
    }

    this.audioChunks = [];
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: this.getSupportedMimeType(),
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
        onDataAvailable?.(event.data);
      }
    };

    this.mediaRecorder.start(100); // 每100ms收集一次数据
  }

  /**
   * 停止录音
   */
  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('录音器未启动'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, {
          type: this.getSupportedMimeType(),
        });
        resolve(audioBlob);
      };

      this.mediaRecorder.onerror = (event) => {
        reject(new Error('录音过程中发生错误'));
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  /**
   * 获取支持的MIME类型
   */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/mpeg',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm'; // 默认类型
  }

  /**
   * 检查录音权限
   */
  static async checkPermission(): Promise<boolean> {
    try {
      const permission = await navigator.permissions.query({
        name: 'microphone' as PermissionName,
      });
      return permission.state === 'granted';
    } catch {
      // 如果不支持权限API，尝试直接访问麦克风
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        return true;
      } catch {
        return false;
      }
    }
  }
}

/**
 * 音频可视化器
 */
export class AudioVisualizer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  /**
   * 初始化可视化器
   */
  initialize(stream: MediaStream): void {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.source = this.audioContext.createMediaStreamSource(stream);

    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);

    this.source.connect(this.analyser);
  }

  /**
   * 获取音频数据
   */
  getAudioData(): number[] {
    if (!this.analyser || !this.dataArray) {
      return [];
    }

    this.analyser.getByteFrequencyData(this.dataArray);
    return Array.from(this.dataArray);
  }

  /**
   * 获取音量级别 (0-100)
   */
  getVolumeLevel(): number {
    if (!this.analyser || !this.dataArray) {
      return 0;
    }

    this.analyser.getByteFrequencyData(this.dataArray);
    
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    
    const average = sum / this.dataArray.length;
    return Math.round((average / 255) * 100);
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.dataArray = null;
  }
}

/**
 * 音频格式转换
 */
export const convertAudioFormat = async (
  audioBlob: Blob,
  targetFormat: string = 'audio/wav'
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const fileReader = new FileReader();

    fileReader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // 这里可以添加更复杂的格式转换逻辑
        // 目前直接返回原始blob
        resolve(audioBlob);
      } catch (error) {
        reject(error);
      }
    };

    fileReader.onerror = () => reject(new Error('文件读取失败'));
    fileReader.readAsArrayBuffer(audioBlob);
  });
};

/**
 * 计算音频时长
 */
export const getAudioDuration = (audioBlob: Blob): Promise<number> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(audioBlob);

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('无法获取音频时长'));
    };

    audio.src = url;
  });
};

/**
 * 格式化时长显示
 */
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
