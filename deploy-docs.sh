#!/bin/sh
# git="git --git-dir=./docs"
git="git";
cd ./docs
echo "deploying the docs"
if [ -z "./docs" ]; then
  echo "docs were not found"
  mkdir -p dist
  git clone https://github.com/unstoppabledomains/namicorn.git docs
  $git checkout gh-pages
fi
# BRANCHNAME="$(git rev-parse --abbrev-ref HEAD)"
$git add '.'
$git commit -m "$1"
$git push origin 
