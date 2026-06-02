import shared from '../components/shared.module.css';

const MAP = {
  CRITICAL: shared.badgeCritical,
  HIGH: shared.badgeHigh,
  MEDIUM: shared.badgeMedium,
  LOW: shared.badgeLow,
};

export function priorityBadgeClass(level) {
  return MAP[level] || shared.badgeMedium;
}
