export async function register() {
  // Only run in Node.js runtime (not Edge), and only in dev/prod (not test)
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV !== "test"
  ) {
    const { initScheduler } = await import("./lib/scheduler");
    await initScheduler();
  }
}
