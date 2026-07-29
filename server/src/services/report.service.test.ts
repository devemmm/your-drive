import {
  selectReportTarget,
  assertNotSelfReport,
  ReportValidationError,
} from "./report.service";

describe("selectReportTarget", () => {
  it("returns RIDE when only rideId is set", () => {
    expect(selectReportTarget({ rideId: 1, chauffeurServiceId: null, rentalId: null })).toBe("RIDE");
  });
  it("returns CHAUFFEUR when only chauffeurServiceId is set", () => {
    expect(selectReportTarget({ rideId: null, chauffeurServiceId: 2, rentalId: null })).toBe("CHAUFFEUR");
  });
  it("returns RENTAL when only rentalId is set", () => {
    expect(selectReportTarget({ rideId: null, chauffeurServiceId: null, rentalId: 3 })).toBe("RENTAL");
  });
  it("throws when no FK is set", () => {
    expect(() => selectReportTarget({ rideId: null, chauffeurServiceId: null, rentalId: null }))
      .toThrow(ReportValidationError);
  });
  it("throws when multiple FKs are set", () => {
    expect(() => selectReportTarget({ rideId: 1, chauffeurServiceId: 2, rentalId: null }))
      .toThrow(ReportValidationError);
  });
  it("throws when all three FKs are set", () => {
    expect(() => selectReportTarget({ rideId: 1, chauffeurServiceId: 2, rentalId: 3 }))
      .toThrow(ReportValidationError);
  });
});

describe("assertNotSelfReport", () => {
  it("passes when reporter and subject differ", () => {
    expect(() => assertNotSelfReport(1, 2)).not.toThrow();
  });
  it("throws when reporter reports themself", () => {
    expect(() => assertNotSelfReport(5, 5)).toThrow(ReportValidationError);
  });
});
