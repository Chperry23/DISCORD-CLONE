export interface MediaDeviceInfo {
  deviceId: string;
  label: string;
  kind: "audioinput" | "audiooutput" | "videoinput";
}

export async function getAudioDevices(): Promise<{
  inputs: MediaDeviceInfo[];
  outputs: MediaDeviceInfo[];
}> {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    return { inputs: [], outputs: [] };
  }

  const devices = await navigator.mediaDevices.enumerateDevices();

  const inputs = devices
    .filter((d) => d.kind === "audioinput" && d.deviceId)
    .map((d, i) => ({
      deviceId: d.deviceId,
      label: d.label || `Microphone ${i + 1}`,
      kind: "audioinput" as const,
    }));

  const outputs = devices
    .filter((d) => d.kind === "audiooutput" && d.deviceId)
    .map((d, i) => ({
      deviceId: d.deviceId,
      label: d.label || `Speaker ${i + 1}`,
      kind: "audiooutput" as const,
    }));

  return { inputs, outputs };
}

export async function getMicStream(deviceId?: string): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
}

export async function getScreenStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getDisplayMedia({
    video: {
      cursor: "always",
    } as MediaTrackConstraints,
    audio: true,
  });
}

export function getAudioLevel(stream: MediaStream): () => number {
  const ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  const source = ctx.createMediaStreamSource(stream);
  source.connect(analyser);
  analyser.fftSize = 256;

  const data = new Uint8Array(analyser.frequencyBinCount);

  return () => {
    analyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i]!;
    return sum / data.length / 255;
  };
}

export function setSinkId(element: HTMLAudioElement | HTMLVideoElement, deviceId: string): Promise<void> {
  if ("setSinkId" in element) {
    return (element as any).setSinkId(deviceId);
  }
  return Promise.resolve();
}
