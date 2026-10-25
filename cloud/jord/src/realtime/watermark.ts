/**
 * Commit watermark for outbox resume.
 * Watermark is the largest seq such that every allocated seq <= it has completed.
 * Higher seq committing first does not advance the watermark past a lower in-flight seq.
 * In-process only: it sees writers in this server, not other processes.
 */

export class CommitWatermark {
  private readonly inFlight = new Set<number>();
  private maxCompleted = 0;

  /** Mark seq as allocated / in flight (before commit). */
  begin(seq: number): void {
    this.inFlight.add(seq);
  }

  /** Mark seq as committed. */
  complete(seq: number): void {
    this.inFlight.delete(seq);
    if (seq > this.maxCompleted) this.maxCompleted = seq;
  }

  /** The transaction rolled back; the seq will never be visible. */
  abandon(seq: number): void {
    this.inFlight.delete(seq);
  }

  hasInFlight(): boolean {
    return this.inFlight.size > 0;
  }

  /**
   * Readable watermark: max contiguous completed seq from the bottom of in-flight.
   * Empty in-flight → maxCompleted.
   */
  get(): number {
    if (this.inFlight.size === 0) return this.maxCompleted;
    let minInFlight = Infinity;
    for (const seq of this.inFlight) {
      if (seq < minInFlight) minInFlight = seq;
    }
    return minInFlight - 1;
  }
}
