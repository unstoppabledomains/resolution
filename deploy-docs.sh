#!/bin/sh
git="git -C ./docs/";
echo "deploying the docs"
if [ -z "./docs" ]; then
  echo "docs were not found"
  mkdir -p dist
  git clone https://github.com/unstoppabledomains/namicorn.git docs
  $git checkout gh-pages
fi
$git add '.'
$git commit -m "$1"
$git push origin 
