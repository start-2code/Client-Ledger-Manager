import { Router } from "express";
import { db } from "@workspace/db";
import { dropdownOptionsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

router.get("/dropdown-options", async (req, res) => {
  try {
    const { category } = req.query;
    const query = db
      .select()
      .from(dropdownOptionsTable)
      .orderBy(asc(dropdownOptionsTable.sortOrder), asc(dropdownOptionsTable.value));

    const options = category
      ? await query.where(eq(dropdownOptionsTable.category, String(category)))
      : await query;

    res.json({ options });
  } catch (err) {
    req.log.error({ err }, "Failed to list dropdown options");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/dropdown-options", async (req, res) => {
  try {
    const { category, value, sortOrder } = req.body;
    if (!category || !value) {
      return res.status(400).json({ error: "category and value are required" });
    }
    const [option] = await db
      .insert(dropdownOptionsTable)
      .values({ category: String(category), value: String(value), sortOrder: Number(sortOrder ?? 0) })
      .returning();
    return res.status(201).json(option);
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "That option already exists in this category" });
    }
    req.log.error({ err }, "Failed to create dropdown option");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/dropdown-options/:id", async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const { value } = req.body;
    if (!value) {
      return res.status(400).json({ error: "value is required" });
    }
    const [option] = await db
      .update(dropdownOptionsTable)
      .set({ value: String(value) })
      .where(eq(dropdownOptionsTable.id, id))
      .returning();
    if (!option) return res.status(404).json({ error: "Option not found" });
    return res.json(option);
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "That option already exists in this category" });
    }
    req.log.error({ err }, "Failed to update dropdown option");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/dropdown-options/:id", async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    await db.delete(dropdownOptionsTable).where(eq(dropdownOptionsTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete dropdown option");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
