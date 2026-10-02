export type TranscriptFollowInput = {
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
  newTurnCount: number;
  threshold?: number;
};

export type TranscriptFollowState = {
  shouldFollow: boolean;
  unseenCount: number;
};

export function getTranscriptFollowState({
  scrollTop,
  clientHeight,
  scrollHeight,
  newTurnCount,
  threshold = 48
}: TranscriptFollowInput): TranscriptFollowState {
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
  const shouldFollow = distanceFromBottom <= threshold;

  return {
    shouldFollow,
    unseenCount: shouldFollow ? 0 : Math.max(0, newTurnCount)
  };
}
