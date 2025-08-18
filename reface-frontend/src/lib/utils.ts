export function timeTaken(
    startedAt?: string,
    endedAt?: string
  ): string {
    if (!startedAt || !endedAt) {
      return 'Not started yet';
    }
    // Parse input strings into Date objects (same day assumption)
    const start = new Date(startedAt);
    const end = new Date(endedAt);
  
    // Handle crossing midnight
  if (end < start) {
    end.setDate(end.getDate() + 1);
  }

  const diffMs = end.getTime() - start.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours} Hour${hours > 1 ? "s" : ""}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} Minute${minutes > 1 ? "s" : ""}`);
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds} Second${seconds > 1 ? "s" : ""}`);
  }

  return `Time taken: ${parts.join(", ")}`;
  }
  