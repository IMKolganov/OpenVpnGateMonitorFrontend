export function isMockApiEnabled(): boolean {
  return String(import.meta.env.VITE_MOCK_API ?? "").trim() === "1";
}
