import {defineConfig} from "sanity";
import {structureTool} from "sanity/structure";
import {schemaTypes} from "./schemaTypes";
import {workflowActions} from "./actions.jsx";

export default defineConfig({
  name: "cryptonym-desk",
  title: "Cryptonym Desk corpus",
  projectId: "en9phc0q",
  dataset: "production",
  plugins: [structureTool()],
  schema: {types: schemaTypes},
  document: {
    actions: (prev, {schemaType}) => (schemaType === "wordProposal" ? [...workflowActions, ...prev] : prev),
  },
});
