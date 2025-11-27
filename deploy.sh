#!/bin/bash
cd app
npm run build
cd ../dist
git init
git add .
git commit -m "Deploy $(date)"
git branch -M gh-pages
git remote add origin https://github.com/michoest/notes-0.git 2>/dev/null
git push -f origin gh-pages
cd ..