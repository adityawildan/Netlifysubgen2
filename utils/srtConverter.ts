
import type { SubtitleSegment } from '../types';

export const convertToSRT = (segments: SubtitleSegment[]): string => {
  return segments
    .map((segment, index) => {
      const { start, end, text } = segment;
      // SRT uses comma for milliseconds, which matches our prompt.
      // We just need to format it into the block.
      return `${index + 1}\n${start} --> ${end}\n${text}\n`;
    })
    .join('\n');
};
