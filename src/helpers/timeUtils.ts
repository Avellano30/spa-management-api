export const toMinutes = (time: string) => {
	const [h, m] = time.split(":").map(Number);
	return h * 60 + m;
};

export const toHHMM = (minutes: number): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${pad(h)}:${pad(m)}`;
};