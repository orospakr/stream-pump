#!/bin/bash

# Script to help migrate remaining JavaScript files to TypeScript

# Create necessary directories
mkdir -p src/lib

# Copy remaining JavaScript files to TypeScript files
for file in lib/*.js; do
  base=$(basename "$file" .js)
  if [ ! -f "src/lib/${base}.ts" ]; then
    echo "Migrating $file to src/lib/${base}.ts"
    cp "$file" "src/lib/${base}.ts"
    
    # Add TypeScript imports and replace var with const/let
    sed -i '' 's/var /const /g' "src/lib/${base}.ts"
    
    # Add basic TypeScript header with imports
    sed -i '' '1s/^/\/\/ TypeScript migration of '"${base}"'.js\n/' "src/lib/${base}.ts"
    
    # Replace require with import
    sed -i '' 's/var \(.*\) = require(\(.*\));/import * as \1 from \2;/g' "src/lib/${base}.ts"
    
    echo "Basic migration of $file completed. Manual review needed."
  fi
done

echo "Migration script completed. Please review the TypeScript files and add proper type annotations." 