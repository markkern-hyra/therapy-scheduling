import { describe, expect, it } from "vitest";
import { initials } from "@/components/ui/avatar";

describe("Avatar: ініціали", () => {
  it("перші літери двох перших слів імені; з email — з частини до @", () => {
    expect(initials("Client Seven")).toBe("CS");
    expect(initials("Scheduler One Two")).toBe("SO");
    expect(initials("guardian")).toBe("GU");
    expect(initials("scheduler1@example.test")).toBe("SC");
    expect(initials("  ")).toBe("?");
  });
});
