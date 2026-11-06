import { describe, expect, it, vi } from "vitest";
import { changeWorkerAccess } from "@/lib/worker-access";

describe("worker access changes", () => {
  it("denies profile access before banning a worker", async () => {
    const calls: string[] = [];
    await changeWorkerAccess(false, {
      setProfileActive: async (active) => { calls.push(`profile:${active}`); },
      setAuthActive: async (active) => { calls.push(`auth:${active}`); },
    });
    expect(calls).toEqual(["profile:false", "auth:false"]);
  });
  it("never reports success when profile deactivation fails", async () => {
    const auth = vi.fn();
    await expect(changeWorkerAccess(false, {
      setProfileActive: async () => { throw new Error("profile failed"); },
      setAuthActive: auth,
    })).rejects.toThrow("profile failed");
    expect(auth).not.toHaveBeenCalled();
  });
  it("keeps profile access denied when the ban fails", async () => {
    const profile = vi.fn().mockResolvedValue(undefined);
    await expect(changeWorkerAccess(false, {
      setProfileActive: profile,
      setAuthActive: async () => { throw new Error("ban failed"); },
    })).rejects.toThrow("ban failed");
    expect(profile.mock.calls).toEqual([[false]]);
  });
  it("unbans before enabling profile access", async () => {
    const calls: string[] = [];
    await changeWorkerAccess(true, {
      setProfileActive: async (active) => { calls.push(`profile:${active}`); },
      setAuthActive: async (active) => { calls.push(`auth:${active}`); },
    });
    expect(calls).toEqual(["auth:true", "profile:true"]);
  });
  it("does not enable a profile if unbanning fails", async () => {
    const profile = vi.fn();
    await expect(changeWorkerAccess(true, {
      setProfileActive: profile,
      setAuthActive: async () => { throw new Error("unban failed"); },
    })).rejects.toThrow("unban failed");
    expect(profile).not.toHaveBeenCalled();
  });
  it("re-bans after a failed profile activation", async () => {
    const auth = vi.fn().mockResolvedValue(undefined);
    await expect(changeWorkerAccess(true, {
      setProfileActive: async () => { throw new Error("profile failed"); },
      setAuthActive: auth,
    })).rejects.toThrow();
    expect(auth.mock.calls).toEqual([[true], [false]]);
  });
  it("reports failed compensation rather than claiming the account is blocked", async () => {
    const auth = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("ban failed"));
    await expect(changeWorkerAccess(true, {
      setProfileActive: async () => { throw new Error("profile failed"); },
      setAuthActive: auth,
    })).rejects.toThrow("Reintenta desactivar");
    expect(auth.mock.calls).toEqual([[true], [false]]);
  });
});