# Voice Notes

Voice-powered note taking with AI categorization and multi-device sync.

## Structure

- `app/` - Vue 3 PWA frontend
- `api/` - Node.js sync server
- `dist/` - Built frontend (deployed to GitHub Pages)

## Development

### Frontend
```bash
cd app
npm install
npm run dev -- --host
```

### Backend
```bash
cd api
npm install
npm start
```

## Deployment

### Frontend (GitHub Pages)
```bash
./deploy.sh
```

### Backend (Raspberry Pi)
```bash
git clone https://github.com/michoest/notes-0.git
cd notes-0/api
npm install
npm start
```
```

---

**Final structure:**
```
notes/notes-0/
├── app/
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── generate-icons.js
├── api/
│   ├── data/           # gitignored
│   ├── server.js
│   └── package.json
├── dist/               # built frontend
├── deploy.sh
├── .gitignore
└── README.md