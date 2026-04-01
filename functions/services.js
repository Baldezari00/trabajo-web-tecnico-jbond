import { createClient } from "@libsql/client";

export async function onRequest({ request, env }) {
  const db = createClient({
    url: env.TURSO_DB_URL,
    authToken: env.TURSO_DB_TOKEN,
  });

  try {
    if (request.method === "GET") {
      const rows = await db.execute("SELECT * FROM services");
      return Response.json(rows.rows);
    }

    if (request.method === "POST") {
      const body = await request.json();
      await db.execute({
        sql: "INSERT INTO services (name, icon, items, price) VALUES (?, ?, ?, ?)",
        args: [body.name, body.icon, body.items, body.price],
      });
      return Response.json({ message: "OK" });
    }

    if (request.method === "PUT") {
      const body = await request.json();
      await db.execute({
        sql: "UPDATE services SET name=?, icon=?, items=?, price=? WHERE id=?",
        args: [body.name, body.icon, body.items, body.price, body.id],
      });
      return Response.json({ message: "OK" });
    }

    if (request.method === "DELETE") {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get("id");

      await db.execute({
        sql: "DELETE FROM services WHERE id=?",
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
