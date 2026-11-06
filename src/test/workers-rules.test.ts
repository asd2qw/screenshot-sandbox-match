import { describe, expect, it } from "vitest";
import { MAX_WORKERS, canAddWorker, validateWorkerInput } from "@/lib/workers-rules";

describe("worker rules", () => {
  it("allows at most 15 workers", () => {
    expect(MAX_WORKERS).toBe(15);
    expect(canAddWorker(14)).toBe(true);
    expect(canAddWorker(15)).toBe(false);
  });

  it("requires a password of at least 8 characters", () => {
    const base = { fullName: "Juan", email: "juan@example.com", password: "1234567", canRegisterExpenses: false, canRegisterMaterials: false };
    expect(validateWorkerInput(base)).not.toBeNull();
    expect(validateWorkerInput({ ...base, password: "12345678" })).toBeNull();
  });
});
