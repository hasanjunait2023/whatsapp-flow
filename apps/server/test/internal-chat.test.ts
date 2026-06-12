import { describe, it, expect, beforeAll } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();

const { sqlite } = await import("../src/db/index.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { INTERNAL_CHAT_HANDLERS: H } = await import("../src/routes/internal-chat-fns.js");

const TA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const TB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const ctx = (tenantId: string, userId: string) => ({ userId, tenantId, isAdmin: false }) as any;

beforeAll(() => {
  runMigrations();
  for (const t of [TA, TB]) {
    sqlite.prepare("INSERT INTO tenants (id, name, owner_id) VALUES (?, ?, 'o')").run(t, t);
  }
});

describe("Internal Chat — membership-scoped authz", () => {
  let roomId = "";

  it("creates a direct room with both members", async () => {
    const res = await H["internal-chat-create-direct"]({ other_user_id: "userA2" }, ctx(TA, "userA1"));
    expect(res.error).toBeNull();
    roomId = (res.data as { id: string }).id;
    const count = sqlite
      .prepare("SELECT COUNT(*) AS n FROM internal_chat_members WHERE room_id = ?")
      .get(roomId) as { n: number };
    expect(count.n).toBe(2);
  });

  it("find-or-create returns the same room (no duplicate)", async () => {
    const res = await H["internal-chat-create-direct"]({ other_user_id: "userA2" }, ctx(TA, "userA1"));
    expect((res.data as { id: string; existed: boolean }).existed).toBe(true);
  });

  it("a member sees the room; a non-member in the same tenant does not", async () => {
    const member = await H["internal-chat-list-rooms"]({}, ctx(TA, "userA1"));
    expect((member.data as unknown[]).length).toBe(1);
    const outsider = await H["internal-chat-list-rooms"]({}, ctx(TA, "userA3"));
    expect((outsider.data as unknown[]).length).toBe(0);
  });

  it("a member can send; a non-member (same tenant) cannot", async () => {
    const okSend = await H["internal-chat-send"]({ room_id: roomId, content: "hi" }, ctx(TA, "userA1"));
    expect(okSend.error).toBeNull();
    const blocked = await H["internal-chat-send"]({ room_id: roomId, content: "sneak" }, ctx(TA, "userA3"));
    expect(blocked.error?.message).toMatch(/Not a member/i);
  });

  it("another tenant cannot read the room's messages (cross-tenant)", async () => {
    const res = await H["internal-chat-list-messages"]({ room_id: roomId }, ctx(TB, "userB1"));
    expect(res.error?.message).toMatch(/Room not found/i);
  });

  it("non-admin cannot add members; group admin can", async () => {
    const grp = await H["internal-chat-create-group"](
      { name: "Team", member_ids: ["userA2"] },
      ctx(TA, "userA1"),
    );
    const gid = (grp.data as { id: string }).id;
    // userA2 is a non-admin member -> cannot add
    const denied = await H["internal-chat-add-member"]({ room_id: gid, user_id: "userA4" }, ctx(TA, "userA2"));
    expect(denied.error?.message).toMatch(/admin/i);
    // creator (admin) can add
    const allowed = await H["internal-chat-add-member"]({ room_id: gid, user_id: "userA4" }, ctx(TA, "userA1"));
    expect(allowed.error).toBeNull();
  });
});
