// Unit tests for the shared bus-route search service.
//
// This service is the single source of truth for the bus-route passenger
// search query. Both the legacy authed controller (`/bus-routes/search`
// behind `isAuthenticated`) and the new public mirror controller
// (`/public/bus-routes/search`, no auth) call into it.
//
// Bus routes carry no auth-only fields on the public shape, so the guest
// and authed responses are identical — the test pins that contract and
// also exercises the field-strip defense for any embedded user data a
// future schema change might surface.

jest.mock("../../config/database", () => ({
  prisma: {
    busRoute: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { prisma } from "../../config/database";
import { listBusRoutes } from "./busRouteSearch.service";

describe("busRouteSearch.service.listBusRoutes", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the same items for guests and authed viewers (no auth-only fields on routes)", async () => {
    const row = {
      id: 1,
      originCity: "Kigali",
      destCity: "Musanze",
      distanceKm: 90,
      basePrice: "5000",
      isActive: true,
      stops: [
        {
          id: 10,
          routeId: 1,
          name: "Nyabugogo",
          city: "Kigali",
          order: 0,
          latitude: -1.95,
          longitude: 30.06,
        },
      ],
    };
    (prisma.busRoute.findMany as jest.Mock).mockResolvedValue([row]);
    (prisma.busRoute.count as jest.Mock).mockResolvedValue(1);

    const guest = await listBusRoutes({
      viewer: { isGuest: true },
      filters: { originCity: "Kigali", destCity: "Musanze" },
    });
    const authed = await listBusRoutes({
      viewer: { isGuest: false, userId: 99 },
      filters: { originCity: "Kigali", destCity: "Musanze" },
    });

    expect(guest.items).toEqual(authed.items);
    expect(guest.items[0]).toMatchObject({
      id: 1,
      originCity: "Kigali",
      destCity: "Musanze",
    });
    expect(guest.total).toBe(1);
  });

  it("strips operator phone/email when an embedded operator carries them (defensive)", async () => {
    // Defensive coverage: the existing `publicSearch` does not include the
    // operator relation, but if a future caller / schema change attaches
    // operator details, the response mapper must still hide phone/email
    // for guest viewers.
    (prisma.busRoute.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        originCity: "Kigali",
        destCity: "Musanze",
        operator: {
          id: 5,
          firstName: "Op",
          lastName: "Erator",
          phoneNumber: "+250...",
          email: "op@x.com",
        },
        stops: [],
      },
    ]);
    (prisma.busRoute.count as jest.Mock).mockResolvedValue(1);

    const guest = await listBusRoutes({
      viewer: { isGuest: true },
      filters: { originCity: "Kigali", destCity: "Musanze" },
    });
    const op = (guest.items[0] as any).operator;
    expect(op).toBeDefined();
    expect(op).not.toHaveProperty("phoneNumber");
    expect(op).not.toHaveProperty("email");
  });

  it("applies isActive=true + originCity/destCity filters and orders stops", async () => {
    (prisma.busRoute.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.busRoute.count as jest.Mock).mockResolvedValue(0);

    await listBusRoutes({
      viewer: { isGuest: true },
      filters: { originCity: "Kigali", destCity: "Musanze" },
    });

    const findManyArg = (prisma.busRoute.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyArg.where.isActive).toBe(true);
    expect(findManyArg.where.originCity).toBe("Kigali");
    expect(findManyArg.where.destCity).toBe("Musanze");
    // Mirrors the legacy `publicSearch`: stops are included and ordered
    // by `order` ASC so the wire shape stays identical.
    expect(findManyArg.include.stops).toEqual({ orderBy: { order: "asc" } });
  });
});
