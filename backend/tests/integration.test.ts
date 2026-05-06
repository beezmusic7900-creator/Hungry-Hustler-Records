import { describe, test, expect } from "bun:test";
import { api, authenticatedApi, signUpTestUser, expectStatus, createTestFile } from "./helpers";

describe("API Integration Tests", () => {
  let authToken: string;
  let artistId: string;
  let merchId: string;

  // ===== Public Artists Endpoints =====

  test("GET /api/artists - should return all artists", async () => {
    const res = await api("/api/artists");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data).toHaveProperty("artists");
    expect(Array.isArray(data.artists)).toBe(true);
  });

  test("GET /api/artists/{id} - should return 404 for nonexistent artist", async () => {
    const res = await api("/api/artists/00000000-0000-0000-0000-000000000000");
    await expectStatus(res, 404);
  });

  // ===== Public Merch Endpoints =====

  test("GET /api/merch - should return all merch items", async () => {
    const res = await api("/api/merch");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data).toHaveProperty("items");
    expect(Array.isArray(data.items)).toBe(true);
  });

  test("GET /api/merch/{id} - should return 404 for nonexistent merch", async () => {
    const res = await api("/api/merch/00000000-0000-0000-0000-000000000000");
    await expectStatus(res, 404);
  });

  // ===== Public Content Endpoints =====

  test("GET /api/home - should return home content", async () => {
    const res = await api("/api/home");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data).toHaveProperty("id");
  });

  test("GET /api/about - should return about content", async () => {
    const res = await api("/api/about");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data).toHaveProperty("id");
  });

  // ===== Authentication Setup =====

  test("Sign up test user for admin tests", async () => {
    const { token, user } = await signUpTestUser();
    authToken = token;
    expect(authToken).toBeDefined();
    expect(user.id).toBeDefined();
  });

  // ===== Admin Artists CRUD =====

  test("POST /api/admin/artists - should create artist", async () => {
    const res = await authenticatedApi("/api/admin/artists", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Artist",
        bio: "A test artist",
        display_order: 1,
        is_featured: false,
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("name");
    artistId = data.id;
  });

  test("GET /api/artists/{id} - should return created artist", async () => {
    const res = await api(`/api/artists/${artistId}`);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBe(artistId);
    expect(data.name).toBe("Test Artist");
  });

  test("PUT /api/admin/artists/{id} - should update artist", async () => {
    const res = await authenticatedApi(`/api/admin/artists/${artistId}`, authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Updated Artist",
        bio: "Updated bio",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBe(artistId);
    expect(data.name).toBe("Updated Artist");
  });

  test("DELETE /api/admin/artists/{id} - should delete artist", async () => {
    const res = await authenticatedApi(`/api/admin/artists/${artistId}`, authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data).toHaveProperty("success");
  });

  test("GET /api/artists/{id} - should return 404 after deletion", async () => {
    const res = await api(`/api/artists/${artistId}`);
    await expectStatus(res, 404);
  });

  // ===== Admin Merch CRUD =====

  test("POST /api/admin/merch - should create merch", async () => {
    const res = await authenticatedApi("/api/admin/merch", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Merch",
        price: 29.99,
        description: "A test merch item",
        category: "Apparel",
        in_stock: true,
        display_order: 1,
        is_featured: false,
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("name");
    merchId = data.id;
  });

  test("GET /api/merch/{id} - should return created merch", async () => {
    const res = await api(`/api/merch/${merchId}`);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBe(merchId);
    expect(data.name).toBe("Test Merch");
  });

  test("PUT /api/admin/merch/{id} - should update merch", async () => {
    const res = await authenticatedApi(`/api/admin/merch/${merchId}`, authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Updated Merch",
        price: 39.99,
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBe(merchId);
    expect(data.name).toBe("Updated Merch");
  });

  test("DELETE /api/admin/merch/{id} - should delete merch", async () => {
    const res = await authenticatedApi(`/api/admin/merch/${merchId}`, authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data).toHaveProperty("success");
  });

  test("GET /api/merch/{id} - should return 404 after deletion", async () => {
    const res = await api(`/api/merch/${merchId}`);
    await expectStatus(res, 404);
  });

  // ===== Admin Content Endpoints =====

  test("PUT /api/admin/home - should update home content", async () => {
    const res = await authenticatedApi("/api/admin/home", authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hero_title: "Welcome",
        hero_subtitle: "To our store",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data).toHaveProperty("id");
  });

  test("GET /api/home - should return updated home content", async () => {
    const res = await api("/api/home");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.hero_title).toBe("Welcome");
    expect(data.hero_subtitle).toBe("To our store");
  });

  test("PUT /api/admin/about - should update about content", async () => {
    const res = await authenticatedApi("/api/admin/about", authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "We are a music platform",
        mission: "To support artists",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data).toHaveProperty("id");
  });

  test("GET /api/about - should return updated about content", async () => {
    const res = await api("/api/about");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.description).toBe("We are a music platform");
    expect(data.mission).toBe("To support artists");
  });

  // ===== File Upload =====

  test("POST /api/admin/upload - should upload file", async () => {
    const form = new FormData();
    form.append("file", createTestFile());

    const res = await authenticatedApi("/api/admin/upload", authToken, {
      method: "POST",
      body: form,
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data).toHaveProperty("url");
  });

  // ===== Unauthenticated Admin Access =====

  test("POST /api/admin/artists - should return 401 without auth", async () => {
    const res = await api("/api/admin/artists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Unauthorized Artist" }),
    });
    await expectStatus(res, 401);
  });

  test("POST /api/admin/merch - should return 401 without auth", async () => {
    const res = await api("/api/admin/merch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Unauthorized Merch", price: 10 }),
    });
    await expectStatus(res, 401);
  });

  test("PUT /api/admin/home - should return 401 without auth", async () => {
    const res = await api("/api/admin/home", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hero_title: "Unauthorized" }),
    });
    await expectStatus(res, 401);
  });

  test("PUT /api/admin/about - should return 401 without auth", async () => {
    const res = await api("/api/admin/about", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "Unauthorized" }),
    });
    await expectStatus(res, 401);
  });

  test("POST /api/admin/upload - should return 401 without auth", async () => {
    const form = new FormData();
    form.append("file", createTestFile());

    const res = await api("/api/admin/upload", {
      method: "POST",
      body: form,
    });
    await expectStatus(res, 401);
  });

  // ===== Not Found Tests =====

  test("PUT /api/admin/artists/{id} - should return 404 for nonexistent artist", async () => {
    const res = await authenticatedApi("/api/admin/artists/00000000-0000-0000-0000-000000000000", authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated" }),
    });
    await expectStatus(res, 404);
  });

  test("DELETE /api/admin/artists/{id} - should return 404 for nonexistent artist", async () => {
    const res = await authenticatedApi("/api/admin/artists/00000000-0000-0000-0000-000000000000", authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 404);
  });

  test("PUT /api/admin/merch/{id} - should return 404 for nonexistent merch", async () => {
    const res = await authenticatedApi("/api/admin/merch/00000000-0000-0000-0000-000000000000", authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated" }),
    });
    await expectStatus(res, 404);
  });

  test("DELETE /api/admin/merch/{id} - should return 404 for nonexistent merch", async () => {
    const res = await authenticatedApi("/api/admin/merch/00000000-0000-0000-0000-000000000000", authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 404);
  });
});
