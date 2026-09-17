import type { ReleaseHistoryGroup, ReleaseHistoryItem } from '../../types/release';

// Items arrive newest first, so consecutive runs of the same month label are
// exactly the design's month sections — no re-sorting here.
export const groupReleaseHistoryByMonth = (
  items: ReleaseHistoryItem[],
): ReleaseHistoryGroup[] =>
  items.reduce<ReleaseHistoryGroup[]>((groups, item) => {
    const lastGroup = groups.at(-1);
    if (lastGroup?.label === item.monthLabel) {
      lastGroup.items.push(item);
    } else {
      groups.push({ label: item.monthLabel, items: [item] });
    }
    return groups;
  }, []);
