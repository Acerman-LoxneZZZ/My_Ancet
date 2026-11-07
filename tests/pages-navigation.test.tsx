import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { NavigationProvider, PortfolioLink } from "../src/navigation/NavigationProvider";
import { publicUrl } from "../src/lib/publicUrl";

afterEach(() => vi.unstubAllEnvs());

describe("deployment under a repository path", () => {
  it("keeps assets at the root during local development", () => {
    vi.stubEnv("BASE_URL", "/");
    expect(publicUrl("/assets/models/gallery-watch.glb")).toBe("/assets/models/gallery-watch.glb");
  });

  it("prefixes models and demos for project hosting", () => {
    vi.stubEnv("BASE_URL", "/My_Ancet/");
    expect(publicUrl("/assets/models/gallery-watch.glb")).toBe("/My_Ancet/assets/models/gallery-watch.glb");
    expect(publicUrl("demos/castle/index.html")).toBe("/My_Ancet/demos/castle/index.html");
  });

  it("includes the router basename in links opened in a new tab", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter basename="/My_Ancet/" initialEntries={["/My_Ancet/"]}>
        <NavigationProvider>
          <PortfolioLink to="/work/castle?view=gallery#main">Castle</PortfolioLink>
          <PortfolioLink to="/">Home</PortfolioLink>
        </NavigationProvider>
      </MemoryRouter>,
    );
    expect(html).toContain('href="/My_Ancet/work/castle?view=gallery#main"');
    expect(html).toContain('href="/My_Ancet/"');
  });
});
