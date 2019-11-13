#!/bin/sh
DOCS_FOLDER=./docs
CURRENT_VERSION=$1
OLD_VERSIONS="$(find ./docs -maxdepth 1 -type d -not -path '*/\.*' | basename ./docs/v* | sort -r)"
FILE_DESTINATION="$DOCS_FOLDER/README.md"
BASE_URL="https://unstoppabledomains.github.io/namicorn"
echo "[Current Version]($BASE_URL/$CURRENT_VERSION/)\n" > $FILE_DESTINATION
echo "## Old Versions\n" >> $FILE_DESTINATION
for dir in $OLD_VERSIONS; do
  echo "[$dir]($BASE_URL/$dir/)\n" >> $FILE_DESTINATION
done