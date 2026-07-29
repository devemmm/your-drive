import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Your-Drive API Documentation",
      version: "1.1.0",
      description:
        "Comprehensive API documentation for Your-Drive Backend.\n\nYour-Drive is a ride-sharing platform for drivers and passengers. All users are verified via their phone numbers. This documentation covers authentication, onboarding, ride management, and more.",
    },
    tags: [
      { name: "Public", description: "These are accessible by any user" },
      {
        name: "Authentication",
        description: "Authorizations endpoints for users",
      },
      { name: "Onboarding", description: "User onboarding management" },
      { name: "Admin", description: "Admin management endpoints" },
      { name: "Users", description: "User management endpoints" },
      { name: "Ratings", description: "Ratings and reviews management" },
      {
        name: "Subscriptions",
        description: "Subscription management for users and admins",
      },
      {
        name: "Vehicle Management",
        description: "Vehicle management and retrieval",
      },
      { name: "Ride Management", description: "Ride management" },
      { name: "Booking Management", description: "Ride booking endpoints" },
      { name: "Transactions", description: "Manage user transactions" },
      { name: "Card Management", description: "Manage user payment cards" },
      { name: "Chat", description: "Chat management and retrieval" },
      { name: "Notifications", description: "Notifications for users" },
      { name: "Moderation", description: "Content moderation endpoints" },
      {
        name: "Webhooks",
        description: "Webhook event handlers for external services",
      },
      {
        name: "Car Rentals",
        description: "Car rental management for renters and owners",
      },
      {
        name: "Chauffeur Services",
        description: "Chauffeur service management for passengers and drivers",
      },
    ],
    servers: [
      {
        url: process.env.BACKEND_URL || "https://Your-Drive-backend.onrender.com",
        description: "Staging server",
      },
      {
        url: `http://localhost:${process.env.PORT}`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/docs/**/*.ts", "./src/docs/**/*.js"],
};

export const swaggerSpec = swaggerJsdoc(options);
