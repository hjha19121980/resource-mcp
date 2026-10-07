export interface MetricSnapshot {
  toolInvocations: number;
  toolErrors: number;
  databaseQueries: number;
  toolDurationMilliseconds: number;
  databaseDurationMilliseconds: number;
}

export class Metrics {
  private values: MetricSnapshot = {
    toolInvocations: 0,
    toolErrors: 0,
    databaseQueries: 0,
    toolDurationMilliseconds: 0,
    databaseDurationMilliseconds: 0
  };

  recordTool(durationMilliseconds: number, failed: boolean): void {
    this.values.toolInvocations += 1;
    this.values.toolDurationMilliseconds += durationMilliseconds;
    if (failed) this.values.toolErrors += 1;
  }

  recordDatabaseQuery(durationMilliseconds: number): void {
    this.values.databaseQueries += 1;
    this.values.databaseDurationMilliseconds += durationMilliseconds;
  }

  snapshot(): MetricSnapshot {
    return { ...this.values };
  }
}
