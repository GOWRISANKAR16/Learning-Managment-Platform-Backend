import request from "supertest";

jest.mock("../config/db", () => ({
  prisma: {},
}));

import { app } from "../app";

describe("Health endpoint", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("Root endpoint", () => {
  it("returns API info without auth", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "LMS API");
    expect(res.body).toHaveProperty("health", "/health");
  });
});

describe("404 handler", () => {
  it("returns JSON error for unknown route", async () => {
    const res = await request(app).get("/unknown-route");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: "Not found" } });
  });
});

