#!/bin/sh
set -e

git="git -C ./docs/";

if [ ! -d "./docs" ]; then
  echo "./docs directory not found"
  exit 1
fi

if [[ $($git status --short) == '' ]]; then
  echo "./docs tree is not dirty"
  exit 1
fi

echo "deploying the docs"
$git add '.'
$git commit -m "v$npm_package_version"
$git push origin
