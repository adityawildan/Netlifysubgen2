
export interface SubtitleSegment {
  start: string;
  end: string;
  text: string;
}

export enum AppStatus {
  Idle,
  FileSelected,
  Processing,
  Success,
  Error,
}
