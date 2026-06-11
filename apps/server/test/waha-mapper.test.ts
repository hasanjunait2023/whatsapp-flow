import { describe, it, expect } from "vitest";
import { mapWahaMessage, stripSuffix } from "../src/waha/mapper.js";

/**
 * Unit tests for the WAHA payload → internal message mapper, covering each
 * content type, direction detection, LID handling, and timestamp conversion.
 */

const base = {
  id: "true_15551234567@c.us_ABC",
  timestamp: 1700000000,
  from: "15551234567@c.us",
  to: "98765@c.us",
  fromMe: false,
};

describe("mapWahaMessage", () => {
  it("maps a plain inbound text message", () => {
    const m = mapWahaMessage({ ...base, body: "hello there" });
    expect(m.direction).toBe("inbound");
    expect(m.waMessageId).toBe(base.id);
    expect(m.contentType).toBe("text");
    expect(m.content).toBe("hello there");
    expect(m.phone).toBe("15551234567");
    expect(m.waId).toBe("15551234567@c.us");
    expect(m.sentAt).toBe(new Date(1700000000 * 1000).toISOString());
  });

  it("detects outbound (fromMe) and uses the recipient as the chat partner", () => {
    const m = mapWahaMessage({ ...base, fromMe: true, body: "reply" });
    expect(m.direction).toBe("outbound");
    expect(m.chatId).toBe("98765@c.us");
    expect(m.phone).toBe("98765");
  });

  it("maps an image message with caption and downloadable media url", () => {
    const m = mapWahaMessage({
      ...base,
      body: "look",
      hasMedia: true,
      media: { url: "http://waha/api/files/x.jpg", mimetype: "image/jpeg", filename: null },
    });
    expect(m.contentType).toBe("image");
    expect(m.content).toBe("look");
    expect(m.mediaUrl).toBe("http://waha/api/files/x.jpg");
    expect(m.mediaMimeType).toBe("image/jpeg");
  });

  it("maps a webp media message as a sticker", () => {
    const m = mapWahaMessage({
      ...base,
      media: { url: "http://waha/s.webp", mimetype: "image/webp" },
    });
    expect(m.contentType).toBe("sticker");
  });

  it("maps a video message", () => {
    const m = mapWahaMessage({
      ...base,
      media: { url: "http://waha/v.mp4", mimetype: "video/mp4" },
    });
    expect(m.contentType).toBe("video");
  });

  it("maps an audio message", () => {
    const m = mapWahaMessage({
      ...base,
      media: { url: "http://waha/a.ogg", mimetype: "audio/ogg" },
    });
    expect(m.contentType).toBe("audio");
  });

  it("maps a document message with filename", () => {
    const m = mapWahaMessage({
      ...base,
      media: { url: "http://waha/d.pdf", mimetype: "application/pdf", filename: "invoice.pdf" },
    });
    expect(m.contentType).toBe("document");
    expect(m.mediaFilename).toBe("invoice.pdf");
  });

  it("maps a location message from nested _data", () => {
    const m = mapWahaMessage({
      ...base,
      _data: { Message: { locationMessage: { degreesLatitude: 12.5, degreesLongitude: 77.6, name: "HQ" } } },
    });
    expect(m.contentType).toBe("location");
    expect(m.locationLat).toBe("12.5");
    expect(m.locationLng).toBe("77.6");
    expect(m.content).toBe("HQ");
  });

  it("maps a top-level location object", () => {
    const m = mapWahaMessage({
      ...base,
      location: { latitude: 1.1, longitude: 2.2, address: "somewhere" },
    });
    expect(m.contentType).toBe("location");
    expect(m.locationLat).toBe("1.1");
    expect(m.content).toBe("somewhere");
  });

  it("flags @lid chats and strips the suffix to phone", () => {
    const m = mapWahaMessage({ ...base, from: "111222333@lid", body: "hi" });
    expect(m.isLid).toBe(true);
    expect(m.phone).toBe("111222333");
  });

  it("flags group chats", () => {
    const m = mapWahaMessage({ ...base, fromMe: true, to: "12345-678@g.us", body: "hi" });
    expect(m.isGroup).toBe(true);
  });

  it("falls back to now when timestamp is missing", () => {
    const before = Date.now();
    const m = mapWahaMessage({ ...base, timestamp: undefined, body: "x" });
    expect(new Date(m.sentAt).getTime()).toBeGreaterThanOrEqual(before - 1000);
  });
});

describe("stripSuffix", () => {
  it("strips all known WhatsApp chat suffixes", () => {
    expect(stripSuffix("15551234567@c.us")).toBe("15551234567");
    expect(stripSuffix("15551234567@s.whatsapp.net")).toBe("15551234567");
    expect(stripSuffix("111@lid")).toBe("111");
    expect(stripSuffix("12-34@g.us")).toBe("12-34");
  });
});
