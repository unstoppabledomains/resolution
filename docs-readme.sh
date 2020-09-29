#!/bin/sh
set -e

DOCS_FOLDER=./docs
FILE_DESTINATION="$DOCS_FOLDER/README.md"
VERSIONS="$(find $DOCS_FOLDER -maxdepth 1 -type d -not -path '*/\.*' | basename $DOCS_FOLDER/v* | sort -t. -k 1.2,1nr -k 2,2nr -k 3,3nr -k 4,4nr)"
BASE_URL="https://unstoppabledomains.github.io/resolution"
CURRENT_VERSION="v$npm_package_version"

echo "# @unstoppabledomains/resolution Documentation\n"
echo "[Current Version ${CURRENT_VERSION}]($BASE_URL/$CURRENT_VERSION/globals.html)\n" > $FILE_DESTINATION
echo "## Older Versions\n" >> $FILE_DESTINATION
for dir in $VERSIONS; do
  if [ "$dir" != "$CURRENT_VERSION" ]; then
    echo "* [$dir]($BASE_URL/$dir/globals.html)" >> $FILE_DESTINATION
  fi
done
