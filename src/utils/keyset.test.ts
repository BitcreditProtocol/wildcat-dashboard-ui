import { describe, expect, it, vi } from "vitest"
import { serializeKeysetId } from "./keyset"

describe("serializeKeysetId", () => {
  it("returns input as-is when id is already a string", () => {
    expect(serializeKeysetId("abc123")).toBe("abc123")
  })

  it("serializes Version00 with V1 bytes", () => {
    const id = { version: "Version00", id: { V1: [0, 1, 255] } }
    expect(serializeKeysetId(id as never)).toBe("000001ff")
  })

  it("serializes Version01 with V2 bytes", () => {
    const id = { version: "Version01", id: { V2: [10, 11, 12] } }
    expect(serializeKeysetId(id as never)).toBe("010a0b0c")
  })

  it("returns empty string for malformed id payload", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const id = { version: "Version00" }

    expect(serializeKeysetId(id as never)).toBe("")
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it("returns empty string when id bytes shape is invalid", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const id = { version: "Version00", id: { invalid: [1, 2, 3] } }

    expect(serializeKeysetId(id as never)).toBe("")
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})
