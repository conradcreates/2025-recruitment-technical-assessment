import express, { Request, Response } from "express";

// ==== Type Definitions, feel free to add or modify ==========================
interface cookbookEntry {
  name: string;
  type: string;
}

interface requiredItem {
  name: string;
  quantity: number;
}

interface recipe extends cookbookEntry {
  requiredItems: requiredItem[];
}

interface ingredient extends cookbookEntry {
  cookTime: number;
}

// =============================================================================
// ==== HTTP Endpoint Stubs ====================================================
// =============================================================================
const app = express();
app.use(express.json());

// Store your recipes here!
const cookbook: Record<string, cookbookEntry> = {};

// Task 1 helper (don't touch)
app.post("/parse", (req:Request, res:Response) => {
  const { input } = req.body;

  const parsed_string = parse_handwriting(input)
  if (parsed_string == null) {
    res.status(400).send("this string is cooked");
    return;
  } 
  res.json({ msg: parsed_string });
  return;
  
});

// [TASK 1] ====================================================================
// Takes in a recipeName and returns it in a form that 
const parse_handwriting = (recipeName: string): string | null => {
  if (!recipeName) return null;
  
  let parsedName = recipeName.replace(/[-_]+/g, ' ');
  parsedName = parsedName.replace(/[^a-zA-Z\s]/g, '');
  parsedName = parsedName
      .split(' ')
      .filter(word => word.trim() !== '')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  
  if (parsedName.length <= 0) return null;
  
  return parsedName;
};

// [TASK 2] ====================================================================
// Endpoint that adds a CookbookEntry to your magical cookbook
app.post("/entry", (req:Request, res:Response) => {
  const entry = req.body;

  if (!entry.name || !entry.type) {
    res.status(400).send("name and type are required");
    return;
  }
  
  if (entry.type !== "recipe" && entry.type !== "ingredient") {
    res.status(400).send("type must be recipe or ingredient");
    return;
  }
  
  if (cookbook[entry.name]) {
    res.status(400).send("name must be unique");
    return;
  }
  
  if (entry.type === "ingredient") {
    if (typeof entry.cookTime !== "number" || entry.cookTime < 0) {
      res.status(400).send("cookTime must be a non-negative number");
      return;
    }
  }

  if (entry.type === "recipe") {
    const seenItems = new Set();
    for (const item of entry.requiredItems) {
      if (seenItems.has(item.name)) {
        res.status(400).send("recipe requiredItems must have unique names");
        return;
      }
      seenItems.add(item.name);
    }
  }

  cookbook[entry.name] = entry;
  res.status(200).send({});
});

// [TASK 3] ====================================================================
// Endpoint that returns a summary of a recipe that corresponds to a query name
app.get("/summary", (req:Request, res:Request) => {
  // TODO: implement me
  const { name } = req.query;
  if (!name || typeof name !== "string") {
    res.status(400).send("name parameter is required");
    return;
  }

  const getRecipeSummary = (recipeName: string): { name: string; cookTime: number; ingredients: requiredItem[] } | null => {
    const recipe = cookbook[recipeName] as recipe;
    if (!recipe || recipe.type !== "recipe") return null;

    let cookTime = 0;
    const ingredientMap = new Map<string, number>();

    const processItems = (items: requiredItem[]) => {
      for (const item of items) {
        const entry = cookbook[item.name];
        if (!entry) {
          throw new Error("missing ingredient/recipe in cookbook");
        }
        if (entry.type === "ingredient") {
          const ingredient = entry as ingredient;
          cookTime += ingredient.cookTime * item.quantity;
          ingredientMap.set(item.name, (ingredientMap.get(item.name) || 0) + item.quantity);
        } else if (entry.type === "recipe") {
          processItems((entry as recipe).requiredItems.map(i => ({ name: i.name, quantity: i.quantity * item.quantity })));
        }
      }
    };

    try {
      processItems(recipe.requiredItems);
    } catch (error) {
      res.status(400).send("recipe contains missing items in cookbook");
      return;
    }

    const ingredients = Array.from(ingredientMap.entries()).map(([name, quantity]) => ({ name, quantity }));
    res.json({ name: recipe.name, cookTime, ingredients });
  };

  const summary = getRecipeSummary(name);
  if (!summary) {
    res.status(400).send("recipe not found or is invalid");
    return;
  }
  res.json(summary);

});

// =============================================================================
// ==== DO NOT TOUCH ===========================================================
// =============================================================================
const port = 8080;
app.listen(port, () => {
  console.log(`Running on: http://127.0.0.1:8080`);
});
