/**
 * connectDB is now a no-op.
 * Data is stored in local JSON files under the `data/` directory.
 * This function is kept so existing API route imports don't break.
 */
export async function connectDB() {
  // no-op — JSON file storage requires no connection
}
