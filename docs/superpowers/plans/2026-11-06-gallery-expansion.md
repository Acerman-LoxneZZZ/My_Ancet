# Gallery expansion implementation plan

**Goal.** Add «ДАЛЬ» and «3D-репетитор» as stops with live demos, then publish the verified static build.

**Architecture.** Append two rooms before the finale. Reuse the existing screen, navigation and showcase components. Load exhibit assets near their stops and mount one demo at a time. Keep the existing Wordflow case reachable by its direct link.

**Tech stack.** React, TypeScript, Three.js, Vite and Cloudflare.

- [x] Extend the chapter list, camera rail and architecture. Verify the existing and new stops in both aspect ratios and keep the finale reachable.
- [x] Import only the public builds from the two upstream repositories. Capture WebP covers from the working demos and record the upstream revisions.
- [x] Load the current and upcoming exhibits independently. Check navigation on a throttled connection, failed exhibit requests and demo disposal.
- [x] Run the tests and production build. Exercise the two showcases at desktop and mobile widths and confirm their files are first requested on opening.
- [x] Publish the verified build to a temporary Cloudflare Worker and check the public home, case and demo URLs.
