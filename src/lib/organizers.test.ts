import { describe, expect, it } from "vitest";
import { lineUrl, organizerLinks, phoneUrl, telegramUrl, whatsappUrl } from "./organizers";

describe("contact links", () => {
  it("phone", () => {
    expect(phoneUrl("+66 81 234 5678")).toBe("tel:+66812345678");
    expect(phoneUrl("081-234-5678")).toBe("tel:0812345678");
    expect(phoneUrl("123")).toBeNull();
  });

  it("whatsapp", () => {
    expect(whatsappUrl("+66 81 234 5678")).toBe("https://wa.me/66812345678");
    expect(whatsappUrl("0812345678")).toBe("https://wa.me/66812345678");
    expect(whatsappUrl("+7 912 345-67-89")).toBe("https://wa.me/79123456789");
  });

  it("telegram", () => {
    expect(telegramUrl("@samui_badminton")).toBe("https://t.me/samui_badminton");
    expect(telegramUrl("t.me/samui_badminton")).toBe("https://t.me/samui_badminton");
    expect(telegramUrl("https://t.me/+invite")).toBe("https://t.me/+invite");
    expect(telegramUrl("ab")).toBeNull();
  });

  it("line", () => {
    expect(lineUrl("@yonexthailand")).toBe("https://line.me/R/ti/p/%40yonexthailand");
    expect(lineUrl("kz.samui")).toBe("https://line.me/ti/p/~kz.samui");
  });

  it("collects only filled contacts", () => {
    const links = organizerLinks({
      id: "1",
      name: "A",
      name_en: null,
      phone: "+66812345678",
      whatsapp: null,
      telegram: "@abcd",
      line_id: null,
    });
    expect(links.map((l) => l.kind)).toEqual(["phone", "telegram"]);
  });
});
