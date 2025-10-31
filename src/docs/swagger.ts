import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Spa Appointment and Management System API",
      version: "1.0.0",
      description: `
        This documentation describes all endpoints for the Spa Management System.  
        Includes authentication, appointment management, services, and reports modules.
      `,
    },
    servers: [{ url: process.env.API_BASE_URL || "http://localhost:3000" }],
  },
  apis: ["./src/router/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
