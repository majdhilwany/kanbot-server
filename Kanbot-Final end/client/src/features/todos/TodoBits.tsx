import type { Todo } from '../../types/api';
import { PRIORITY_LABEL, TYPE_LABEL } from '../../lib/constants';

export const PriorityBadge = ({ p }: { p: Todo['priority'] }) => <span className={`badge pr-${p}`}>{PRIORITY_LABEL[p]}</span>;
export const TypeBadge = ({ t }: { t: Todo['type'] }) => <span className="badge">{TYPE_LABEL[t]}</span>;
export const Points = ({ n }: { n: Todo['storyPoints'] }) => <span className="pts">{n ?? '-'} pts</span>;
