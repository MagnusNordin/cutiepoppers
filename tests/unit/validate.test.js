import { describe, expect, it } from "vitest";
import { formatPhone, normalisePhone, normaliseZip, validateCheckout } from "../../src/js/lib/validate.js";

const valid = {
  name: "  Anna   Andersson ",
  phone: "070-123 45 67",
  email: "Anna@Example.se ",
  street: "Storgatan 1",
  zip: "12345",
  city: "Huddinge",
  message: "En present till Lisa",
};

describe("normalisePhone", () => {
  it("accepts Swedish mobile numbers in common formats", () => {
    for (const n of ["0701234567", "070-123 45 67", "+46 70 123 45 67", "0046701234567", "(070) 1234567"]) {
      expect(normalisePhone(n), n).toBe("0701234567");
    }
  });

  it("rejects landlines, short numbers and junk", () => {
    for (const n of ["08-123 456 78", "070123", "abc", "", undefined, 46701234567]) {
      expect(normalisePhone(n), String(n)).toBeNull();
    }
  });

  it("formats for display", () => {
    expect(formatPhone("0701234567")).toBe("070-123 45 67");
  });
});

describe("normaliseZip", () => {
  it("normalises five digits to NNN NN", () => {
    expect(normaliseZip("12345")).toBe("123 45");
    expect(normaliseZip("123 45")).toBe("123 45");
    expect(normaliseZip("1234")).toBeNull();
    expect(normaliseZip("12a45")).toBeNull();
  });
});

describe("validateCheckout", () => {
  it("accepts and cleans valid input", () => {
    const { values, errors } = validateCheckout(valid);
    expect(errors).toEqual({});
    expect(values).toEqual({
      name: "Anna Andersson",
      phone: "070-123 45 67",
      email: "anna@example.se",
      street: "Storgatan 1",
      zip: "123 45",
      city: "Huddinge",
      message: "En present till Lisa",
    });
  });

  it("reports every missing field in Swedish", () => {
    const { errors } = validateCheckout({});
    expect(Object.keys(errors).sort()).toEqual(["city", "email", "name", "phone", "street", "zip"]);
    expect(errors.phone).toContain("mobilnummer");
    expect(validateCheckout().errors.name).toBeDefined();
  });

  it("rejects bad e-mail addresses", () => {
    for (const email of ["anna", "anna@", "anna@x", "a b@c.se"]) {
      expect(validateCheckout({ ...valid, email }).errors.email, email).toBeDefined();
    }
  });

  it("limits lengths", () => {
    const long = "x".repeat(130);
    const { errors } = validateCheckout({ ...valid, name: long, street: long, city: long, message: "m".repeat(600) });
    expect(errors.name).toBe("Namnet är för långt.");
    expect(errors.street).toBe("Adressen är för lång.");
    expect(errors.city).toBe("Orten är för lång.");
    expect(errors.message).toContain("500");
  });

  it("treats non-string message as empty", () => {
    expect(validateCheckout({ ...valid, message: 5 }).values.message).toBe("");
  });
});
