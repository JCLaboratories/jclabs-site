# jclabs-site

Official website for [JC Laboratories](https://jclabs.tech) — jclabs.tech

## Structure

```
jclabs-site/
├── index.html          # Homepage
├── download.html       # Aleph Vault APK download + install guide
├── community.html      # Public key directory + dead drop board
├── privacy.html        # Privacy Policy
├── terms.html          # Terms of Service
├── assets/
│   ├── logo.jpg                  # JC Labs R&D company logo
│   ├── egaf-logo.svg             # EGAF framework logo
│   └── aleph_vault_beta.apk      # Aleph Vault release APK
├── css/
│   ├── main.css        # Shared styles — variables, nav, footer, buttons
│   ├── index.css       # Homepage-specific styles
│   ├── download.css    # Download page styles
│   ├── community.css   # Community page styles
│   └── docs.css        # Privacy & Terms styles
└── js/
    ├── nav.js          # Mobile navigation toggle
    └── community.js    # Firebase auth, directory, dead drop board logic
```

## Deployment

Deployed via **Cloudflare Pages** at [jclabs.tech](https://jclabs.tech).

Push to `main` branch triggers automatic deployment.

## Firebase

The community page uses Firebase (project: `alephvault-e9322`) for:
- Authentication (email/password — shared with Aleph Vault)
- Firestore collections: `community_directory`, `dead_drop`

### Firestore Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /community_directory/{doc} {
      allow read: if true;
      allow create: if request.auth != null;
      allow delete: if request.auth != null && request.auth.uid == resource.data.uid;
    }
    match /dead_drop/{doc} {
      allow read: if true;
      allow create: if true;
      allow delete: if false;
    }
  }
}
```

## Related Repos

- [JCLaboratories/egaf](https://github.com/JCLaboratories) — Entropy-Gated AI Framework (coming soon)
- Aleph Vault — private repo (Android app)
- Gaffer — private repo (EGAF AI assistant)

## License

© 2026 Justin Czap / JC Laboratories  
EGAF licensed under CC BY-NC 4.0. All other content proprietary.
