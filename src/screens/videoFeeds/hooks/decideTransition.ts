export type TransitionType = 'A_CURRENT' | 'B_PROMOTE' | 'RECONFIG';

export type DecideTransitionInput = {
  offsetY: number;
  lastOffsetY: number;
  screenHeight: number;
  listLength: number;
  aIndex: number;
  bIndex: number;
};

export type DecideTransitionOutput = {
  nextIndex: number;
  directionDown: boolean;
  preloadIndex: number; // 없으면 -1
  transition: TransitionType;
  nextLastOffsetY: number;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export const decideTransition = ({
  offsetY,
  lastOffsetY,
  screenHeight,
  listLength,
  aIndex,
  bIndex,
}: DecideTransitionInput): DecideTransitionOutput => {
  if (listLength <= 0 || screenHeight <= 0) {
    return {
      nextIndex: 0,
      directionDown: true,
      preloadIndex: -1,
      transition: 'RECONFIG',
      nextLastOffsetY: offsetY,
    };
  }

  const nextIndex = clamp(Math.round(offsetY / screenHeight), 0, listLength - 1);
  const directionDown = offsetY >= lastOffsetY;

  const cand = directionDown ? nextIndex + 1 : nextIndex - 1;
  const preloadIndex = cand >= 0 && cand < listLength ? cand : -1;

  const transition: TransitionType =
    nextIndex === aIndex ? 'A_CURRENT' : nextIndex === bIndex ? 'B_PROMOTE' : 'RECONFIG';

  return {
    nextIndex,
    directionDown,
    preloadIndex,
    transition,
    nextLastOffsetY: offsetY,
  };
};
