/** Only the desktop shell's closed metadata may join the runtime's existing events. */
export function desktopTelemetryProperties(
  env: Record<string, string | undefined> = process.env,
): Record<string, string> {
  if (env.SYNAPTODESK_DISTRIBUTION !== "desktop") return {};

  const properties: Record<string, string> = {
    synaptodesk_distribution: "desktop",
  };
  for (const [input, output, allowed] of [
    [
      "SYNAPTODESK_PLATFORM",
      "synaptodesk_platform",
      ["macos", "windows", "linux", "other"],
    ],
    ["SYNAPTODESK_ARCH", "synaptodesk_arch", ["aarch64", "x86_64", "other"]],
    ["SYNAPTODESK_ENGINE", "synaptodesk_engine", ["docker", "podman", "none"]],
  ] as const) {
    const value = env[input];
    if (value && allowed.some((item) => item === value))
      properties[output] = value;
  }
  for (const [input, output] of [
    ["SYNAPTODESK_VERSION", "synaptodesk_version"],
    ["SYNAPTODESK_OS_VERSION", "synaptodesk_os_version"],
  ] as const) {
    const value = env[input];
    if (
      value &&
      value.length <= 32 &&
      value.trim() === value &&
      /^\d+(?:\.\d+){1,3}$/.test(value)
    ) {
      properties[output] = value;
    }
  }
  return properties;
}
