import { describe, expect, it } from "vitest";
import { countryName, statedAddress } from "./bill-participants";

describe("countryName", () => {
  it("names an ISO region code for the reader, in either case", () => {
    expect(countryName("GT", "en")).toBe("Guatemala");
    expect(countryName("at", "de")).toBe("Österreich");
  });

  it("returns anything that is not a region code as stated, without throwing", () => {
    expect(countryName("Austria", "en")).toBe("Austria");
    expect(countryName("GTM", "en")).toBe("GTM");
  });
});

describe("statedAddress", () => {
  it("joins the stated address with the country named, leaving out empty parts", () => {
    expect(statedAddress({ address: "Calle 5", zip: "03001", city: "Antigua", country: "GT" }, "en")).toBe(
      "Calle 5, 03001, Antigua, Guatemala"
    );
    expect(statedAddress({ address: "", city: "Antigua", country: "" }, "en")).toBe("Antigua");
  });
});
