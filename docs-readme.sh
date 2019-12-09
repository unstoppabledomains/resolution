#!/bin/sh
set -e

DOCS_FOLDER=./docs
FILE_DESTINATION="$DOCS_FOLDER/README.md"
VERSIONS="$(find $DOCS_FOLDER -maxdepth 1 -type d -not -path '*/\.*' | basename $DOCS_FOLDER/v* | sort -r)"
BASE_URL="https://unstoppabledomains.github.io/resolution/"
CURRENT_VERSION="v$npm_package_version"

echo "# @unstoppabledomains/resolution Documentation\n"
echo "[Current Version ${CURRENT_VERSION}]($BASE_URL/$CURRENT_VERSION/)\n" > $FILE_DESTINATION
echo "## Older Versions\n" >> $FILE_DESTINATION
for dir in $VERSIONS; do
  if [ "$dir" != "$CURRENT_VERSION" ]; then
    echo "* [$dir]($BASE_URL/$dir/)" >> $FILE_DESTINATION
  fi
done
