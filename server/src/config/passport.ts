// import passport from "passport";
// import { Strategy as GoogleStrategy } from "passport-google-oauth20";
// import { Strategy as AppleStrategy } from "passport-apple";
// import { prisma } from "./database";
// import { generateToken } from "../utils/generateToken";
// import { logger } from "../utils/logger";
// import { generateReferralCode } from "../utils/generateReferralCode";
// Only configure Google OAuth if credentials are provided
// if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
//   passport.use(
//     new GoogleStrategy(
//       {
//         clientID: process.env.GOOGLE_CLIENT_ID,
//         clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//         callbackURL: "/api/v1/auth/google/callback",
//       },
//       async (accessToken, refreshToken, profile, done) => {
//         try {
//           let user = await prisma.user.findUnique({
//             where: { googleId: profile.id },
//           });

//           if (!user) {
//             user = await prisma.user.create({
//               data: {
//                 googleId: profile.id,
//                 email: profile.emails![0].value,
//                 name: profile.displayName,
//                 password: "", // Empty password for OAuth users
//                 isVerified: true, // Auto-verify OAuth users
//                 roles: ["PASSENGER"], // Default role
//                 referralCode: await generateReferralCode(),
//               },
//             });
//           }

//           const token = generateToken(user);
//           return done(null, { user, token });
//         } catch (error) {
//           return done(error as Error);
//         }
//       }
//     )
//   );
//   logger.info("Google OAuth strategy configured");
// } else {
//   logger.warn("Google OAuth credentials not found, strategy not configured");
// }

// Only configure Apple OAuth if credentials are provided
// if (
//   process.env.APPLE_CLIENT_ID &&
//   process.env.APPLE_TEAM_ID &&
//   process.env.APPLE_KEY_ID &&
//   process.env.APPLE_PRIVATE_KEY_LOCATION
// ) {
//   passport.use(
//     new AppleStrategy(
//       {
//         clientID: process.env.APPLE_CLIENT_ID,
//         teamID: process.env.APPLE_TEAM_ID,
//         keyID: process.env.APPLE_KEY_ID,
//         privateKeyLocation: process.env.APPLE_PRIVATE_KEY_LOCATION,
//         callbackURL: "/api/v1/auth/apple/callback",
//         passReqToCallback: true,
//       },
//       async (req, accessToken, refreshToken, idToken, profile, done) => {
//         try {
//           let user = await prisma.user.findUnique({
//             where: { appleId: profile.id },
//           });

//           if (!user) {
//             user = await prisma.user.create({
//               data: {
//                 appleId: profile.id,
//                 email: profile.email!,
//                 name: profile.name?.firstName + " " + profile.name?.lastName,
//                 password: "",
//                 isVerified: true,
//                 roles: ["PASSENGER"],
//                 referralCode: await generateReferralCode(),
//               },
//             });
//           }

//           const token = generateToken(user);
//           return done(null, { user, token });
//         } catch (error) {
//           return done(error as Error);
//         }
//       }
//     )
//   );
//   logger.info("Apple OAuth strategy configured");
// } else {
//   logger.warn("Apple OAuth credentials not found, strategy not configured");
// }

// export default passport;
