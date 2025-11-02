import { toMinutes } from "./convertTime";

export const isOverlapping = (startA: string, endA: string, startB: string, endB: string) => {
	const start1 = toMinutes(startA);
	const end1 = toMinutes(endA);
	const start2 = toMinutes(startB);
	const end2 = toMinutes(endB);
	return start1 < end2 && start2 < end1;
};