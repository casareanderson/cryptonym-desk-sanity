import {SanityApp} from "@sanity/sdk-react";
import {Queue} from "./Queue.jsx";
import "./App.css";

// Inside the dashboard the app is signed in as the dashboard user. For a local
// headless run (screenshots, no dashboard) a token can be supplied with
// SANITY_APP_DEV_TOKEN - dev server only, never set for `sanity build`/deploy.
const devToken = import.meta.env.DEV ? import.meta.env.SANITY_APP_DEV_TOKEN : undefined;

const config = [{
  projectId: "en9phc0q",
  dataset: "production",
  ...(devToken ? {auth: {token: devToken}} : {}),
}];

export default function App() {
  return (
    <SanityApp config={config} fallback={<p className="loading">Opening the review queue…</p>}>
      <Queue />
    </SanityApp>
  );
}
