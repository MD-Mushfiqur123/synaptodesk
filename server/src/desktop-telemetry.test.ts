import { describe, expect, test } from "bun:test";
import { desktopTelemetryProperties } from "./desktop-telemetry";

describe("desktop runtime metadata", () => {
  test("leaves ordinary server deployments untagged", () => {
    expect(desktopTelemetryProperties({})).toEqual({});
    expect(
      desktopTelemetryProperties({ SYNAPTODESK_DISTRIBUTION: "server" }),
    ).toEqual({});
  });

  test("carries only the shell's bounded metadata", () => {
    expect(
      desktopTelemetryProperties({
        SYNAPTODESK_DISTRIBUTION: "desktop",
        SYNAPTODESK_VERSION: "0.0.9",
        SYNAPTODESK_PLATFORM: "macos",
        SYNAPTODESK_ARCH: "aarch64",
        SYNAPTODESK_OS_VERSION: "15.6.1",
        SYNAPTODESK_ENGINE: "podman",
        OPENAI_API_KEY: "synthetic-secret",
        CPK_TELEMETRY_ID: "identity-belongs-in-the-transport",
        HOME: "/Users/private-name",
        SYNAPTODESK_BASE_URL: "https://private.example",
      }),
    ).toEqual({
      synaptodesk_distribution: "desktop",
      synaptodesk_version: "0.0.9",
      synaptodesk_platform: "macos",
      synaptodesk_arch: "aarch64",
      synaptodesk_os_version: "15.6.1",
      synaptodesk_engine: "podman",
    });
  });

  test.each([
    "/Users/private-name",
    "private.example",
    "1.2-private-name",
    "1.2\nsecret",
    "1.2\n",
    "1.2.3.4.5",
    "1".repeat(40),
  ])("rejects arbitrary text in every metadata field: %s", (value) => {
    expect(
      desktopTelemetryProperties({
        SYNAPTODESK_DISTRIBUTION: "desktop",
        SYNAPTODESK_VERSION: value,
        SYNAPTODESK_OS_VERSION: value,
        SYNAPTODESK_PLATFORM: value,
        SYNAPTODESK_ARCH: value,
        SYNAPTODESK_ENGINE: value,
      }),
    ).toEqual({ synaptodesk_distribution: "desktop" });
  });
});
