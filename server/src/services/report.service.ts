export class ReportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportValidationError";
  }
}

export type ReportTargetType = "RIDE" | "CHAUFFEUR" | "RENTAL";

export interface ReportTargetInput {
  rideId: number | null;
  chauffeurServiceId: number | null;
  rentalId: number | null;
}

/**
 * Validates that exactly one trip FK is set on a report payload and returns the target kind.
 * Throws ReportValidationError if zero or multiple FKs are set.
 */
export function selectReportTarget(input: ReportTargetInput): ReportTargetType {
  const set = [
    input.rideId != null ? "RIDE" : null,
    input.chauffeurServiceId != null ? "CHAUFFEUR" : null,
    input.rentalId != null ? "RENTAL" : null,
  ].filter(Boolean) as ReportTargetType[];

  if (set.length === 0) {
    throw new ReportValidationError(
      "Exactly one of rideId, chauffeurServiceId, or rentalId must be set; none provided.",
    );
  }
  if (set.length > 1) {
    throw new ReportValidationError(
      `Exactly one of rideId, chauffeurServiceId, or rentalId must be set; got ${set.join(", ")}.`,
    );
  }
  return set[0];
}

export function assertNotSelfReport(reporterId: number, subjectUserId: number): void {
  if (reporterId === subjectUserId) {
    throw new ReportValidationError("You cannot report yourself.");
  }
}
