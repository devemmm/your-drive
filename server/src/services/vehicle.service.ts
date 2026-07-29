import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";

export class VehicleService {
  // Create a new vehicle
  static async createVehicle(data: Prisma.VehicleCreateInput) {
    return await prisma.vehicle.create({
      data,
    });
  }

  // Get a vehicle by ID
  static async getVehicleById(id: number, include?: Prisma.VehicleInclude) {
    return await prisma.vehicle.findUnique({ where: { id }, ...include && {include} });
  }
  
  static async findOneVehicle(queryOps?: Prisma.VehicleFindFirstArgs) {
    return await prisma.vehicle.findFirst(queryOps);
  }

  // Get all vehicles
  static async getAllVehicles(
    where?: Prisma.VehicleWhereInput,
    page: number = 1,
    limit: number = 10,
    select?: Prisma.VehicleSelect,
    include?: Prisma.VehicleInclude,
    orderBy: Prisma.VehicleOrderByWithAggregationInput = { createdAt: "desc"}
  ) {
    const queryOptions: Prisma.VehicleFindManyArgs = {
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
    };

    // select takes precedence over include if both are provided
    if (select) {
      queryOptions.select = select;
    } else if (include) {
      queryOptions.include = include;
    }

    const [vehicles, total] = await prisma.$transaction([
      prisma.vehicle.findMany(queryOptions),
      prisma.vehicle.count({ where }),
    ]);

    return { vehicles, total };
  }

  // Update a vehicle by ID
  static async updateVehicle(
    id: number,
    data: Prisma.VehicleUpdateInput,
    include?: Prisma.VehicleInclude
  ) {
    // Use the provided include, but ensure 'files' is included for logic if not already present
    const needsFiles = !include?.files;
    const logicInclude = needsFiles ? { ...(include || {}), files: true } : include;

    let vehicle = await prisma.vehicle.update({
      where: { id },
      data,
      include: logicInclude,
    });

    // Only set defaultImageId if not set and files are available
    if (
      vehicle &&
      vehicle.files &&
      vehicle.files.length > 0 &&
      !vehicle.defaultImageId
    ) {
      vehicle = await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: {
          defaultImageId: vehicle.files[0].id,
        },
        include: logicInclude,
      });
    }

    // If the original include did not request 'files', remove them from the result
    if (include && !include.files && vehicle && 'files' in vehicle) {
      delete (vehicle as any)?.files;
    }

    return vehicle;
  }

  // Delete a vehicle by ID
  static async deleteVehicle(id: number) {
    return await prisma.vehicle.delete({ where: { id } });
  }
}
