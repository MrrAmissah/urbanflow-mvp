# Contributing

## Development Workflow

1. Create a branch from `main`.
2. Install dependencies:

```bash
npm install
```

3. Start local development:

```bash
npm run dev
```

4. Run checks before opening a pull request:

```bash
npm run lint
npm run build
```

## Code Style

- Use TypeScript.
- Keep UI consistent with the existing card-based Team Urbanflow style.
- Prefer clear, small components before introducing new abstractions.
- Keep model and verdict logic easy to read.
- Avoid committing generated build folders such as `.next/`.

## Model Changes

When updating the Teachable Machine model:

1. Replace files in `public/model/`.
2. Confirm `model.json` references the correct weights file.
3. Update `docs/MODEL.md` if class names change.
4. Run a manual upload/analyze smoke test.

## Pull Request Checklist

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Upload flow still works
- [ ] Model loads successfully
- [ ] Review queue behavior is still correct
- [ ] Documentation updated if behavior changed
