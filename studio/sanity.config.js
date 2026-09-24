import {defineConfig} from "sanity";
import {structureTool} from "sanity/structure";
import {schemaTypes} from "./schemaTypes";

export default defineConfig({
  name: "cryptonym-desk",
  title: "Cryptonym Desk corpus",
  projectId: "en9phc0q",
  dataset: "production",
  plugins: [structureTool()],
  schema: {types: schemaTypes},
});
