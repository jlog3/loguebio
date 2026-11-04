# @repo/suite

What every LogueBio app needs to know about the others, in one place:

- `TOOLS`: every tool's slug, name and dev port
- `homeUrl()` / `toolUrl(slug)`: localhost ports in `npm run dev`, `loguebio.com` and
  `<slug>.loguebio.com` otherwise (override the home address with
  `NEXT_PUBLIC_LOGUEBIO_HOME_URL`)
- `<SuiteNav />`: the "← All tools" link each tool shows, fixed in a corner

```tsx
import { SuiteNav } from '@repo/suite';

<body>
  <SuiteNav />                                {/* bottom-right, dark */}
  {children}
</body>

<SuiteNav placement="top-right" theme="light" />
```

Plain JavaScript with its own styles, so it needs no build step and works with
Tailwind, CSS modules or neither. Changing a port means changing it here and in
that app's `dev` script (`next dev -p <port>`).
