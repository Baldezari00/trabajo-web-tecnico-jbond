import { createClient } from "@libsql/client";

export async function onRequest({ request, env }) {
  const db = createClient({
    url: env.TURSO_DB_URL,
    authToken: env.TURSO_DB_TOKEN,
  });

  try {
    if (request.method === "GET") {
      const rows = await db.execute("SELECT * FROM prices");
      return Response.json(rows.rows);
    }

    if (request.method === "POST") {
      const body = await request.json();
      await db.execute({
        sql: "INSERT INTO prices (service, price, time) VALUES (?, ?, ?)",
        args: [body.service, body.price, body.time],
      });
      return Response.json({ message: "OK" });
    }

    if (request.method === "PUT") {
      const body = await request.json();
      await db.execute({
        sql: "UPDATE prices SET service=?, price=?, time=? WHERE id=?",
        args: [body.service, body.price, body.time, body.id],
      });
      return Response.json({ message: "OK" });
    }

    if (request.method === "DELETE") {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get("id");

      await db.execute({
        sql: "DELETE FROM prices WHERE id=?",
        args: [id],
      });

      return Response.json({ message: "OK" });
    }

    return Response.json({ error: "Method Not Allowed" }, { status: 405 });

  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
