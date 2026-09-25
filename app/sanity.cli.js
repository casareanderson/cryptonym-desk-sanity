import {defineCliConfig} from "sanity/cli";

// A custom App SDK app, not a Studio: it runs inside the Sanity dashboard for
// the organisation and reads the same dataset the site is built from.
export default defineCliConfig({
  app: {organizationId: "omdh8fw7q", entry: "./src/App.jsx"},
});
