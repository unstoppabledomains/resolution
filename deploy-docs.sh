#!/bin/sh
if [ -z "$1" ]
then
  echo "Which folder do you want to deploy to GitHub Pages?"
  exit 1
fi
BRANCHNAME="$(git rev-parse --abbrev-ref HEAD)"
git add './dist'
git commit -m "$2"
git push origin `git subtree split --prefix dist ${BRANCHNAME}`:gh-pages --force
