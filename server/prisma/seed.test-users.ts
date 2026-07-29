import bcrypt from "bcryptjs";
import { PrismaClient, UserRole, VehicleCategory } from "@prisma/client";

const prisma = new PrismaClient();

const PASSWORD = "Password123!";

function code(prefix: string): string {
  return prefix + Math.random().toString(36).substring(2, 8).toUpperCase();
}

interface DriverSpec {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  vehicle: {
    make: string;
    model: string;
    year: number;
    color: string;
    plateNumber: string;
    category: VehicleCategory;
    capacity: number;
  };
}

const PASSENGER = {
  email: "passenger@yourdrive.com",
  firstName: "Test",
  lastName: "Passenger",
  phone: "+250788000001",
};

const DRIVERS: DriverSpec[] = [
  {
    email: "driver1@yourdrive.com",
    firstName: "Jean",
    lastName: "Mugabo",
    phone: "+250788000101",
    vehicle: { make: "Toyota", model: "Vitz", year: 2018, color: "White", plateNumber: "RAD 101 A", category: VehicleCategory.CAR, capacity: 4 },
  },
  {
    email: "driver2@yourdrive.com",
    firstName: "Eric",
    lastName: "Habimana",
    phone: "+250788000102",
    vehicle: { make: "Honda", model: "Fit", year: 2019, color: "Silver", plateNumber: "RAD 102 B", category: VehicleCategory.CAR, capacity: 4 },
  },
  {
    email: "driver3@yourdrive.com",
    firstName: "Patrick",
    lastName: "Niyonsaba",
    phone: "+250788000103",
    vehicle: { make: "Toyota", model: "RAV4", year: 2020, color: "Black", plateNumber: "RAD 103 C", category: VehicleCategory.CAR, capacity: 5 },
  },
  {
    email: "driver4@yourdrive.com",
    firstName: "Samuel",
    lastName: "Uwimana",
    phone: "+250788000104",
    vehicle: { make: "Toyota", model: "Hilux", year: 2017, color: "Grey", plateNumber: "RAD 104 D", category: VehicleCategory.CAR, capacity: 5 },
  },
  {
    email: "driver5@yourdrive.com",
    firstName: "David",
    lastName: "Nkurunziza",
    phone: "+250788000105",
    vehicle: { make: "Bajaj", model: "Boxer", year: 2021, color: "Red", plateNumber: "RAD 105 E", category: VehicleCategory.MOTORBIKE, capacity: 1 },
  },
];

// Spread pickup locations across Kigali
const KIGALI_POINTS = [
  { name: "Kigali Convention Centre", address: "KG 2 Roundabout, Kigali", lat: -1.9553, lng: 30.0928 },
  { name: "Nyabugogo Bus Park", address: "Nyabugogo, Kigali", lat: -1.9395, lng: 30.0410 },
  { name: "Kimironko Market", address: "Kimironko, Kigali", lat: -1.9316, lng: 30.1180 },
  { name: "Remera Stadium", address: "Remera, Kigali", lat: -1.9536, lng: 30.1097 },
  { name: "Kacyiru", address: "Kacyiru, Kigali", lat: -1.9396, lng: 30.0810 },
];

async function upsertUser(opts: {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  isDriver: boolean;
}) {
  const hashed = await bcrypt.hash(PASSWORD, 10);
  const dob = new Date("1995-06-15");
  return prisma.user.upsert({
    where: { email: opts.email },
    update: {
      firstName: opts.firstName,
      lastName: opts.lastName,
      phoneNumber: opts.phone,
      isVerified: true,
      isPhoneVerified: true,
      isEmailVerified: true,
      isOnboarded: true,
      isPassengerOnboarded: true,
      isDriverOnboarded: opts.isDriver,
      termsAccepted: true,
      dateOfBirth: dob,
      isAvailableForRideRequest: opts.isDriver,
      licenseNumber: opts.isDriver ? `RW-DL-${opts.email.split("@")[0].toUpperCase()}` : null,
      drivingExperience: opts.isDriver ? "5 years" : null,
    },
    create: {
      email: opts.email,
      password: hashed,
      firstName: opts.firstName,
      lastName: opts.lastName,
      phoneNumber: opts.phone,
      role: UserRole.USER,
      isVerified: true,
      isPhoneVerified: true,
      isEmailVerified: true,
      isOnboarded: true,
      isPassengerOnboarded: true,
      isDriverOnboarded: opts.isDriver,
      termsAccepted: true,
      dateOfBirth: dob,
      referralCode: code(opts.isDriver ? "DRV" : "PSG"),
      isAvailableForRideRequest: opts.isDriver,
      licenseNumber: opts.isDriver ? `RW-DL-${opts.email.split("@")[0].toUpperCase()}` : null,
      drivingExperience: opts.isDriver ? "5 years" : null,
      emergencyContactName: "Jane Doe",
      emergencyContactPhone: "+250788000999",
    },
  });
}

async function main() {
  console.log(`🌱 Seeding test users (password for all: ${PASSWORD})`);

  // Passenger
  const passenger = await upsertUser({ ...PASSENGER, isDriver: false });
  console.log(`✅ Passenger: ${passenger.email}`);

  // Drivers + vehicles
  for (let i = 0; i < DRIVERS.length; i++) {
    const spec = DRIVERS[i];
    const point = KIGALI_POINTS[i % KIGALI_POINTS.length];

    const driver = await upsertUser({
      email: spec.email,
      firstName: spec.firstName,
      lastName: spec.lastName,
      phone: spec.phone,
      isDriver: true,
    });

    // Replace existing vehicles for idempotent re-runs
    await prisma.vehicle.deleteMany({ where: { userId: driver.id } });

    const pickup = await prisma.location.create({
      data: {
        country: "Rwanda",
        region: "Kigali",
        city: "Kigali",
        address: point.address,
        locationName: point.name,
        latitude: point.lat,
        longitude: point.lng,
      },
    });

    await prisma.vehicle.create({
      data: {
        userId: driver.id,
        make: spec.vehicle.make,
        model: spec.vehicle.model,
        year: spec.vehicle.year,
        color: spec.vehicle.color,
        plateNumber: spec.vehicle.plateNumber,
        category: spec.vehicle.category,
        capacity: spec.vehicle.capacity,
        verified: true,
        pickupLocationId: pickup.id,
      },
    });

    console.log(`✅ Driver: ${driver.email} (${spec.vehicle.make} ${spec.vehicle.model}, ${spec.vehicle.plateNumber})`);
  }

  console.log("🎉 Test users seeded.");
}

main()
  .catch((e) => {
    console.error("❌ seed.test-users failed", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
