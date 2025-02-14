import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Product } from "./product.schema.js";

const addProduct = tool(
  async ({ name, price, category, inStock }) => {
    // Assuming Product model is already defined and imported
    await Product.create({ name, price, category, inStock });
    return `Product "${name}" added successfully!`;
  },
  {
    name: "add_product",
    description: "Add a new product",
    schema: z.object({
      name: z.string().describe("Product name"),
      price: z.number().describe("Product price"),
      category: z.string().describe("Product category"),
      inStock: z.boolean().default(true).describe("Availability in stock"),
    }),
  }
);

export const tools = [addProduct];
export const toolsByName = Object.fromEntries(
  tools.map((tool) => [tool.name, tool])
);
