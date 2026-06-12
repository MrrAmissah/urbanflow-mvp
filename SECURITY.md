# Security

## Reporting Issues

If you find a security issue, do not open a public GitHub issue with exploit details. Contact the project owner privately.

## Current MVP Security Notes

- Image analysis currently runs in the browser.
- Uploaded images are not sent to a backend in the current implementation.
- The review queue is browser-only state and is not persisted.
- No authentication is currently implemented.
- No private API keys are required for the current MVP.

## Sensitive Files

Do not commit:

```txt
.env
.env.local
.vercel/
node_modules/
.next/
```

## Future Storage Considerations

When adding Vercel Blob or a database:

- Keep storage tokens in environment variables.
- Do not expose write tokens to the browser.
- Validate file type and size before upload.
- Consider private storage for sensitive inspection data.
- Add authentication before storing real customer/property inspection records.
