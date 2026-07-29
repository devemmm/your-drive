import { seedTestFixtures } from "../src/services/testSeed.service";

seedTestFixtures()
  .then((r) => {
    // eslint-disable-next-line no-console
    console.log("Test fixtures seeded:", JSON.stringify(r, null, 2));
    process.exit(0);
  })
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  });
